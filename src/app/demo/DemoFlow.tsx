"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CloudSun,
  Database,
  KeyRound,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Server,
  Sparkles,
  TerminalSquare,
  Wrench,
  X,
} from "lucide-react";
import { ChatCompanion } from "@/components/characters/ChatCompanion";
import { getCharacter } from "@/lib/characters";
import { getPersona } from "@/lib/personas";
import { SWITCH_CONFIDENCE_THRESHOLD } from "@/lib/personaSwitch";

type DemoStep =
  | "byok"
  | "user-one"
  | "assistant-one"
  | "user-two"
  | "assistant-two"
  | "mcp-open"
  | "mcp-save"
  | "tool-user"
  | "tool-call"
  | "tool-result"
  | "tool-answer"
  | "switch-offer"
  | "switch-summary"
  | "final-answer";

const steps: DemoStep[] = [
  "byok",
  "user-one",
  "assistant-one",
  "user-two",
  "assistant-two",
  "mcp-open",
  "mcp-save",
  "tool-user",
  "tool-call",
  "tool-result",
  "tool-answer",
  "switch-offer",
  "switch-summary",
  "final-answer",
];

const userOne =
  "I am planning a small birthday hangout this weekend. Six friends, $60 total, and one friend is vegetarian.";
const assistantOne =
  "Got it. Keep the plan compact: one easy food setup, one shared activity, and a short prep list. With $60, a snack board or build-your-own sandwich table is safer than a cooked dinner.";
const userTwo =
  "Can you keep track of the constraints and help me choose something that will work even if the weather changes?";
const assistantTwo =
  "Yes. I will keep the guest count, budget, vegetarian option, and low-prep goal in context. If we add a weather MCP server, I can use it before recommending indoor or outdoor plans.";
const toolUser =
  "Use the weather tool for Saturday evening, then suggest a plan that still respects the budget.";
const toolAnswer =
  "The fake weather MCP says Saturday evening is likely rainy around 22 C. I would make this an indoor snack-table night: vegetarian hummus wraps, chips, fruit, and a quick drawing game. Keep a tiny backup playlist and avoid any outdoor setup.";
const finalAnswer =
  "Creative version: call it a Rainy Room Festival. Set up three stations: snack table, 30-second drawing challenge, and a tiny awards round. The facts stay the same: six people, $60, vegetarian-safe food, no big cooking, and indoor because the weather looks rainy.";
const neutralSummary =
  "Six friends for a birthday hangout this weekend. Budget is $60. One guest is vegetarian. User wants low prep, no big dinner, and a plan that survives rainy weather. Fake MCP weather result: Saturday evening is rainy and about 22 C.";

const demoMcpJson = `{
  "mcpServers": {
    "demo_weather": {
      "transport": "http",
      "url": "https://demo.local/mcp/weather",
      "headers": {
        "Authorization": "Bearer demo-token"
      }
    }
  }
}`;

function clampStep(value: number) {
  return Math.max(0, Math.min(steps.length - 1, value));
}

function useTypewriter(text: string, active: boolean, speed = 18) {
  const [count, setCount] = useState(active ? 0 : text.length);

  useEffect(() => {
    if (!active) {
      setCount(text.length);
      return;
    }

    setCount(0);
    const timer = window.setInterval(() => {
      setCount((value) => {
        if (value >= text.length) {
          window.clearInterval(timer);
          return text.length;
        }
        return Math.min(text.length, value + 3);
      });
    }, speed);

    return () => window.clearInterval(timer);
  }, [active, speed, text]);

  return text.slice(0, count);
}

function UserBubble({ children }: { children: string }) {
  return (
    <p className="bg-primary text-primary-foreground ml-auto max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-6 shadow-sm">
      {children}
    </p>
  );
}

function AssistantBubble({
  personaId,
  text,
  streaming,
}: {
  personaId: string;
  text: string;
  streaming?: boolean;
}) {
  const character = getCharacter(personaId);
  const visible = useTypewriter(text, Boolean(streaming), 16);

  return (
    <div className="flex items-start gap-3">
      <img
        src={"/characters/" + character.id + ".webp"}
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 object-contain"
      />
      <div className="min-w-0">
        <p className="text-xs font-medium">
          {character.name} <span className="text-muted-foreground ml-1">{character.role}</span>
        </p>
        <p className="mt-1 rounded-2xl bg-gray-200/40 px-4 py-2 text-sm leading-6 text-gray-800 dark:bg-white/[0.08] dark:text-gray-100">
          {visible}
          {streaming && visible.length < text.length && (
            <span className="ml-0.5 inline-block h-4 w-1 translate-y-0.5 animate-pulse rounded bg-teal-500" />
          )}
        </p>
      </div>
    </div>
  );
}

