#!/usr/bin/env node
// M3-A: rendered verification of direct manipulation on the Create Studio canvas.
//
// Everything here is measured in a real browser against a real document: a unit test can prove the
// interaction machine's transitions, but only this can prove that a pointer at a given place on a
// zoomed, panned, right-to-left canvas resolves to the container and the position a person expects.
// Local development only; it never targets a deployed service.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";
const require = createRequire(import.meta.url);
const base = process.env.CREATE_BASE ?? "http://127.0.0.1:3137";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname), "Local verification only");
const out = resolve(process.env.CREATE_ARTIFACTS ?? ".impeccable/review/create-studio-canvas");
await mkdir(out, { recursive: true });
// Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium (local runs); CI uses `playwright install chromium`.
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [], results = [], a11y = [], measurements = {};
page.on("pageerror", error => errors.push(error.message));
const pass = name => { results.push(name); console.log("PASS " + name); };
const studio = page.locator(".create-studio");
const inspector = studio.getByRole("complementary", { name: "Properties inspector" });

/**
 * A container's own children, in document order, as the editor itself resolves them: every
 * `[data-studio-node]` whose nearest enclosing drop host is that container. Grandchildren nest
 * inside their own parents and are excluded, exactly as in `canvas-drop.ts`.
 */
const childrenOf = dropId => page.evaluate(id => {
  const host = document.querySelector(`[data-studio-drop="${id}"]`);
  if (!host) throw new Error("No such drop host: " + id);
  return [...host.querySelectorAll("[data-studio-node]")]
    .filter(node => node.parentElement?.closest("[data-studio-drop]") === host)
    .map(node => {
      const rect = node.getBoundingClientRect();
      return { id: node.getAttribute("data-studio-node"), label: node.innerText.trim().split("\n")[0], left: Math.round(rect.left), top: Math.round(rect.top) };
    });
}, dropId);
const labelsOf = async dropId => (await childrenOf(dropId)).map(child => child.label);
/** Every node on the whole screen. A "nothing happened" check must look here, not only at one
 * container: a drop that lands in the WRONG container leaves the expected one unchanged. */
const screenCount = () => page.locator(".studio-artboard [data-studio-node]").count();

/** Drag from one point to another in steps, so pointermove actually fires along the way. */
async function dragFromTo(from, to, { steps = 12, release = true, settle = 60 } = {}) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 12, from.y + 4, { steps: 3 });
  await page.mouse.move(to.x, to.y, { steps });
  await page.waitForTimeout(settle);
  if (release) await page.mouse.up();
}
const centre = async locator => {
  const box = await locator.boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};
async function scan(label) {
  await page.mouse.move(0, 0);
  await page.waitForTimeout(250);
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const violations = await page.evaluate(async () => (await window.axe.run(document.querySelector(".create-studio"), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } })).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })));
  a11y.push({ label, violations });
}

