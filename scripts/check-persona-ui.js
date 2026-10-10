// prettier-ignore
async (page) => {
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const id = "11111111-1111-4111-8111-111111111111";
  let persona = "friendly";
  let failCheck = false;
  let failSummary = false;
  let checks = 0;
  let summaries = 0;
  const sent = [];
  const patches = [];
  const history = [
    { type: "human", data: { id: "old-1", content: "Hi there." } },
    { type: "human", data: { id: "old-2", content: "Can you help me plan?" } },
    { type: "human", data: { id: "old-3", content: "I have six guests." } },
    { type: "human", data: { id: "old-user", content: "I am planning a birthday party." } },
    { type: "ai", data: { id: "old-ai", content: "What would you like to plan?" } },
  ];
  await page.route("**/api/agent/threads", async (route) => {
    const request = route.request();
    if (request.method() === "PATCH") {
      persona = request.postDataJSON().personaId;
      patches.push(persona);
    }
    const thread = {
      id,
      title: "Companion switch check",
      personaId: persona,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await route.fulfill({ json: request.method() === "GET" ? [thread] : thread });
  });
  await page.route("**/api/agent/history/**", (route) => route.fulfill({ json: history }));
  await page.route("**/api/mcp-tools", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/persona/suggest-switch", async (route) => {
    checks++;
    assert(
      route.request().postDataJSON().messages.length <= 2,
      "Too many messages sent to classifier",
    );
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fulfill(
      failCheck
        ? { status: 503, json: { error: "JEV test timeout" } }
        : {
            json: {
              shouldSuggestSwitch: true,
              suggestedPersonaId: "creative",
              confidence: 0.96,
              reason: "Potion Familiar can help brainstorm imaginative party themes.",
              source: "codiv",
            },
          },
    );
  });
  await page.route("**/api/persona/summarize-switch", async (route) => {
    summaries++;
    await route.fulfill(
      failSummary
        ? { status: 502, json: { error: "Summary test failure" } }
        : { json: { neutralSummary: "User is planning a birthday party." } },
    );
  });
  await page.route("**/api/agent/stream", async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: "text/event-stream",
      body:
        "data: " +
        JSON.stringify({
          type: "ai",
          data: { id: "reply-" + sent.length, content: "Here are some party ideas." },
        }) +
        "\n\nevent: done\ndata: {}\n\n",
    });
  });
  const reset = async () => {
    persona = "friendly";
    await page.evaluate(() => localStorage.clear());
    await page.goto("http://localhost:3000/thread/" + id);
    await page.getByPlaceholder("Type your message...").waitFor();
  };
  const submit = async () => {
    await page
      .getByPlaceholder("Type your message...")
      .fill("Brainstorm creative birthday themes.");
    await page.getByPlaceholder("Type your message...").press("Enter");
  };
  try {
    await page.setViewportSize({ width: 1365, height: 900 });
    await reset();
    await submit();
    await page.getByText("Checking companion...", { exact: true }).waitFor();
    assert(
      await page.locator("textarea").isDisabled(),
      "Composer must be disabled during classification",
    );
    await page.getByRole("region", { name: "Companion suggestion" }).waitFor();
    assert(
      sent.length === 0 && patches.length === 0,
      "Suggestion must not send or switch before consent",
    );
    await page.screenshot({ path: "output/playwright/persona-suggestion-desktop.png" });
    await page.getByRole("button", { name: "Yes, use Potion Familiar", exact: true }).click();
    await page.locator('[data-chat-companion="potion"]').waitFor();
    await page.getByText("Here are some party ideas.", { exact: true }).waitFor();
    assert(
      sent[0].personaId === "creative" && sent[0].neutralContextSummary.includes("birthday"),
      "Yes must send new persona and summary",
    );
    const oldChecks = checks;
    await submit();
    await page.waitForFunction(() => !document.querySelector("textarea").disabled);
    assert(checks === oldChecks, "Cooldown must suppress next suggestion");

    await reset();
    await submit();
    await page.getByRole("button", { name: "No, keep Mushroom Familiar", exact: true }).click();
    await page.getByText("Here are some party ideas.", { exact: true }).waitFor();
    assert(
      sent.at(-1).personaId === "friendly" && !sent.at(-1).neutralContextSummary,
      "No must retain persona",
    );
    assert(summaries === 1 && patches.length === 1, "No must not summarize or update persona");

    failCheck = true;
    await reset();
    await submit();
    await page.getByText("JEV test timeout", { exact: true }).waitFor();
    failCheck = false;
    await page.getByRole("button", { name: "Retry check", exact: true }).click();
    await page.getByRole("region", { name: "Companion suggestion" }).waitFor();
    failSummary = true;
    const beforeFailure = sent.length;
    await page.getByRole("button", { name: "Yes, use Potion Familiar", exact: true }).click();
    await page.getByText("Summary test failure", { exact: true }).waitFor();
    assert(
      sent.length === beforeFailure,
      "Summary failure must not silently send or lose the pending prompt",
    );
    await page.getByRole("button", { name: "No, keep Mushroom Familiar", exact: true }).click();
    await page.getByText("Here are some party ideas.", { exact: true }).waitFor();

    failSummary = false;
    await page.setViewportSize({ width: 390, height: 844 });
    await reset();
    await submit();
    await page.getByRole("region", { name: "Companion suggestion" }).waitFor();
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      "Mobile page overflows",
    );
    await page.screenshot({ path: "output/playwright/persona-suggestion-mobile.png" });
    console.log(
      "PASS: checking state, consent, Yes, No, cooldown, classifier retry, summary failure recovery, mobile layout.",
    );
  } finally {
    await page.unrouteAll({ behavior: "wait" });
  }
}