function ToolCallCard({ approved }: { approved: boolean }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-50">
      <button className="flex w-full items-center gap-2 text-left text-sm font-medium">
        <ChevronRight size={16} />
        <Wrench size={16} />
        demo_weather.get_forecast
      </button>
      <pre className="mt-3 overflow-x-auto rounded bg-white/70 p-3 text-xs text-amber-950 dark:bg-black/20 dark:text-amber-50">
        {JSON.stringify({ city: "User's city", time: "Saturday evening", units: "metric" }, null, 2)}
      </pre>
      <div className="mt-3 flex justify-end gap-2">
        <button className="inline-flex items-center gap-1 rounded border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700">
          <X size={13} />
          Deny
        </button>
        <button className="inline-flex items-center gap-1 rounded border border-green-200 bg-white px-3 py-1.5 text-xs font-medium text-green-700">
          {approved ? <Check size={13} /> : <Loader2 size={13} className="animate-spin" />}
          {approved ? "Allowed" : "Allow"}
        </button>
      </div>
    </div>
  );
}

function ToolResultCard() {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          <CloudSun size={16} />
          demo_weather response
        </p>
        <span className="text-muted-foreground text-xs">Fake MCP output</span>
      </div>
      <pre className="mt-3 overflow-x-auto rounded bg-white p-3 text-xs dark:bg-black/30">
        {JSON.stringify(
          {
            forecast: "rain",
            temperatureC: 22,
            confidence: 0.91,
            recommendation: "keep the party indoors",
          },
          null,
          2,
        )}
      </pre>
    </div>
  );
}

