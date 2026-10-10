const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return resolve.call(
    this,
    name.startsWith("@/") ? path.join(root, "src", name.slice(2)) : name,
    ...args,
  );
};
require.extensions[".ts"] = (module, filename) => {
  const source = require("node:fs").readFileSync(filename, "utf8");
  module._compile(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
};

async function main() {
  const { isCompanionCheckDue } = require("../src/lib/personaSwitch.ts");
  assert.equal(isCompanionCheckDue(3, { lastSuggestionAt: -999, lastDismissAt: -999 }), false);
  assert.equal(isCompanionCheckDue(4, { lastSuggestionAt: -999, lastDismissAt: -999 }), true);
  assert.equal(isCompanionCheckDue(8, { lastSuggestionAt: 5, lastDismissAt: -999 }), false);
  assert.equal(isCompanionCheckDue(9, { lastSuggestionAt: 5, lastDismissAt: -999 }), true);
  assert.equal(isCompanionCheckDue(12, { lastSuggestionAt: 5, lastDismissAt: 5 }), false);
  assert.equal(isCompanionCheckDue(13, { lastSuggestionAt: 5, lastDismissAt: 5 }), true);
  const { parseCompanionAnswer, classifyCompanion } = require("../src/lib/personaClassifier.ts");
  const answer = (choice, probability) => ({
    answers: {
      best_companion: { choice, probabilities: { [choice]: probability }, confidence: probability },
    },
  });
  assert.equal(
    parseCompanionAnswer(answer("creative", 0.92), "friendly").shouldSuggestSwitch,
    true,
  );
  assert.equal(
    parseCompanionAnswer(answer("creative", 0.74), "friendly").shouldSuggestSwitch,
    false,
  );
  assert.equal(
    parseCompanionAnswer(answer("creative", 0.75), "friendly").shouldSuggestSwitch,
    true,
  );
  assert.equal(
    parseCompanionAnswer(answer("friendly", 0.99), "friendly").shouldSuggestSwitch,
    false,
  );
  assert.throws(() => parseCompanionAnswer(answer("unknown", 0.99), "friendly"));
  assert.throws(() => parseCompanionAnswer({}, "friendly"));

  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, "Bearer browser-test-key");
    assert(!options.body.includes("browser-test-key"), "JEV key must not enter model state");
    return new Response(JSON.stringify(answer("creative", 0.95)), { status: 200 });
  };
  try {
    assert.equal(
      (
        await classifyCompanion(
          { currentPersonaId: "friendly", userMessage: "Ideas", messages: [] },
          undefined,
          "browser-test-key",
        )
      ).shouldSuggestSwitch,
      true,
    );
  } finally {
    global.fetch = originalFetch;
  }

  const { AgentBuilder } = require("../src/lib/agent/builder.ts");
  const { MemorySaver } = require("@langchain/langgraph");
  const { BaseChatModel } = require("@langchain/core/language_models/chat_models");
  const { HumanMessage, AIMessage } = require("@langchain/core/messages");
  const calls = [];
  class RecordingModel extends BaseChatModel {
    _llmType() {
      return "test";
    }
    bindTools() {
      return this;
    }
    async _generate(messages) {
      calls.push(messages);
      return { generations: [{ text: "Test reply", message: new AIMessage("Test reply") }] };
    }
  }
  const saver = new MemorySaver();
  const build = (prompt) =>
    new AgentBuilder({
      llm: new RecordingModel({}),
      tools: [],
      prompt,
      checkpointer: saver,
    }).build();
  const config = { configurable: { thread_id: "isolated-persona-test" } };
  await build("OLD PERSONALITY").invoke(
    { messages: [new HumanMessage({ id: "old", content: "OLD STYLE" })] },
    config,
  );
  await build("NEW PERSONALITY").invoke(
    {
      messages: [new HumanMessage({ id: "switch", content: "Brainstorm ideas" })],
      neutralContextSummary: "User wants a birthday party.",
      contextStartId: "switch",
    },
    config,
  );
  assert.equal(calls[1][0].content, "NEW PERSONALITY");
  assert(!calls[1].some((message) => message.content === "OLD STYLE"));
  const reloaded = build("NEW PERSONALITY");
  await reloaded.invoke({ messages: [new HumanMessage("More ideas")] }, config);
  assert(calls[2].some((message) => String(message.content).includes("birthday party")));
  assert(calls[2].some((message) => message.content === "Brainstorm ideas"));
  assert(!calls[2].some((message) => message.content === "OLD STYLE"));
  const state = await reloaded.getState(config);
  assert(state.values.messages.some((message) => message.content === "OLD STYLE"));
  console.log(
    "PASS: thresholds, unchanged persona, malformed answers, persistent summary, context boundary, visible history.",
  );

  if (process.argv.includes("--live") || process.argv.includes("--live-jev")) {
    require("dotenv").config({
      path: [path.join(root, ".env.local"), path.join(root, ".env")],
      quiet: true,
    });
    // Two synthetic classifier calls and one short LLM call; no real conversation data.
    for (const userMessage of [
      "Please brainstorm imaginative birthday party themes and creative names.",
      "Hi!",
    ]) {
      try {
        const result = await classifyCompanion({
          currentPersonaId: "friendly",
          userMessage,
          messages: [],
        });
        console.log("LIVE JEV:", JSON.stringify(result));
      } catch (error) {
        console.log("LIVE JEV:", error.message);
      }
    }
    if (process.argv.includes("--live-jev")) return;
    const { createChatModel } = require("../src/lib/agent/util.ts");
    try {
      const model = createChatModel({
        provider: "openai",
        model: "gpt-6-luna",
        apiKey: process.env.OPENAI_API_KEY,
      });
      const response = await model.invoke("Reply with only OK.", {
        signal: AbortSignal.timeout(20000),
      });
      console.log("LIVE LUNA:", String(response.content).slice(0, 80));
    } catch (error) {
      console.log(
        "LIVE LUNA:",
        error.status || error.name,
        String(error.message)
          .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
          .slice(0, 200),
      );
    }
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