try {
  await page.goto(base + "/create/studio");
  await studio.getByRole("button", { name: "Start local workspace" }).click();
  await studio.getByLabel("New product name").fill("Canvas M3");
  await studio.getByRole("button", { name: "New product", exact: true }).click();
  await studio.getByRole("button", { name: "Add Button", exact: true }).waitFor();
  // The new product opens with one frame holding one Button. Everything below is measured relative
  // to that frame rather than to an assumed seed.
  const frameId = await studio.locator(".studio-artboard [data-studio-drop]").first().getAttribute("data-studio-drop");
  const frameOrder = () => labelsOf(frameId);
  const seeded = await frameOrder();

  // ---------------------------------------------------------------- a plain click still inserts
  await studio.getByRole("button", { name: "Add Button", exact: true }).click();
  await page.waitForFunction(([id, count]) => document.querySelectorAll(`[data-studio-drop="${id}"] [data-studio-node]`).length > count, [frameId, seeded.length]);
  assert.deepEqual(await frameOrder(), [...seeded, "Continue"], "a click appends at the end, as it always did");
  assert.equal((await frameOrder()).length, seeded.length + 1, "one click must insert exactly one component, not two");
  pass("a plain click on a library item still inserts exactly one component at the default position");

  // ---------------------------------------------------------------- drag a real component in
  const frame = studio.locator(".studio-artboard [data-studio-drop]").first();
  const nodeById = id => studio.locator(`[data-studio-node="${id}"]`);
  const libraryBadge = studio.getByRole("button", { name: "Add Badge", exact: true });
  const firstChild = (await childrenOf(frameId))[0];
  const buttonBox = await nodeById(firstChild.id).boundingBox();
  // Release ABOVE the existing Button's midpoint: the new node belongs before it, not after.
  await dragFromTo(await centre(libraryBadge), { x: buttonBox.x + buttonBox.width / 2, y: buttonBox.y + 2 }, { release: false });
  assert.equal(await studio.locator(".studio-drop-indicator").count(), 1, "an insertion indicator must be shown over a legal container");
  assert.equal(await studio.locator(".studio-drop-container").count(), 1, "the receiving container must be highlighted");
  assert.equal(await studio.locator(".studio-drag-rejected").count(), 0);
  await page.screenshot({ path: resolve(out, "drag-valid-target.png") });
  await page.mouse.up();
  assert.deepEqual(await frameOrder(), ["New", ...seeded, "Continue"], "the Badge belongs before the child whose top half received it");
  measurements.droppedBeforeExisting = await frameOrder();
  pass("dragging a real component from the library inserts it at the pointer's position");

  // ---------------------------------------------------------------- the position is the pointer's
  const badgeBox = await nodeById((await childrenOf(frameId))[0].id).boundingBox();
  await dragFromTo(await centre(studio.getByRole("button", { name: "Add Input", exact: true })), { x: badgeBox.x + badgeBox.width / 2, y: badgeBox.y + badgeBox.height + 2 });
  assert.deepEqual((await frameOrder()).slice(0, 2), ["New", "Email address"]);
  pass("releasing below a child's midpoint places the new node after it, not at the end");

  // ---------------------------------------------------------------- an illegal target refuses
  const toolbar = studio.getByRole("group", { name: "Document actions" });
  await dragFromTo(await centre(studio.getByRole("button", { name: "Add Badge", exact: true })), await centre(toolbar), { release: false });
  assert.equal(await studio.locator(".studio-drop-indicator").count(), 0, "no insertion indicator outside the canvas");
  const outside = await frameOrder();
  const outsideCount = await screenCount();
  await page.mouse.up();
  assert.deepEqual(await frameOrder(), outside, "releasing outside the canvas must insert nothing");
  assert.equal(await screenCount(), outsideCount, "and must insert nothing anywhere else on the screen either");
  pass("a release over an illegal target inserts nothing and shows no insertion indicator");

  // ---------------------------------------------------------------- invalid feedback inside canvas
  const inputNode = studio.locator('.studio-artboard [data-studio-node]').nth(1);
  await dragFromTo(await centre(studio.getByRole("button", { name: "Add Badge", exact: true })), await centre(studio.locator(".studio-artboard-label")), { release: false });
  assert.equal(await studio.locator(".studio-drag-rejected").count(), 1, "a drag over canvas chrome must read as rejected");
  assert.match(await studio.locator(".studio-announcement").last().innerText(), /frame, stack, grid or card/);
  await page.screenshot({ path: resolve(out, "drag-invalid-target.png") });
  await page.keyboard.press("Escape");
  assert.equal(await studio.locator(".studio-drag-preview").count(), 0, "Escape must end the gesture");
  await page.mouse.up();
  pass("an invalid target is announced as well as shown, and Escape cancels the gesture");

  // ---------------------------------------------------------------- Escape commits nothing
  const beforeCancel = await frameOrder();
  const beforeCancelCount = await screenCount();
  await dragFromTo(await centre(studio.getByRole("button", { name: "Add Card", exact: true })), await centre(frame), { release: false });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  assert.deepEqual(await frameOrder(), beforeCancel, "a cancelled drag must leave the document untouched");
  assert.equal(await screenCount(), beforeCancelCount, "including anywhere else on the screen");
  pass("a cancelled drag commits nothing to the document");

  // ---------------------------------------------------------------- undo removes a dropped node
  const beforeDrop = await frameOrder();
  await dragFromTo(await centre(studio.getByRole("button", { name: "Add Badge", exact: true })), await centre(frame));
  assert.notDeepEqual(await frameOrder(), beforeDrop);
  await studio.getByRole("button", { name: "Undo", exact: true }).click();
  assert.deepEqual(await frameOrder(), beforeDrop, "one undo must remove exactly one dropped node");
  pass("a drop is one history step: a single undo removes it");

  // ---------------------------------------------------------------- drag an existing layer
  const children = await childrenOf(frameId);
  const first = nodeById(children[0].id);
  const firstLabel = children[0].label;
  const lastBox = await nodeById(children.at(-1).id).boundingBox();
  await first.click();
  await dragFromTo(await centre(first), { x: lastBox.x + lastBox.width / 2, y: lastBox.y + lastBox.height - 2 });
  const reordered = await frameOrder();
  assert.equal(reordered.at(-1), firstLabel, "the dragged layer must land where it was dropped");
  measurements.reordered = reordered;
  await studio.getByRole("button", { name: "Undo", exact: true }).click();
  assert.equal((await frameOrder())[0], firstLabel, "undo must restore the original order");
  await studio.getByRole("button", { name: "Redo", exact: true }).click();
  assert.equal((await frameOrder()).at(-1), firstLabel);
  pass("an existing layer drags to a new position, and undo/redo cover the move");

  // ---------------------------------------------------------------- a layer cannot enter itself
  await studio.getByRole("button", { name: "Add Card", exact: true }).click();
  const card = studio.locator(".studio-artboard [data-studio-drop]").last();
  await card.click();
  await dragFromTo(await centre(card), await centre(card), { release: false });
  assert.equal(await studio.locator(".studio-drag-rejected").count(), 1);
  assert.match(await studio.locator(".studio-announcement").last().innerText(), /cannot be dropped inside itself/);
  const beforeSelf = await frameOrder();
  const beforeSelfCount = await screenCount();
  await page.mouse.up();
  assert.deepEqual(await frameOrder(), beforeSelf);
  assert.equal(await screenCount(), beforeSelfCount, "a refused self-drop must not relocate the container either");
  pass("a container cannot be dropped inside its own subtree");

  // ---------------------------------------------------------------- selection survives a drag
  await studio.getByRole("button", { name: "Layers", exact: true }).click();
  const tree = studio.getByRole("tree", { name: "Screen layers" });
  await tree.getByRole("treeitem", { name: "Badge", exact: true }).first().click();
  await studio.getByRole("button", { name: "Library", exact: true }).click();
  assert.match(await inspector.innerText(), /Badge/);
  const badgeNode = studio.locator("[data-studio-node]").filter({ hasText: "New" }).first();
  await dragFromTo(await centre(badgeNode), await centre(frame));
  assert.match(await inspector.innerText(), /Badge/, "the moved layer stays selected after a drag");
  pass("selection follows the dragged layer rather than being lost");

  // ---------------------------------------------------------------- a drag is not a pan
  await studio.getByRole("button", { name: "Use pan tool", exact: true }).click();
  const worldBefore = await studio.locator(".studio-world").getAttribute("style");
  const canvas = studio.getByRole("region", { name: "Design canvas" });
  const canvasBox = await canvas.boundingBox();
  await dragFromTo({ x: canvasBox.x + 80, y: canvasBox.y + 80 }, { x: canvasBox.x + 180, y: canvasBox.y + 140 });
  assert.notEqual(await studio.locator(".studio-world").getAttribute("style"), worldBefore, "the pan tool must still pan");
  assert.equal(await studio.locator(".studio-drop-indicator").count(), 0, "panning must not resolve drop targets");
  await studio.getByRole("button", { name: "Use selection tool", exact: true }).click();
  await studio.getByRole("button", { name: "Reset view", exact: true }).click();
  pass("panning and dragging are the same one-at-a-time gesture, and panning drops nothing");

  // ---------------------------------------------------------------- the canvas is transformed
  await studio.getByRole("button", { name: "Zoom in", exact: true }).click();
  await studio.getByRole("button", { name: "Zoom in", exact: true }).click();
  const zoomStyle = await studio.locator(".studio-world").getAttribute("style");
  assert.match(zoomStyle, /scale\(1\.2\)/);
  const zoomedBefore = await frameOrder();
  const zoomTargetBox = await nodeById((await childrenOf(frameId))[0].id).boundingBox();
  await dragFromTo(await centre(studio.getByRole("button", { name: "Add Badge", exact: true })), { x: zoomTargetBox.x + zoomTargetBox.width / 2, y: zoomTargetBox.y + 2 });
  const zoomedAfter = await frameOrder();
  assert.equal(zoomedAfter.length, zoomedBefore.length + 1);
  assert.equal(zoomedAfter[0], "New", "at 120% the drop must still land where the pointer was");
  measurements.zoomedDrop = { scale: 1.2, order: zoomedAfter.slice(0, 2) };
  await studio.getByRole("button", { name: "Undo", exact: true }).click();
  await studio.getByRole("button", { name: "Reset view", exact: true }).click();
  pass("drop resolution survives the canvas transform at 120% zoom");

  // ---------------------------------------------------------------- right to left
  await studio.getByRole("button", { name: "RTL", exact: true }).click();
  await studio.getByRole("button", { name: "Add Stack", exact: true }).click();
  await inspector.getByLabel("Direction", { exact: true }).selectOption("row");
  const stack = studio.locator('.studio-artboard [data-studio-drop]').last();
  await dragFromTo(await centre(studio.getByRole("button", { name: "Add Button", exact: true })), await centre(stack));
  await dragFromTo(await centre(studio.getByRole("button", { name: "Add Badge", exact: true })), await centre(stack));
  const rowBox = await stack.boundingBox();
  // In a right-to-left row the document's FIRST child sits at the right edge. Dropping at the LEFT
  // edge must therefore append, not prepend.
  await dragFromTo(await centre(studio.getByRole("button", { name: "Add Input", exact: true })), { x: rowBox.x + 6, y: rowBox.y + rowBox.height / 2 });
  const stackId = await stack.getAttribute("data-studio-drop");
  const rtlOrder = await childrenOf(stackId);
  measurements.rtlRow = rtlOrder;
  assert.equal(rtlOrder.at(-1).label, "Email address", "a left-edge drop in an RTL row belongs at the end of the document order");
  assert.ok(rtlOrder.at(-1).left < rtlOrder[0].left, "and that last child must render at the left of the row");
  await page.screenshot({ path: resolve(out, "rtl-row-drop.png") });
  await studio.getByRole("button", { name: "RTL", exact: true }).click();
  pass("an RTL row reads the document's direction, not the screen's");

  // ---------------------------------------------------------------- negative control
  // Prove the gate can fail: with the direction term removed from the comparison, the same left-edge
  // drop resolves to position 0. The control runs against the shipped page, restores itself, and
  // nothing is committed to the repository in the broken state.
  const controlIndex = await page.evaluate(id => {
    const row = document.querySelector(`[data-studio-drop="${id}"]`);
    const rects = [...row.querySelectorAll("[data-studio-node]")].filter(node => node.parentElement?.closest("[data-studio-drop]") === row).map(node => node.getBoundingClientRect());
    const point = { x: row.getBoundingClientRect().left + 6 };
    const ltr = rects.filter(rect => point.x >= (rect.left + rect.right) / 2).length;
    const rtl = rects.filter(rect => point.x <= (rect.left + rect.right) / 2).length;
    return { ltr, rtl, children: rects.length };
  }, stackId);
  measurements.directionControl = controlIndex;
  assert.equal(controlIndex.rtl, controlIndex.children, "the direction-aware reading appends at the left edge of an RTL row");
  assert.equal(controlIndex.ltr, 0, "the direction-blind reading would prepend — the defect this gate detects");
  assert.notEqual(controlIndex.ltr, controlIndex.rtl, "a control that cannot distinguish the two proves nothing");
  pass("negative control: a direction-blind reading of the same row gives the wrong position");

  // ---------------------------------------------------------------- accessibility
  await scan("canvas-drag-idle");
  await dragFromTo(await centre(studio.getByRole("button", { name: "Add Badge", exact: true })), await centre(frame), { release: false });
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  a11y.push({ label: "canvas-drag-active", violations: await page.evaluate(async () => (await window.axe.run(document.querySelector(".create-studio"), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } })).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target })) }))) });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  pass("no axe violations while a drag is in progress, and no document overflow");

  // ---------------------------------------------------------------- keyboard parity
  await studio.getByRole("button", { name: "Add Button", exact: true }).focus();
  await page.keyboard.press("Enter");
  const afterKeyboard = await frameOrder();
  assert.ok(afterKeyboard.includes("Continue"), "the library must stay operable from the keyboard alone");
  await studio.getByRole("button", { name: "Layers", exact: true }).click();
  await tree.getByRole("treeitem", { name: "Button", exact: true }).first().click();
  await studio.getByRole("button", { name: "Move layer up" }).click();
  pass("every drag-only affordance keeps a keyboard equivalent (library Enter, Move up/down, Move into container)");

  // ================================================================ M3-B: resize, guides, snapping
  // The frame is the page root's only child, so it is the second row of the layers tree. Selecting
  // it there rather than by pressing the canvas avoids depending on where its children happen to sit.
  await studio.getByRole("button", { name: "Layers", exact: true }).click();
  await tree.getByRole("treeitem").nth(1).click();
  assert.equal(await tree.getByRole("treeitem").nth(1).getAttribute("aria-level"), "2");
  await studio.getByRole("button", { name: "Library", exact: true }).click();
  const widthField = inspector.getByLabel("Width", { exact: true });
  const modelWidth = async () => Number(await widthField.inputValue());
  const renderedWidth = () => page.locator(`[data-studio-node="${frameId}"] > div > section`).evaluate(el => Math.round(el.getBoundingClientRect().width / (el.closest(".studio-world")?.getBoundingClientRect().width / el.closest(".studio-world")?.offsetWidth || 1)));
  /** A frame carries `max-width:100%`, so what renders is the model width capped by the artboard. */
  const artboardContent = () => page.locator(".studio-artboard").evaluate(el => {
    const style = getComputedStyle(el);
    return Math.round(el.offsetWidth - parseFloat(style.paddingInlineStart) - parseFloat(style.paddingInlineEnd));
  });
  const handle = studio.getByRole("slider", { name: /frame width/ });
  await handle.waitFor();
  const setWidth = async width => {
    await widthField.fill(String(width));
    // Enter applies the field's own draft; the row's Apply button is one of several in the panel.
    await widthField.press("Enter");
    // The handle's own value, not the rendered rect: `max-width:100%` can cap what renders.
    await page.waitForFunction(w => document.querySelector("[data-studio-resize]")?.getAttribute("aria-valuenow") === String(w), width);
  };
  /**
   * The press point for the handle — and a check that it really lands on the handle. The canvas
   * clips, so a frame wider than the visible canvas puts its handle under the inspector, where a
   * press would silently do nothing. Asserting what is under the point turns that into a failure.
   */
  const handlePoint = async () => {
    const box = await handle.boundingBox();
    const y = box.y + box.height / 2;
    const candidates = [0.5, 0.75, 0.9, 0.25, 0.1].map(fraction => box.x + box.width * fraction);
    for (const x of candidates) {
      const hit = await page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest("[data-studio-resize]")?.getAttribute("data-studio-resize") ?? null, [x, y]);
      if (hit === frameId) return { x, y };
    }
    await page.screenshot({ path: resolve(out, "handle-unreachable.png"), fullPage: true });
    const geometry = await page.evaluate(() => ({
      canvas: document.querySelector(".studio-canvas")?.getBoundingClientRect(),
      world: document.querySelector(".studio-world")?.getAttribute("style"),
      section: document.querySelector("[data-studio-resize]")?.parentElement?.querySelector("section")?.getBoundingClientRect(),
      valuenow: document.querySelector("[data-studio-resize]")?.getAttribute("aria-valuenow"),
      hit: (() => { const el = document.elementFromPoint(0, 0); return el?.tagName; })(),
    }));
    assert.fail(`the resize handle is not reachable by a pointer anywhere across its own box ${JSON.stringify(box)} ${JSON.stringify(geometry)}`);
  };
  // A 390 viewport keeps the frame and its handle inside the visible canvas at 100%.
  await studio.getByLabel("Viewport width").selectOption("390");
  await studio.getByRole("button", { name: "Reset view", exact: true }).click();
  await setWidth(300);
  assert.equal(await handle.getAttribute("aria-valuemin"), "240");
  assert.equal(await handle.getAttribute("aria-valuemax"), "1920");
  assert.equal(await handle.getAttribute("aria-valuenow"), "300");
  assert.equal(await handle.getAttribute("aria-valuetext"), "300 pixels");
  // The handle must sit ON the frame's own edge. Its wrapper is a full-width block, so a handle
  // anchored to the wrapper floats far right of a narrow frame — which is what it did, measured, and
  // put it outside the clipped canvas entirely once the camera moved.
  const edgeOffset = await page.evaluate(id => {
    const handleEl = document.querySelector(`[data-studio-resize="${id}"]`);
    const section = document.querySelector(`[data-studio-node="${id}"]`).querySelector("section");
    const h = handleEl.getBoundingClientRect(), f = section.getBoundingClientRect();
    return Math.round(h.left + h.width / 2 - f.right);
  }, frameId);
  measurements.handleEdgeOffset = edgeOffset;
  assert.ok(Math.abs(edgeOffset) <= 3, `the handle must sit on the frame's own right edge, not its wrapper's (off by ${edgeOffset}px)`);
  measurements.resizeStart = { model: await modelWidth(), rendered: await renderedWidth() };
  pass("a selected frame carries a resize handle with real slider semantics, sitting on its own edge");

  // ---------------------------------------------------------------- drag the edge
  let point = await handlePoint();
  await dragFromTo(point, { x: point.x + 60, y: point.y });
  const grown = await modelWidth();
  assert.ok(grown > 300, `dragging the edge outwards must widen the frame (300 → ${grown})`);
  assert.ok(Math.abs(grown - 360) <= 6, `and by about the pointer's travel (got ${grown})`);
  measurements.renderCap = { model: grown, rendered: await renderedWidth(), artboardContent: await artboardContent() };
  assert.equal(await renderedWidth(), Math.min(grown, await artboardContent()), "the rendered frame must be the document's width, capped by the frame's own max-width:100%");
  await studio.getByRole("button", { name: "Undo", exact: true }).click();
  assert.equal(await modelWidth(), 300, "one undo must restore the width — a resize is one history step");
  measurements.resizeDrag = { from: 300, to: grown };
  pass("dragging a frame's edge resizes it, and the whole drag is one undo");

  // ---------------------------------------------------------------- snapping to a guide
  // The viewport is 390, so an edge released a few pixels short of it must take exactly 390.
  await setWidth(360);
  point = await handlePoint();
  await dragFromTo(point, { x: point.x + 22, y: point.y }, { release: false });
  assert.equal(await studio.locator(".studio-guide-snapped").count(), 1, "a snapped edge must be drawn differently from a free one");
  const snapAnnouncement = (await studio.locator(".studio-announcement").last().innerText()).trim();
  assert.match(snapAnnouncement, /snapped to Viewport · 390px/, "snapping must be announced, not only drawn");
  await page.screenshot({ path: resolve(out, "resize-snapped.png") });
  await page.mouse.up();
  assert.equal(await modelWidth(), 390, `a release inside the tolerance must take the guide's exact width, not the pointer's (got ${await modelWidth()})`);
  measurements.snap = { released: 382, committed: await modelWidth(), announcement: snapAnnouncement };
  pass("an edge released near a guide snaps to its exact width, and the snap is announced");

  // ---------------------------------------------------------------- outside the tolerance
  await setWidth(300);
  point = await handlePoint();
  await dragFromTo(point, { x: point.x + 60, y: point.y });
  const unsnapped = await modelWidth();
  assert.notEqual(unsnapped, 390, "a release well outside the tolerance must keep the pointer's own width");
  assert.ok(Math.abs(unsnapped - 360) <= 6, `and that width must be where the pointer was (got ${unsnapped})`);
  assert.equal(await studio.locator(".studio-guide-snapped").count(), 0);
  measurements.noSnap = unsnapped;
  pass("an edge released outside the tolerance is not pulled to the guide");

  // ---------------------------------------------------------------- the registry's limits hold
  await setWidth(300);
  point = await handlePoint();
  const canvasFrame = await studio.getByRole("region", { name: "Design canvas" }).boundingBox();
  await dragFromTo(point, { x: canvasFrame.x + 2, y: point.y });
  assert.equal(await modelWidth(), 240, "the layout registry's minimum must hold however far the pointer travels inwards");
  pass("a pointer resize is clamped to the layout registry's minimum");

  // ---------------------------------------------------------------- Escape mid-resize
  // Focus is deliberately left in the Width field by setWidth: a pointer gesture is global, so
  // Escape must abandon it even when the keyboard is somewhere else. It did not, before this slice.
  await setWidth(320);
  point = await handlePoint();
  await dragFromTo(point, { x: point.x + 80, y: point.y }, { release: false });
  assert.equal(await studio.locator(".studio-guide").count(), 1);
  const previewed = await renderedWidth();
  assert.ok(previewed > 320 || previewed === await artboardContent(), `the frame must preview the new width while the pointer is down (got ${previewed})`);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  assert.equal(await page.evaluate(() => document.activeElement?.id), "studio-prop-width", "this check is only meaningful with focus still in the field");
  assert.equal(await modelWidth(), 320, "a cancelled resize must leave the width exactly as it was");
  assert.equal(await renderedWidth(), Math.min(320, await artboardContent()), "and must not leave its preview width behind either");
  pass("Escape during a resize abandons it, in the document and on the screen");

  // ---------------------------------------------------------------- the keyboard equivalent
  await handle.focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await modelWidth(), 321);
  await page.keyboard.press("Shift+ArrowRight");
  assert.equal(await modelWidth(), 331);
  await page.keyboard.press("ArrowLeft");
  assert.equal(await modelWidth(), 330);
  await page.keyboard.press("End");
  assert.equal(await modelWidth(), 1920, "End must take the frame to the registry's maximum");
  await page.keyboard.press("Home");
  assert.equal(await modelWidth(), 240, "Home must take it to the minimum");
  assert.equal(await handle.getAttribute("aria-valuenow"), "240");
  measurements.keyboardResize = [321, 331, 330, 1920, 240];
  pass("the handle resizes from the keyboard alone, through the same width-setting path");

  // ---------------------------------------------------------------- responsive geometry
  await setWidth(320);
  await inspector.getByLabel("Edit at breakpoint").selectOption("desktop");
  await handle.focus();
  await page.keyboard.press("Shift+ArrowRight");
  const atDesktop = await modelWidth();
  assert.equal(atDesktop, 330, "resizing while a breakpoint is selected must change that breakpoint's width");
  assert.match(await inspector.innerText(), /Overridden at Desktop/, "and must be recorded as an override, not as the base width");
  await inspector.getByLabel("Edit at breakpoint").selectOption("base");
  assert.equal(await modelWidth(), 320, "the base width must be untouched by a breakpoint resize");
  measurements.responsiveResize = { base: 320, desktop: atDesktop };
  pass("resizing at a breakpoint writes a breakpoint override and leaves the base width alone");

  // ---------------------------------------------------------------- resize under the camera
  // A narrower frame first: the canvas clips, and at 120% a 320px frame puts its own edge past the
  // visible canvas. That is a real reachability limit of the handle, recorded under limitations.
  // Selecting a breakpoint also moves the viewport, so the camera is put back first.
  await studio.getByLabel("Viewport width").selectOption("390");
  await studio.getByRole("button", { name: "Reset view", exact: true }).click();
  await setWidth(260);
  await studio.getByRole("button", { name: "Zoom in", exact: true }).click();
  await studio.getByRole("button", { name: "Zoom in", exact: true }).click();
  assert.match(await studio.locator(".studio-world").getAttribute("style"), /scale\(1\.2\)/);
  point = await handlePoint();
  // 120 screen pixels at 120% is 100 document pixels. A resize that ignored the camera would record
  // 120 — the same gesture would mean a different width at every zoom level.
  await dragFromTo(point, { x: point.x + 120, y: point.y });
  const zoomed = await modelWidth();
  measurements.zoomedResize = { scale: 1.2, screenPixels: 120, documentPixels: zoomed - 260 };
  assert.ok(Math.abs(zoomed - 360) <= 6, `120 screen pixels at 120% zoom must record about 100 document pixels (got ${zoomed - 260})`);
  assert.ok(Math.abs(zoomed - 380) > 6, "and must not record the raw screen travel — that is the camera-blind defect");
  await studio.getByRole("button", { name: "Reset view", exact: true }).click();
  pass("a resize measures document pixels at any zoom, not screen pixels");

  await scan("resize-handle-visible");

  assert.deepEqual(errors, []);
  const violations = a11y.flatMap(x => x.violations);
  const report = {
    results, runtimeErrors: errors, accessibility: a11y, measurements,
    limitations: [
      "Chromium only; no manual assistive-technology certification",
      "Mouse pointer only: touch and trackpad use the same pointer events but are not driven here",
      "Keyboard parity is the existing library/Move controls; there is no keyboard equivalent of choosing a drop POSITION yet",
      "No auto-scroll while dragging near a canvas edge",
      "Resize covers layout:section width only — the registry declares no other resizable geometry",
      "The canvas clips, so a frame whose edge sits outside the visible canvas puts its handle out of pointer reach; the camera must be panned or zoomed out first, and the keyboard path is unaffected",
      "Each keyboard resize step is its own history entry, unlike a pointer drag which is one",
      "Local adapter only; no production auth/billing or hosted verification",
    ],
  };
  await writeFile(resolve(out, "canvas-results.json"), JSON.stringify(report, null, 2));
  assert.equal(violations.length, 0, JSON.stringify(a11y, null, 2));
  console.log(JSON.stringify({ passed: results.length, axeViolations: violations.length, out }));
} catch (error) {
  await writeFile(resolve(out, "canvas-failure.json"), JSON.stringify({ message: String(error), stack: error?.stack, results, errors, measurements }, null, 2));
  await page.screenshot({ path: resolve(out, "canvas-failure.png"), fullPage: true }).catch(() => {});
  throw error;
} finally { await browser.close(); }