export function DemoFlow() {
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const step = steps[stepIndex];
  const switched = stepIndex >= steps.indexOf("switch-summary");
  const personaId = switched ? "creative" : "calm";
  const character = getCharacter(personaId);
  const progress = ((stepIndex + 1) / steps.length) * 100;
  const thinking = ["assistant-one", "assistant-two", "tool-answer", "final-answer"].includes(step);

  useEffect(() => {
    if (!playing || step === "switch-offer" || stepIndex >= steps.length - 1) return;
    const timer = window.setTimeout(
      () => setStepIndex((value) => clampStep(value + 1)),
      ["assistant-one", "assistant-two", "tool-answer", "final-answer"].includes(step) ? 5200 : 2600,
    );
    return () => window.clearTimeout(timer);
  }, [playing, step, stepIndex]);

  useEffect(() => {
    const area = bottom.current?.parentElement;
    if (area) area.scrollTop = area.scrollHeight;
  }, [stepIndex]);

  const notes = useMemo(() => {
    if (step === "byok") {
      return {
        title: "Start at the bottom-left setup area",
        body: "The real app exposes BYOK and MCP from the bottom-left sidebar: Key Management for provider keys and Configure MCP Servers for tools. This scripted demo shows both locations first, then continues into chat.",
      };
    }
    if (step === "mcp-open" || step === "mcp-save") {
      return {
        title: "Add MCP from the left panel",
        body: "The left panel highlights Configure MCP Servers, then the demo pastes a weather MCP JSON block and saves it. The server is fake, but the shape matches the app's real MCP configuration flow.",
      };
    }
    if (step === "tool-call" || step === "tool-result") {
      return {
        title: "Tool approval stays visible",
        body: "The assistant requests a fake MCP tool call first. The demo shows the approval step and then a tool result payload before the answer uses it.",
      };
    }
    if (step === "switch-offer" || step === "switch-summary" || step === "final-answer") {
      return {
        title: "Switch avatar, keep context",
        body:
          "JEV recommends a creative companion with " +
          Math.round(SWITCH_CONFIDENCE_THRESHOLD * 100) +
          "%+ confidence. The right panel keeps the neutral memory visible while the avatar changes.",
      };
    }
    return {
      title: "Streaming chat",
      body: "The first messages type in gradually to show token streaming. The right panel tracks the facts that will be carried into the later MCP call and persona switch.",
    };
  }, [step]);

  const showUserOne = stepIndex >= steps.indexOf("user-one");
  const showAssistantOne = stepIndex >= steps.indexOf("assistant-one");
  const showUserTwo = stepIndex >= steps.indexOf("user-two");
  const showAssistantTwo = stepIndex >= steps.indexOf("assistant-two");
  const showToolUser = stepIndex >= steps.indexOf("tool-user");
  const showToolCall = stepIndex >= steps.indexOf("tool-call");
  const showToolResult = stepIndex >= steps.indexOf("tool-result");
  const showToolAnswer = stepIndex >= steps.indexOf("tool-answer");
  const showSwitchOffer = stepIndex >= steps.indexOf("switch-offer");
  const showSummary = stepIndex >= steps.indexOf("switch-summary");
  const showFinal = stepIndex >= steps.indexOf("final-answer");

  return (
    <main className="bg-background text-foreground flex min-h-dvh flex-col">
      <header className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft size={16} />
          Back to chat
        </Link>
        <span className="text-muted-foreground text-xs">Scripted demo - fake MCP, no API calls</span>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[236px_minmax(0,1fr)_340px]">
        <aside className="border-border hidden border-r bg-white/60 p-3 backdrop-blur-sm lg:flex lg:flex-col dark:bg-gray-900/60">
          <div className="mb-3 px-2 py-2">
            <p className="text-sm font-semibold">GPTone</p>
            <p className="text-muted-foreground text-xs">Demo controls</p>
          </div>
          <div className="text-muted-foreground flex-1 px-2 pt-2 text-xs leading-5">
            The walkthrough starts by showing the same setup area users use before chatting.
          </div>
          <div className="border-border space-y-2 border-t pt-3">
            <p className="text-muted-foreground px-3 text-[11px] font-medium uppercase">
              Bottom-left setup
            </p>
            <button
              className={
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium " +
                (step === "byok" ? "bg-teal-500 text-white" : "hover:bg-muted")
              }
            >
              <KeyRound size={16} />
              Key Management
            </button>
            <button
              className={
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium " +
                (step === "byok" || step === "mcp-open" || step === "mcp-save"
                  ? "bg-teal-500 text-white"
                  : "hover:bg-muted")
              }
            >
              <Server size={16} />
              Configure MCP Servers
            </button>
          </div>
        </aside>

        <section aria-label="Demo conversation" className="flex min-w-0 flex-col px-4 py-6 sm:px-8">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Full product walkthrough</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                BYOK, streaming, MCP tool use, and companion switching.
              </p>
            </div>
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {stepIndex + 1} / {steps.length}
            </span>
          </div>

          <div className="bg-muted h-1 overflow-hidden rounded">
            <div className="h-full bg-teal-500 transition-[width]" style={{ width: progress + "%" }} />
          </div>

          <div className="mt-4 h-[min(52dvh,560px)] min-h-80 space-y-5 overflow-y-auto pr-2">
            {step === "byok" && (
              <div className="mx-auto max-w-lg rounded-xl border border-teal-300 bg-teal-50 p-5 text-teal-950 shadow-sm dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-50">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles size={18} />
                  Bottom-left setup controls
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-teal-200 bg-white p-3 dark:border-teal-500/30 dark:bg-black/20">
                    <p className="flex items-center gap-2 text-xs font-semibold">
                      <KeyRound size={15} />
                      Key Management
                    </p>
                    <p className="text-muted-foreground mt-2 text-xs leading-5">
                      Add OpenAI, Gemini, and JEV/Codiv keys before chatting.
                    </p>
                  </div>
                  <div className="rounded-lg border border-teal-200 bg-white p-3 dark:border-teal-500/30 dark:bg-black/20">
                    <p className="flex items-center gap-2 text-xs font-semibold">
                      <Server size={15} />
                      Configure MCP Servers
                    </p>
                    <p className="text-muted-foreground mt-2 text-xs leading-5">
                      Paste MCP JSON so tools can appear in the assistant flow.
                    </p>
                  </div>
                </div>
                <p className="mt-5 flex items-center gap-2 text-xs font-semibold">
                  <KeyRound size={15} />
                  Key Management preview
                </p>
                <div className="mt-4 space-y-3">
                  {["OpenAI", "Gemini", "JEV / Codiv"].map((label) => (
                    <div key={label}>
                      <p className="mb-1 text-xs font-medium">{label}</p>
                      <div className="rounded-md border border-teal-200 bg-white px-3 py-2 font-mono text-xs text-teal-900 dark:border-teal-500/30 dark:bg-black/20 dark:text-teal-50">
                        sk-demo-key-hidden
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showUserOne && <UserBubble>{userOne}</UserBubble>}
            {showAssistantOne && (
              <AssistantBubble personaId="calm" text={assistantOne} streaming={step === "assistant-one"} />
            )}
            {showUserTwo && <UserBubble>{userTwo}</UserBubble>}
            {showAssistantTwo && (
              <AssistantBubble personaId="calm" text={assistantTwo} streaming={step === "assistant-two"} />
            )}

            {(step === "mcp-open" || step === "mcp-save") && (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <TerminalSquare size={16} />
                    Configure MCP Servers
                  </p>
                  {step === "mcp-save" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                      <Check size={12} />
                      Saved
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <pre className="max-h-56 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-3 text-xs dark:border-gray-700 dark:bg-black/30">
                    {demoMcpJson}
                  </pre>
                </div>
              </div>
            )}

            {showToolUser && <UserBubble>{toolUser}</UserBubble>}
            {showToolCall && <ToolCallCard approved={stepIndex >= steps.indexOf("tool-result")} />}
            {showToolResult && <ToolResultCard />}
            {showToolAnswer && (
              <AssistantBubble personaId="calm" text={toolAnswer} streaming={step === "tool-answer"} />
            )}

            {showSwitchOffer && (
              <div className="rounded-xl border border-violet-300 bg-violet-50 p-4 text-violet-950 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-50">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles size={16} />
                  Try Potion Familiar?
                </p>
                <p className="text-muted-foreground mt-2 text-sm">
                  JEV recommends Creative Partner for theme ideas and games while keeping the
                  weather, budget, and food constraints.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-white px-3 py-2 text-xs text-violet-900">
                    <X size={14} />
                    No, stay
                  </button>
                  <button
                    onClick={() => {
                      setStepIndex(steps.indexOf("switch-summary"));
                      setPlaying(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-3 py-2 text-xs text-white"
                  >
                    <Check size={14} />
                    Yes, switch
                  </button>
                </div>
              </div>
            )}

            {showSummary && (
              <div className="border-l-2 border-violet-500 pl-3">
                <p className="text-xs font-semibold">Neutral summary carried forward</p>
                <p className="text-muted-foreground mt-2 text-sm leading-6">{neutralSummary}</p>
              </div>
            )}
            {showFinal && (
              <AssistantBubble personaId="creative" text={finalAnswer} streaming={step === "final-answer"} />
            )}
            <div ref={bottom} />
          </div>

          <div className="mt-4 flex items-end gap-3">
            <div className="h-28 w-28 shrink-0 sm:h-36 sm:w-36">
              <ChatCompanion personaId={personaId} thinking={thinking} />
            </div>
            <div className="border-border text-muted-foreground mb-3 min-w-0 flex-1 border-b pb-3 text-sm">
              {thinking
                ? "Streaming with " + character.name
                : step === "tool-call"
                  ? "Waiting for tool approval"
                  : step === "tool-result"
                    ? "Reading fake MCP result"
                    : "Demo state: " + notes.title}
            </div>
          </div>

          <div className="border-border mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="flex gap-2">
              <button
                title="Restart demo"
                aria-label="Restart demo"
                onClick={() => {
                  setStepIndex(0);
                  setPlaying(false);
                }}
                className="border-border hover:bg-muted rounded-md border p-2"
              >
                <RotateCcw size={16} />
              </button>
              <button
                title={playing ? "Pause demo" : "Play demo"}
                aria-label={playing ? "Pause demo" : "Play demo"}
                disabled={step === "switch-offer" || stepIndex === steps.length - 1}
                onClick={() => setPlaying(!playing)}
                className="border-border hover:bg-muted rounded-md border p-2 disabled:opacity-40"
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                disabled={stepIndex === 0}
                onClick={() => {
                  setPlaying(false);
                  setStepIndex((value) => clampStep(value - 1));
                }}
                className="border-border inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs disabled:opacity-40"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <button
                disabled={stepIndex === steps.length - 1}
                onClick={() => {
                  setPlaying(false);
                  setStepIndex((value) => clampStep(value + 1));
                }}
                className="border-border inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs disabled:opacity-40"
              >
                Next
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </section>

        <aside
          className="border-border min-w-0 border-t px-5 py-6 lg:border-t-0 lg:border-l lg:px-6"
          aria-label="Demo state and memory"
        >
          <p className="mb-3 text-xs font-medium text-teal-600 uppercase dark:text-teal-400">
            Behind this step
          </p>
          <h2 className="text-lg font-semibold">{notes.title}</h2>
          <p className="text-muted-foreground mt-3 text-sm leading-6" aria-live="polite">
            {notes.body}
          </p>

          <div className="border-border mt-6 border-t pt-5">
            <h3 className="text-sm font-medium">Memory kept on the right</h3>
            <ul className="text-muted-foreground mt-3 space-y-2 text-xs leading-5">
              <li>Guests: six friends</li>
              <li>Budget: $60 total</li>
              <li>Food: vegetarian option required</li>
              <li>Prep: avoid a big cooked dinner</li>
              <li>
                Weather: {stepIndex >= steps.indexOf("tool-result") ? "rainy, 22 C" : "not checked yet"}
              </li>
            </ul>
          </div>

          <div className="border-border mt-6 border-t pt-5">
            <h3 className="text-sm font-medium">Active companion</h3>
            <div className="mt-3 flex items-center gap-3">
              <img
                src={"/characters/" + character.id + ".webp"}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />
              <div>
                <p className="text-sm font-medium">{character.name}</p>
                <p className="text-muted-foreground text-xs">{getPersona(personaId).name}</p>
              </div>
            </div>
          </div>

          <div className="border-border mt-6 border-t pt-5">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <Database size={15} />
              Demo data boundary
            </h3>
            <p className="text-muted-foreground mt-3 text-xs leading-5">
              This page is fully scripted. It shows the product flow without calling OpenAI,
              Gemini, JEV, or a real MCP server.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
