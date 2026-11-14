import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sizes = [390, 767, 768, 769, 959, 960, 961, 1200];

async function layout(root) {
  return root.evaluate(element => [...element.querySelectorAll("[data-kx-layout]")].map(node => {
    const { flexDirection, gridTemplateColumns, alignItems, padding, gap, width } = getComputedStyle(node);
    return { id: node.dataset.kxLayout, flexDirection, gridTemplateColumns, alignItems, padding, gap, width };
  }));
}

export async function verifyResponsiveBrowser({ browser, base, fixture, consumer, out, errors, a11y, pass }) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  try {
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    const api = base + "/api/create-studio";
    const post = data => context.request.post(api, { data, headers: { origin: base } });
    assert.equal((await post({ operation: "session" })).status(), 200);
    const created = await post({ operation: "create", name: "Responsive comparison", key: "responsive-fixture" });
    assert.equal(created.status(), 201);
    const product = await created.json();
    const document = JSON.parse(await readFile(resolve(fixture, "source-document.json"), "utf8"));
    const seeded = await post({ operation: "save", id: product.id, revision: product.revision, doc: { ...document, id: product.id } });
    assert.equal(seeded.status(), 200, await seeded.text());
    const studio = page.locator(".create-studio");
    const button = name => studio.getByRole("button", { name, exact: true });
    const inspector = studio.getByRole("complementary", { name: "Properties inspector" });
    const scope = inspector.getByLabel("Edit at breakpoint");
    const direction = inspector.getByLabel("Direction", { exact: true });
    const gap = inspector.getByLabel("Gap", { exact: true });
    const open = async () => {
      await page.goto(base + "/create/studio");
      await button("Start local workspace").click();
      await studio.getByLabel("Open product").selectOption(product.id);
      await button("Layers").click();
      await studio.getByRole("treeitem", { name: "Stack", exact: true }).click();
    };
    const save = async () => {
      await button("Save").click();
      await page.waitForFunction(() => document.querySelector(".studio-save-state")?.textContent === "Saved locally");
    };
    await open();
    await scope.selectOption("tablet");
    assert.equal(await direction.inputValue(), "row");
    await inspector.getByRole("button", { name: "Reset Direction" }).click();
    assert.equal(await direction.inputValue(), "column");
    assert.match(await inspector.innerText(), /Inherited from Base/);
    await button("Undo").click();
    assert.equal(await direction.inputValue(), "row");
    await button("Redo").click();
    assert.equal(await direction.inputValue(), "column");
    await button("Undo").click();
    await scope.selectOption("desktop");
    assert.equal(await direction.inputValue(), "row");
    assert.equal(await direction.getAttribute("aria-describedby"), "studio-source-axis");
    assert.equal(await inspector.locator("#studio-source-axis").innerText(), "Inherited from Tablet");
    await gap.selectOption("spacing.12");
    await save();
    await open();
    await scope.selectOption("desktop");
    assert.equal(await gap.inputValue(), "spacing.12");
    await gap.selectOption("spacing.8");
    await save();
    const saved = await (await context.request.get(api + "?id=" + product.id)).json();
    assert.deepEqual(saved.doc, { ...document, id: product.id }, "Preview and consumer must use the same saved tree");
    await page.screenshot({ path: resolve(out, "responsive-inspector.png"), fullPage: true });
    const reset = inspector.getByRole("button", { name: "Reset Gap" });
    const target = await reset.boundingBox();
    assert.ok(target.width >= 24 && target.height >= 24, "Breakpoint reset meets the 24 CSS px minimum");
    await page.setViewportSize({ width: 320, height: 900 });
    const cdp = await context.newCDPSession(page);
    await cdp.send("Page.setFontSizes", { fontSizes: { standard: 32, fixed: 26 } });
    assert.ok(await inspector.evaluate(el => el.scrollWidth <= el.clientWidth + 1), "Breakpoint inspector fits at 320px and 200% text");
    await cdp.send("Page.setFontSizes", { fontSizes: { standard: 16, fixed: 13 } });
    await page.setViewportSize({ width: 1440, height: 1600 });
    pass("breakpoint inspector inherits, overrides, resets, undoes, redoes and reopens");

    await studio.getByLabel("Viewport width").selectOption("390");
    assert.equal(await studio.locator(".studio-world").evaluate(el => el.getBoundingClientRect().width), 390);
    assert.equal(await page.evaluate(() => matchMedia("(min-width: 768px)").matches), true);
    await button("Preview").click();
    const iframe = studio.locator('iframe[title="Screen preview"]');
    const frame = page.frameLocator('iframe[title="Screen preview"]');
    const preview = frame.getByRole("main");
    await preview.waitFor();
    assert.deepEqual(await preview.evaluate(() => [innerWidth, innerHeight, matchMedia("(min-width: 768px)").matches]), [390, 844, false]);
    await studio.getByLabel("Height", { exact: true }).selectOption("600");
    assert.equal(await preview.evaluate(() => innerHeight), 600);
    const parity = [];
    for (const width of sizes) {
      await iframe.evaluate((element, value) => { element.style.width = value + "px"; }, width);
      await consumer.setViewportSize({ width, height: 600 });
      const previewWidth = await preview.evaluate(() => innerWidth);
      assert.equal(previewWidth, width);
      assert.equal(await consumer.evaluate(() => innerWidth), width);
      const expected = await layout(consumer.locator(".kinetix-product").first());
      const actual = await layout(preview);
      assert.deepEqual(actual, expected, "Computed layout differs at " + width + "px");
      assert.equal(actual.length, 3);
      assert.equal(actual[1].flexDirection, width >= 768 ? "row" : "column");
      assert.equal(actual[1].gap, width >= 960 ? "32px" : "16px");
      assert.equal(actual[2].gridTemplateColumns.split(" ").length, width >= 960 ? 4 : width >= 768 ? 3 : 2);
      parity.push({ width, height: 600, styles: actual });
      if ([390, 768, 960].includes(width)) {
        await iframe.screenshot({ path: resolve(out, "preview-" + width + ".png") });
      }
    }
    await writeFile(resolve(out, "breakpoint-parity.json"), JSON.stringify({ parentMatchesTabletAt390: true, previewMatchesTabletAt390: false, parity }, null, 2));
    pass("independent viewport and clean React consumer agree at both breakpoint boundaries");

    const light = await preview.evaluate(el => getComputedStyle(el).backgroundColor);
    await button("Dark canvas").click();
    await button("RTL").click();
    await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
    assert.deepEqual(await preview.evaluate(el => [
      getComputedStyle(el).direction,
      matchMedia("(prefers-reduced-motion: reduce)").matches,
      matchMedia("(forced-colors: active)").matches,
      document.documentElement.classList.contains("dark"),
    ]), ["rtl", true, true, true]);
    await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "none" });
    assert.notEqual(await preview.evaluate(el => getComputedStyle(el).backgroundColor), light);
    assert.equal(await preview.evaluate(el => getComputedStyle(el).fontFamily), await page.evaluate(() => getComputedStyle(document.body).fontFamily));
    assert.equal(await frame.getByRole("tablist").evaluate(el => getComputedStyle(el).direction), "rtl");
    const rtlConsumer = new URL(consumer.url());
    rtlConsumer.searchParams.set("dir", "rtl");
    await consumer.goto(rtlConsumer.href);
    assert.equal(await consumer.getByRole("tablist").evaluate(el => getComputedStyle(el).direction), "rtl");
    // The script-free sandbox blocks axe's own timer callbacks. Scan the rendered
    // DOM and styles in a separate tab at the same dimensions and media settings.
    const markup = await iframe.evaluate(element => element.contentDocument.documentElement.outerHTML);
    const scanPage = await context.newPage();
    await scanPage.setViewportSize({ width: 1200, height: 600 });
    await scanPage.emulateMedia({ reducedMotion: "reduce" });
    await scanPage.goto(base + "/create/studio");
    await scanPage.setContent("<!doctype html>" + markup);
    await scanPage.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const scanPreview = () => scanPage.evaluate(async () => {
      const result = await window.axe.run(document.querySelector("main"), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
      return result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
    });
    const violations = await scanPreview();
    await scanPage.locator("main").evaluate(root => {
      const image = document.createElement("div");
      image.setAttribute("role", "img");
      image.textContent = "Unlabelled test image";
      root.prepend(image);
    });
    assert.ok((await scanPreview()).some(result => result.id === "role-img-alt"), "Axe detects an unlabelled image in the rendered preview");
    await scanPage.close();
    a11y.push({ label: "rendered-preview-dom-rtl-dark-reduced-motion", violations });
    // Both panels stay mounted: the inactive one keeps `hidden` and renders no children, so a bare
    // `[role="tabpanel"]` can resolve to either of them while a selection commits. Read the panel
    // that is visible AND rendered.
    const shown = frame.locator('[role="tabpanel"]:not([hidden])').filter({ hasText: /\S/ });
    // Put the tablist in a stated starting state. The gate used to begin its keyboard transition from
    // whichever tab happened to be chosen -- instrumenting this point in CI caught Details already
    // chosen -- and from there `ArrowRight, Enter` moves the selection *off* Details. A pointer click
    // sets the precondition; the keyboard is what the assertions below are about.
    await frame.getByRole("tab", { name: "Overview", exact: true }).click();
    await shown.waitFor();
    assert.match(await shown.innerText(), /big picture/, "precondition: Overview is the chosen tab");
    const email = frame.getByLabel("Email address");
    await email.focus();
    await page.keyboard.press("Tab");
    const continueButton = frame.getByRole("button", { name: "Continue", exact: true });
    assert.equal(await continueButton.evaluate(el => el === document.activeElement), true);
    await page.keyboard.press("Tab");
    // The tablist is a tab stop of its own: the roving-focus group puts `tabindex="0"` on the list,
    // and it does that only once its items have registered, so the number of Tab presses between the
    // form and a tab is not fixed. An arrow pressed while the list still holds focus does nothing at
    // all -- which is how `ArrowRight, Enter` left Overview chosen and this read came back
    // `Start with the big picture.` in CI. Tab until a tab actually holds focus, within a bounded
    // number of stops, rather than assuming which stop the second press landed on. `:focus` does not
    // match inside a frame whose document is not the active one, so focus is read directly.
    const focusedTab = () => frame.locator(":root").evaluate(() => {
      const active = document.activeElement;
      return active?.getAttribute("role") === "tab" ? (active.textContent || "").trim() : null;
    });
    let entered = await focusedTab();
    for (let stops = 0; !entered && stops < 2; stops++) {
      await page.keyboard.press("Tab");
      entered = await focusedTab();
    }
    assert.equal(entered, "Overview", "Tab reaches the chosen tab from the form");
    // Two tabs in a looping roving-focus group, so ArrowRight reaches Details whichever way the
    // document runs (measured in both LTR and RTL). Pressed on the tab itself, so the key cannot be
    // delivered to a preview iframe that has re-rendered out from under the parent's focus.
    await frame.getByRole("tab", { name: "Overview", exact: true }).press("ArrowRight");
    const details = frame.locator('[role="tab"][aria-selected="true"]').filter({ hasText: "Details" });
    await details.waitFor();
    // Enter is pressed on the tab it belongs to. In the preview the arrow key moves the selection
    // without carrying focus with it, so an Enter sent to the page landed on the tab that still held
    // focus -- Overview -- and re-chose it, putting `Start with the big picture.` back in the panel
    // after the arrow had already done the right thing. That undo is the defect behind this gate's
    // intermittent red, and it is a property of the sequence, not of the runner's speed.
    await details.press("Enter");
    await shown.waitFor();
    assert.match(await shown.innerText(), /Make room/);
    await email.focus();
    await email.press("h");
    await email.press("Control+z");
    assert.equal(await iframe.count(), 1);
    await email.press("Escape");
    assert.equal(await button("Preview").evaluate(el => el === document.activeElement), true);
    assert.equal(await gap.inputValue(), "spacing.8");
    await button("Preview").click();
    await frame.getByRole("main").waitFor();
    await iframe.click({ position: { x: 30, y: 570 } });
    assert.equal(await iframe.evaluate(element => element.contentDocument.activeElement === element.contentDocument.body), true);
    await page.keyboard.press("Escape");
    await iframe.waitFor({ state: "detached", timeout: 3000 });
    assert.equal(await button("Preview").evaluate(el => el === document.activeElement), true, "Escape exits when the iframe body has focus");
    pass("iframe keyboard controls, Escape focus return, RTL, theme and media preferences");
  } finally {
    await context.close();
  }
}
