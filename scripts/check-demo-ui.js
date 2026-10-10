// prettier-ignore
async (page) => {
  const assert = (value, message) => {
    if (!value) throw new Error(message);
  };
  let demoRequests = 0;
  const apiListener = (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) demoRequests++;
  };
  page.on("request", apiListener);
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto("http://localhost:3000/demo");
  await page.getByRole("button", { name: "Greet Cloud Sheep", exact: true }).waitFor();
  const pixelCount = async () =>
    page
      .locator("canvas")
      .first()
      .evaluate(
        (canvas) =>
          new Promise((resolve) => {
            requestAnimationFrame(() => {
              const gl = canvas.getContext("webgl2");
              const pixels = new Uint8Array(canvas.width * canvas.height * 4);
              gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
              let count = 0;
              for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 30) count++;
              resolve(count);
            });
          }),
      );
  assert((await pixelCount()) > 100, "3D preview is blank");
  await page.screenshot({ path: "output/playwright/demo-desktop-start.png", fullPage: true });
  await page.getByRole("button", { name: "Start walkthrough", exact: true }).click();
  await page.getByRole("button", { name: "Pause demo", exact: true }).click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next", exact: true }).click();
  assert(
    (await page.getByRole("region", { name: "Demo companion recommendation" }).count()) === 0,
    "Suggested before four completed messages",
  );
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByText("Checking companion...", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("region", { name: "Demo companion recommendation" }).waitFor();
  await page.screenshot({ path: "output/playwright/demo-desktop-suggestion.png", fullPage: true });
  await page.getByRole("button", { name: "Yes, switch", exact: true }).click();
  await page.getByText("Neutral summary", { exact: true }).waitFor();
  await page.evaluate(() => {
    window.__turns = [];
    window.__turnProbe = setInterval(() => {
      const canvas = document.querySelector("canvas");
      if (canvas)
        window.__turns.push({
          phase: canvas.dataset.transition,
          turn: Number(canvas.dataset.turn),
        });
    }, 25);
  });
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.locator('[data-chat-companion="potion"][data-switch-phase="idle"]').waitFor();
  const turns = await page.evaluate(() => {
    clearInterval(window.__turnProbe);
    return window.__turns;
  });
  assert(
    turns.some((item) => item.phase === "exit" && item.turn > 30),
    "Old avatar did not rotate out",
  );
  assert(
    turns.some((item) => item.phase === "enter" && item.turn < -20),
    "New avatar did not rotate in",
  );
  assert((await pixelCount()) > 100, "New 3D avatar is blank");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("heading", { name: "Same plans, a different approach" }).waitFor();
  await page.screenshot({ path: "output/playwright/demo-desktop-finish.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "output/playwright/demo-mobile.png", fullPage: true });
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "Mobile overflow",
  );
  assert((await pixelCount()) > 100, "Mobile 3D preview is blank");
  // Back to the decision and verify the alternate branch.
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "No, stay", exact: true }).click();
  await page.getByRole("heading", { name: "Your original companion stays" }).waitFor();
  assert(demoRequests === 0, "Scripted demo made an API request");
  page.off("request", apiListener);
  console.log(
    "PASS: demo Yes/No, four-message warm-up, no API calls, desktop/mobile nonblank canvas, actual 3D exit/enter rotation.",
  );

  const id = "22222222-2222-4222-8222-222222222222";
  await page.route("**/api/agent/threads", (route) =>
    route.fulfill({
      json: [
        {
          id,
          title: "Key management check",
          personaId: "friendly",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    }),
  );
  await page.route("**/api/agent/history/**", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/mcp-tools", (route) =>
    route.fulfill({ json: { totalCount: 0, servers: [] } }),
  );
  try {
    await page.setViewportSize({ width: 1365, height: 900 });
    await page.goto("http://localhost:3000/thread/" + id);
    await page.getByRole("banner").getByRole("button", { name: "Toggle navigation" }).click();
    await page.getByRole("button", { name: "Key Management", exact: true }).click();
    await page.getByLabel("OpenAI", { exact: true }).fill("demo-openai-value");
    await page.getByLabel("Gemini", { exact: true }).fill("demo-gemini-value");
    await page.getByLabel("JEV / Codiv", { exact: true }).fill("demo-codiv-value");
    await page.getByRole("button", { name: "Save keys", exact: true }).click();
    assert(
      await page.evaluate(() => {
        const keys = JSON.parse(localStorage.getItem("agent_model_settings")).apiKeys;
        return (
          keys.openai === "demo-openai-value" &&
          keys.google === "demo-gemini-value" &&
          keys.codiv === "demo-codiv-value"
        );
      }),
      "Saving three keys lost a provider",
    );
    await page.reload();
    await page.getByRole("banner").getByRole("button", { name: "Toggle navigation" }).click();
    await page.getByRole("button", { name: "Key Management", exact: true }).click();
    assert(
      (await page.getByLabel("JEV / Codiv", { exact: true }).inputValue()) === "demo-codiv-value",
      "JEV key did not persist",
    );
    assert(
      (await page.getByLabel("JEV / Codiv", { exact: true }).getAttribute("type")) === "password",
      "Key must start masked",
    );
    await page.getByRole("button", { name: "Show JEV / Codiv key", exact: true }).click();
    assert(
      (await page.getByLabel("JEV / Codiv", { exact: true }).getAttribute("type")) === "text",
      "Reveal control failed",
    );
    await page.getByRole("button", { name: "Hide JEV / Codiv key", exact: true }).click();
    await page.screenshot({ path: "output/playwright/keys-desktop.png" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "output/playwright/keys-mobile.png" });
    await page.getByRole("button", { name: "Clear saved keys", exact: true }).click();
    assert(
      await page.evaluate(
        () =>
          Object.keys(JSON.parse(localStorage.getItem("agent_model_settings")).apiKeys).length ===
          0,
      ),
      "Clear keys failed",
    );
    await page.getByRole("button", { name: "Close key management", exact: true }).click();
    console.log(
      "PASS: key manager saves all providers, persists, masks/reveals, clears keys, desktop/mobile.",
    );
  } finally {
    await page.unrouteAll({ behavior: "wait" });
  }
}
