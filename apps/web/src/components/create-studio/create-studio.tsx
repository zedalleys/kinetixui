"use client";
import * as React from "react";
import { Button, Input, Label, NativeSelect, Checkbox, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@kinetixui/ui";
import { Undo2, Redo2, Plus, Save, Download, ZoomIn, ZoomOut, Hand, MousePointer2, Layers, Package, ArrowUp, ArrowDown, Trash2, Sun, Moon } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ADAPTERS, adapterFor, type Props } from "@/lib/create-studio/registry";
import { migrateDocument, findNode, serializeDocument, walk, type Document, type Node } from "@/lib/create-studio/model";
import { execute, newHistory, undo, redo, type History, type Command } from "@/lib/create-studio/commands";
import { decodePreset } from "@kinetixui/create-preset";
import { resolveCreateTheme, cssVarOverrides, hexToHslChannels } from "@kinetixui/create-theme";
import { exportReact } from "@/lib/create-studio/export";
import { NodeView } from "./node-view";
import { ViewportPreview } from "./viewport-preview";
import { BREAKPOINTS, canOverride, responsiveProps, type Breakpoint } from "@/lib/create-studio/responsive";
import { reduce, IDLE, snapWidth, type Guide, type Interaction, type InteractionEvent, type DragIntent, type Rect } from "@/lib/create-studio/interaction";
import { resolveDrop, subtreeIds } from "./canvas-drop";
import layoutRegistry from "../../../../../docs/create/layout-registry.json";
const FRAME_WIDTH = layoutRegistry.layouts["layout:section"].width;
// How close to a guide the pointer must come for it to take over, in document pixels.
const SNAP_TOLERANCE = 8;

const viewportPresets = [
  { label: "Mobile", width: 390, height: 844 },
  { label: "Tablet", width: 768, height: 1024 },
  { label: "Desktop", width: 960, height: 800 },
];
type Product = { id: string; revision: number; doc: Document; readOnly: boolean };
type Account = { accountId: string; workspaceId: string; productLimit: number; products: { id: string; name: string; readOnly: boolean; revision: number }[] };
class ApiError extends Error { constructor(public code: string, message: string) { super(message); } }
async function request<T>(body?: unknown, id?: string): Promise<T> {
  const res = await fetch("/api/create-studio" + (id ? "?id=" + encodeURIComponent(id) : ""), body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new ApiError(data.code, data.message);
  return data as T;
}
function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const keyFor = (account: Account, id: string) => `kinetix-studio:${account.accountId}:${id}`;
type Draft = { key: string; baseRevision: number; doc: Document; updatedAt: number };
function draftsFor(account: Account, product: Product): Draft[] {
  const prefix = keyFor(account, product.id);
  const saved = serializeDocument(product.doc);
  return Object.keys(localStorage).filter(key => key === prefix || key.startsWith(prefix + ":")).flatMap(key => {
    try {
      const draft = JSON.parse(localStorage.getItem(key) ?? "null");
      draft.doc = migrateDocument(draft.doc);
      if (draft.doc.id !== product.id || !Number.isSafeInteger(draft.baseRevision) || draft.baseRevision < 1 || serializeDocument(draft.doc) === saved) return [];
      return [{ key, baseRevision: draft.baseRevision, doc: draft.doc, updatedAt: Number.isFinite(draft.updatedAt) ? draft.updatedAt : 0 }];
    } catch { return []; }
  }).sort((a, b) => b.updatedAt - a.updatedAt);
}
const nodeLabel = (node: Node) => node.metadata?.name ?? (node.ref === "layout:section" ? String(node.props?.name ?? "Frame") : node.ref ? ADAPTERS[node.ref]?.label ?? node.ref : "Page");
function ResizeOverlay({ canvas, nodeId, width, guide, rtl }: { canvas: HTMLElement | null; nodeId: string; width: number; guide: string | null; rtl: boolean }) {
  if (!canvas) return null;
  const frame = canvas.getBoundingClientRect();
  const node = canvas.querySelector(`[data-studio-node="${nodeId}"]`)?.getBoundingClientRect();
  if (!node) return null;
  // The guide is drawn on the edge being dragged, down the full height of the canvas, so it can be
  // lined up against anything else on the screen. Announced in the status line, never colour alone.
  const edge = (rtl ? node.left : node.right) - frame.left;
  return <div className="studio-resize-overlay" aria-hidden="true">
    <div className={`studio-guide ${guide ? "studio-guide-snapped" : ""}`} style={{ insetInlineStart: edge, insetBlockStart: 0, height: frame.height }} />
    <div className="studio-guide-label" style={{ insetInlineStart: edge + 8, insetBlockStart: node.top - frame.top + 8 }}>{width}px{guide ? ` · ${guide}` : ""}</div>
  </div>;
}
function DropOverlay({ canvas, hint, label, x, y }: { canvas: HTMLElement | null; hint: { rect: Rect | null; indicator: Rect | null; rejected: string | null } | null; label: string; x: number; y: number }) {
  const frame = canvas?.getBoundingClientRect();
  if (!frame) return null;
  const place = (rect: Rect) => ({ insetBlockStart: rect.top - frame.top, insetInlineStart: rect.left - frame.left, width: rect.right - rect.left, height: rect.bottom - rect.top });
  // Decoration only: it is announced through the canvas status line, and never takes the pointer.
  return <div className="studio-drop-overlay" aria-hidden="true">
    {hint?.rect && <div className="studio-drop-container" style={place(hint.rect)} />}
    {hint?.indicator && <div className="studio-drop-indicator" style={place(hint.indicator)} />}
    <div className={`studio-drag-preview ${hint?.rejected ? "studio-drag-rejected" : ""}`} style={{ insetBlockStart: y - frame.top + 12, insetInlineStart: x - frame.left + 12 }}>{label}</div>
  </div>;
}
export function CreateStudio() {
  const [account, setAccount] = React.useState<Account | null>(null);
  const [product, setProduct] = React.useState<Product | null>(null);
  const [history, setHistory] = React.useState<History | null>(null);
  const [saved, setSaved] = React.useState("");
  const [draftBase, setDraftBase] = React.useState<number | null>(null);
  const [draftChoices, setDraftChoices] = React.useState<Draft[]>([]);
  const [draftChoice, setDraftChoice] = React.useState("");
  // A fresh writer ID per mounted editor, including duplicated tabs. Saving only clears this writer's copy.
  const draftWriter = React.useRef<string | null>(null);
  const recoveredCopy = React.useRef<Document | null>(null);
  const [pageId, setPageId] = React.useState("page_home");
  const [productName, setProductName] = React.useState("My first product");
  const dialogReturnFocus = React.useRef<HTMLElement | null>(null);
  const newProductButton = React.useRef<HTMLButtonElement>(null);
  const createKey = React.useRef<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [upgrade, setUpgrade] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [exportSource, setExportSource] = React.useState("");
  const [panel, setPanel] = React.useState<"layers" | "library">("library");
  const [search, setSearch] = React.useState("");
  const [viewport, setViewport] = React.useState(960);
  const [viewportHeight, setViewportHeight] = React.useState(800);
  const [breakpoint, setBreakpoint] = React.useState<Breakpoint | "base">("base");
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 24, y: 24 });
  const [pan, setPan] = React.useState(false);
  const [preview, setPreview] = React.useState(false);
  const previewToggle = React.useRef<HTMLButtonElement>(null);
  const [dark, setDark] = React.useState(false);
  const [rtl, setRtl] = React.useState(false);
  const [inspector, setInspector] = React.useState(true);
  const [focusIndex, setFocusIndex] = React.useState(0);
  const [fieldDrafts, setFieldDrafts] = React.useState<Record<string, string>>({});
  const [moveTarget, setMoveTarget] = React.useState("");
  const [interaction, setInteraction] = React.useState<Interaction>(IDLE);
  const [dropHint, setDropHint] = React.useState<{ rect: Rect | null; indicator: Rect | null; rejected: string | null; parentId: string | null } | null>(null);
  const canvasRef = React.useRef<HTMLDivElement>(null);
  // A drag that travelled past the threshold must not also fire the library item's click handler,
  // which would insert the component a second time at the default position.
  const dragged = React.useRef(false);
  const interactionRef = React.useRef<Interaction>(IDLE);
  const treeRef = React.useRef<HTMLDivElement>(null);
  const latest = React.useRef(history); latest.current = history;
  const doc = history?.doc;
  const page = doc?.pages.find(p => p.id === pageId) ?? doc?.pages[0];
  const selected = history?.selection.map(id => findNode(history.doc, id)).filter((n): n is Node => !!n) ?? [];
  const current = selected[0];
  const responsiveSelection = selected.length === 1 && current?.kind === "layout";
  const activeBreakpoint = responsiveSelection ? BREAKPOINTS.find(item => item.id === breakpoint) : undefined;
  const dirty = !!doc && serializeDocument(doc) !== saved;
  const staleDraft = draftBase !== null && draftBase !== product?.revision;
  const themeStyle = React.useMemo(() => {
    const decoded = decodePreset(doc?.designSystem.preset ?? "KX1_eyJ2IjoxfQ");
    if (!decoded.ok) return {};
    const mode = resolveCreateTheme(decoded.config)[dark ? "dark" : "light"];
    return { ...Object.fromEntries(Object.entries(mode.colors).map(([name, hex]) => [`--${name}`, hexToHslChannels(hex)])), ...Object.fromEntries(Object.entries(cssVarOverrides(mode)).map(([name, value]) => [`--${name}`, value])) };
  }, [doc?.designSystem.preset, dark]);
  const readOnly = !!product?.readOnly;
  const rows: { node: Node; depth: number; parent?: Node }[] = [];
  if (page) {
    const collect = (node: Node, depth: number, parent?: Node) => { rows.push({ node, depth, parent }); node.children?.forEach(n => collect(n, depth + 1, node)); };
    collect(page.root, 0);
  }
  const containers = rows.filter(row => row.node.kind === "slot" || (row.node.ref && ADAPTERS[row.node.ref]?.container));
  const selectionKey = history?.selection.join(",") ?? "";
  React.useEffect(() => { setFieldDrafts({}); }, [selectionKey, breakpoint]);
  const chooseViewport = (width: number) => {
    const preset = viewportPresets.find(item => item.width === width);
    if (!preset) return;
    setViewport(preset.width);
    setViewportHeight(preset.height);
  };
  const exitPreview = React.useCallback(() => {
    setPreview(false);
    previewToggle.current?.focus();
  }, []);
  const perform = (command: Command) => {
    if (!history || readOnly || preview || busy) return false;
    try { const next = execute(history, command); setHistory(next); if (command.type === "page") setPageId(next.doc.pages.at(-1)!.id); setError(""); setNotice(command.type === "insert" ? `${adapterFor(command.ref).label} added.` : "Change applied."); return true; }
    catch (e) { setError(e instanceof Error ? e.message : "This change could not be applied."); }
  };
  const select = (id: string, additive = false) => {
    if (!history) return;
    setHistory({ ...history, selection: additive ? history.selection.includes(id) ? history.selection.filter(n => n !== id) : [...history.selection, id] : [id] });
    setInspector(true);
  };
  React.useEffect(() => {
    if (!doc || !account || !product || doc === recoveredCopy.current) return;
    try {
      if (!dirty) {
        if (draftWriter.current) localStorage.removeItem(keyFor(account, product.id) + ":" + draftWriter.current);
        return;
      }
      draftWriter.current ??= crypto.randomUUID();
      localStorage.setItem(keyFor(account, product.id) + ":" + draftWriter.current, JSON.stringify({ baseRevision: draftBase ?? product.revision, doc, updatedAt: Date.now() }));
    }
    catch { setNotice("Browser draft storage is unavailable. Save to the local server or download your draft."); }
  }, [doc, account, product, dirty, draftBase]);
  // One gesture at a time, and one place that decides what a gesture meant. `dispatch` advances the
  // pure machine; only a `commit` it returns changes the document, so an interrupted drag — Escape,
  // a cancelled pointer, a window that lost focus — leaves the document exactly as it was.
  const dispatch = (event: InteractionEvent) => {
    const { state, commit } = reduce(interactionRef.current, event);
    interactionRef.current = state;
    setInteraction(state);
    if (state.mode !== "drag") setDropHint(null);
    if (!commit) return;
    if (commit.kind === "pan") { setOffset({ x: commit.x, y: commit.y }); return; }
    // A press is NOT acted on here. The element's own `click` is the authority for a press — the
    // library item's onClick inserts, and a node's onClickCapture selects — so inserting here too
    // would add the component twice for one click. The machine still reports it, which is what tells
    // those handlers a drag did not happen.
    if (commit.kind === "press") return;
    if (commit.kind === "resize") { applyWidth(commit.nodeId, commit.width); return; }
    dragged.current = true;
    if (commit.kind === "insert") perform({ type: "insert", parentId: commit.parentId, ref: commit.ref, index: commit.index });
    else perform({ type: "move", ids: commit.ids, parentId: commit.parentId, index: commit.index });
  };
  /**
   * One width change is one history step, and it is written where the person is editing: to the
   * breakpoint override when a breakpoint is selected, to the base props otherwise. The same
   * function serves the pointer handle and its keyboard equivalent, so the two cannot diverge.
   */
  const applyWidth = (nodeId: string, width: number) => {
    if (activeBreakpoint) perform({ type: "responsive", id: nodeId, breakpoint: activeBreakpoint.id, property: "width", value: width });
    else perform({ type: "props", ids: [nodeId], patch: { width } });
  };
  /**
   * What a frame's edge can snap to, most meaningful first — ties go to the earlier guide. The
   * breakpoints come from the responsive contract rather than from literals here, and the 8px step
   * is last so a deliberate breakpoint width always wins over the nearest round number.
   */
  const widthGuides = (): Guide[] => {
    const siblings = rows.flatMap(({ node }) => node.ref === "layout:section" && node.id !== current?.id && typeof node.props?.width === "number"
      ? [{ value: node.props.width as number, label: `${nodeLabel(node)} · ${node.props.width}px` }] : []);
    return [
      { value: viewport, label: `Viewport · ${viewport}px` },
      ...BREAKPOINTS.map(item => ({ value: item.minWidth, label: `${item.label} · ${item.minWidth}px` })),
      ...siblings,
    ];
  };
  const beginResize = (event: React.PointerEvent, nodeId: string, width: number) => {
    if (readOnly || preview || busy) return;
    dispatch({ type: "resize-start", pointerId: event.pointerId, x: event.clientX, nodeId, width });
  };
  // Cancellation still goes through the machine — there is one definition of what cancelling does —
  // but with a stable identity, so the keyboard handler does not re-register on every render.
  const cancelGesture = React.useCallback(() => {
    const { state } = reduce(interactionRef.current, { type: "cancel" });
    interactionRef.current = state;
    setInteraction(state);
    setDropHint(null);
  }, []);
  const beginDrag = (event: React.PointerEvent, intent: DragIntent) => {
    if (readOnly || preview || busy || pan) return;
    dragged.current = false;
    dispatch({ type: "drag-start", pointerId: event.pointerId, x: event.clientX, y: event.clientY, intent });
  };
  React.useEffect(() => {
    if (interaction.mode === "idle") return;
    const resolve = (x: number, y: number) => {
      const state = interactionRef.current;
      const root = canvasRef.current;
      if (!root || !doc || (state.mode !== "drag" && state.mode !== "pending")) return undefined;
      const intent = state.intent;
      const resolution = resolveDrop(root, doc, x, y, {
        excluded: intent.kind === "move" ? subtreeIds(doc, intent.ids) : undefined,
        dir: rtl ? "rtl" : "ltr",
      });
      setDropHint({ rect: resolution.rect, indicator: resolution.indicator, rejected: resolution.rejected, parentId: resolution.target?.parentId ?? null });
      return resolution;
    };
    const move = (event: PointerEvent) => {
      const state = interactionRef.current;
      if (state.mode === "resize") {
        // Screen travel is divided by the camera's scale, so a resize measures the same number of
        // document pixels at any zoom. In a right-to-left document the inline edge grows leftwards.
        const travelled = ((event.clientX - state.originX) / zoom) * (rtl ? -1 : 1);
        const snapped = snapWidth(state.startWidth + travelled, widthGuides(), { min: FRAME_WIDTH.min, max: FRAME_WIDTH.max, tolerance: SNAP_TOLERANCE });
        dispatch({ type: "pointer-move", pointerId: event.pointerId, x: event.clientX, y: event.clientY, width: snapped.width, guide: snapped.guide?.label ?? null });
        return;
      }
      const resolution = resolve(event.clientX, event.clientY);
      dispatch({ type: "pointer-move", pointerId: event.pointerId, x: event.clientX, y: event.clientY, target: resolution?.target ?? null, rejected: resolution?.rejected ?? null });
    };
    const up = (event: PointerEvent) => dispatch({ type: "pointer-up", pointerId: event.pointerId });
    const cancel = () => cancelGesture();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", cancel);
    };
  });
  const applyHistory = React.useCallback((direction: "undo" | "redo") => {
    if (!latest.current) return;
    const next = direction === "undo" ? undo(latest.current) : redo(latest.current);
    const selectedId = next.selection[0];
    const containingPage = selectedId && next.doc.pages.find(p => {
      let found = false;
      walk(p.root, node => { if (node.id === selectedId) found = true; });
      return found;
    });
    setPageId(id => (containingPage && containingPage.id) || next.doc.pages.find(p => p.id === id)?.id || next.doc.pages[0].id);
    setFocusIndex(0);
    setFieldDrafts({});
    setHistory(next);
  }, []);
  React.useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      // A pointer gesture is global: it does not belong to whatever has keyboard focus. Escape must
      // abandon one even when focus is sitting in a property field, which is exactly where it tends
      // to be after typing a width and then reaching for the handle.
      if (event.key === "Escape" && interactionRef.current.mode !== "idle") { cancelGesture(); return; }
      if (target.closest('input,textarea,select,[contenteditable="true"],[role="dialog"]')) return;
      if (event.key === "Escape") { setPreview(false); setPan(false); cancelGesture(); return; }
      if (!(event.metaKey || event.ctrlKey) || !latest.current) return;
      if (event.key.toLowerCase() === "z" && !readOnly && !busy && !preview) {
        event.preventDefault(); applyHistory(event.shiftKey ? "redo" : "undo");
      }
    };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, [readOnly, busy, preview, applyHistory, cancelGesture]);
  async function start() {
    setBusy(true); setError("");
    try { setAccount(await request<Account>({ operation: "session" })); } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function openProduct(id: string, reopenSaved = false) {
    if (dirty && !reopenSaved) { setError("Save or download your current draft before opening another product."); return; }
    setBusy(true); setError("");
    try {
      const p = await request<Product>(undefined, id);
      setProduct(p); setHistory(newHistory(p.doc)); setSaved(serializeDocument(p.doc)); setPageId(p.doc.pages[0].id);
      draftWriter.current = null; recoveredCopy.current = null;
      setDraftBase(null); setDraftChoices([]); setFieldDrafts({});
      setNotice("");
      try {
        if (account && draftsFor(account, p).length) setNotice("A draft from this browser is available. Use Recover draft to review it before saving.");
      } catch { setNotice("Browser draft storage is unavailable."); }
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function create() {
    if (!account) return;
    if (dirty) { setError("Save or download your current draft before creating another product."); return; }
    setBusy(true); setError("");
    try {
      createKey.current ??= crypto.randomUUID();
      const p = await request<Product>({ operation: "create", name: productName, key: createKey.current });
      setProduct(p); setHistory(newHistory(p.doc)); setSaved(serializeDocument(p.doc)); setPageId(p.doc.pages[0].id);
      draftWriter.current = null; recoveredCopy.current = null;
      setDraftBase(null); setDraftChoices([]); setFieldDrafts({});
      createKey.current = null; setAccount(await request<Account>());
      setNotice("Product created. Add a component from the library, then edit it in Properties.");
    } catch (e) { if (e instanceof ApiError && e.code === "PRODUCT_LIMIT_REACHED") { dialogReturnFocus.current = newProductButton.current; setUpgrade(true); } else setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!history || !product || !account || readOnly || busy || staleDraft || Object.keys(fieldDrafts).length) return;
    setBusy(true); setError("");
    const payload = history.doc;
    try {
      const p = await request<Product>({ operation: "save", id: product.id, revision: draftBase ?? product.revision, doc: payload });
      setProduct(p); setSaved(serializeDocument(payload)); setDraftBase(null); setNotice("Saved to this computer's local server.");
      try {
        if (draftWriter.current && latest.current && serializeDocument(latest.current.doc) === serializeDocument(payload)) localStorage.removeItem(keyFor(account, product.id) + ":" + draftWriter.current);
      } catch { /* The server already confirmed the save. */ }
      setAccount(current => current && { ...current, products: current.products.map(item => item.id === p.id ? { ...item, name: p.doc.name, revision: p.revision, readOnly: p.readOnly } : item) });
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError && e.code === "PRODUCT_READ_ONLY") setProduct({ ...product, readOnly: true });
    } finally { setBusy(false); }
  }
  function recover(draftKey?: string) {
    if (!account || !product || dirty || busy || Object.keys(fieldDrafts).length) return;
    try {
      const drafts = draftsFor(account, product);
      if (!draftKey && drafts.length > 1) { setDraftChoices(drafts); setDraftChoice(drafts[0].key); return; }
      const draft = draftKey ? drafts.find(item => item.key === draftKey) : drafts[0];
      setDraftChoices([]);
      if (!draft) { setNotice("No browser draft is available."); return; }
      recoveredCopy.current = draft.doc;
      setDraftBase(draft.baseRevision);
      setHistory(newHistory(draft.doc));
      setPageId(id => draft.doc.pages.some(p => p.id === id) ? id : draft.doc.pages[0].id);
      setNotice("Browser draft recovered.");
      setError(draft.baseRevision === product.revision ? "" : "This draft is based on a different saved revision. Download it to keep a copy, or reopen the saved version. Save is unavailable for this draft.");
    } catch { setError("This browser draft cannot be recovered. The saved product is unchanged."); }
  }
  function exportFiles() {
    if (!doc) return;
    try { const result = exportReact(doc); setExportSource(result.source); dialogReturnFocus.current = document.activeElement as HTMLElement; setExportOpen(true); } catch (e) { setError((e as Error).message); }
  }
  const insert = (ref: string) => {
    if (!page) return;
    const target = current && (current.kind === "slot" || (current.ref && ADAPTERS[current.ref]?.container)) ? current : rows.find(row => row.node.id === current?.id)?.parent ?? page.root.children?.[0] ?? page.root;
    perform({ type: "insert", parentId: ref === "layout:section" ? page.root.id : target.id, ref });
  };
  function reorder(direction: -1 | 1) {
    if (!current) return;
    const row = rows.find(r => r.node.id === current.id);
    if (!row?.parent) return;
    const index = row.parent.children!.findIndex(n => n.id === current.id);
    perform({ type: "move", ids: [current.id], parentId: row.parent.id, index: Math.max(0, Math.min(row.parent.children!.length - 1, index + direction)) });
  }
  const selectedAdapter = current?.ref ? ADAPTERS[current.ref] : undefined;
  const controls = selectedAdapter ? Object.entries(selectedAdapter.controls).filter(([key]) => selected.every(n => n.ref && ADAPTERS[n.ref]?.controls[key] && ADAPTERS[n.ref].controls[key].type === selectedAdapter.controls[key].type && JSON.stringify(ADAPTERS[n.ref].controls[key].values) === JSON.stringify(selectedAdapter.controls[key].values))) : [];
  return <section className="create-studio" aria-label="Create Studio" dir={rtl ? "rtl" : "ltr"}>
    <div className="studio-heading">
      <div className="studio-title"><BrandMark className="size-8" /><div><h1>Create Studio</h1><p>Real components. Your own canvas.</p></div></div>
      <span className="studio-dev">Local development · billing not configured</span>
    </div>
    {!account ? <div className="studio-welcome">
      <h2>A place for your next interface.</h2><p>Compose screens with the KinetixUI components you already use. Your local account includes one product, with multiple pages and screens.</p>
      <Button disabled={busy} onClick={start}>{busy ? "Opening…" : "Start local workspace"}</Button>
      <p className="studio-muted">Development only. This creates a local browser session, not a production sign-up.</p>
      {error && <p role="alert">{error}</p>}
    </div> : <>
      <div className="studio-products">
        <div className="studio-product-select"><Label htmlFor="studio-open-product">Products</Label><NativeSelect id="studio-open-product" aria-label="Open product" disabled={busy} value={product?.id ?? ""} onChange={e => { if (e.target.value) void openProduct(e.target.value); }}><option value="">Choose a product</option>{account.products.map(p => <option key={p.id} value={p.id}>{p.name}{p.readOnly ? " · read-only" : ""}</option>)}</NativeSelect></div>
        <form onSubmit={e => { e.preventDefault(); void create(); }} className="studio-product-form">
          <Label htmlFor="studio-product-name" className="sr-only">New product name</Label>
          <Input id="studio-product-name" value={productName} maxLength={120} onChange={e => { setProductName(e.target.value); createKey.current = null; }} />
          <Button ref={newProductButton} variant="Outline" disabled={busy || !productName.trim()} type="submit"><Plus className="size-4" />New product</Button>
        </form>
        <span className="studio-muted">{account.products.length} / {account.productLimit} products</span>
      </div>
      {history && page ? <>
        <div className="studio-toolbar" role="group" aria-label="Document actions">
          <strong className="studio-product-title">{doc!.name}</strong>
          <Button size="icon" variant="Ghost" aria-label="Undo" title="Undo (⌘/Ctrl Z)" disabled={!history.past.length || readOnly || busy || preview} onClick={() => applyHistory("undo")}><Undo2 className="size-4" /></Button>
          <Button size="icon" variant="Ghost" aria-label="Redo" title="Redo (⌘/Ctrl Shift Z)" disabled={!history.future.length || readOnly || busy || preview} onClick={() => applyHistory("redo")}><Redo2 className="size-4" /></Button>
          <span className="studio-save-state" role="status">{readOnly ? "Read-only · work preserved" : busy ? "Working…" : staleDraft ? "Draft revision conflict" : Object.keys(fieldDrafts).length ? "Unapplied property draft" : dirty ? "Unsaved changes" : "Saved locally"}</span>
          <Button variant="Outline" disabled={busy || readOnly || staleDraft || !dirty || !!Object.keys(fieldDrafts).length} onClick={save}><Save className="size-4" />Save</Button>
          <Button ref={previewToggle} variant={preview ? "Primary" : "Outline"} onClick={() => { setPreview(!preview); setPan(false); }}>{preview ? "Back to editing" : "Preview"}</Button>
          <Button disabled={!!Object.keys(fieldDrafts).length} onClick={exportFiles}><Download className="size-4" />Export React</Button>
        </div>
        {(error || staleDraft) && <div className="studio-error" role="alert"><p>{error || "This draft is based on a different saved revision. Download it or reopen the saved version."}</p><div><Button variant="Outline" size="sm" onClick={() => download("create-draft.json", serializeDocument(history.doc))}>Download draft</Button><Button variant="Ghost" size="sm" onClick={() => { void openProduct(product!.id, true); }}>Reopen saved (draft stays here)</Button></div></div>}
        {draftChoices.length > 1 && !dirty && <div className="studio-products">
          <div className="studio-product-select"><Label htmlFor="studio-draft">Browser draft</Label><NativeSelect id="studio-draft" value={draftChoice} onChange={e => setDraftChoice(e.target.value)}>{draftChoices.map((draft, index) => <option key={draft.key} value={draft.key}>Draft {index + 1} · revision {draft.baseRevision}{draft.updatedAt ? " · " + new Date(draft.updatedAt).toLocaleString() : ""}</option>)}</NativeSelect></div>
          <Button size="sm" onClick={() => recover(draftChoice)}>Open selected draft</Button><Button size="sm" variant="Ghost" onClick={() => setDraftChoices([])}>Cancel draft recovery</Button>
        </div>}
        <p className="studio-announcement" role="status">{notice || "Select a component on the canvas or add one from the library."}</p>
        <div className="studio-mobile-tools"><Button variant="Outline" onClick={() => setInspector(!inspector)}>{inspector ? "Hide properties" : "Show properties"}</Button></div>
        <div className="studio-workspace">
          <aside className="studio-navigator" aria-label="Pages, layers and component library">
            <div className="studio-panel-section">
              <div className="studio-panel-title"><h2>Pages</h2><Button size="sm" variant="Ghost" disabled={readOnly || busy || preview} onClick={() => { const name = `Screen ${doc!.pages.length + 1}`; perform({ type: "page", name }); }}><Plus className="size-4" />Screen</Button></div>
              <NativeSelect aria-label="Current screen" value={page.id} onChange={e => { setPageId(e.target.value); setHistory({ ...history, selection: [] }); }}>{doc!.pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</NativeSelect>
              <p className="studio-muted">{page.route}</p>
            </div>
            <div className="studio-panel-switch" aria-label="Navigation panel"><Button size="sm" variant={panel === "layers" ? "Secondary" : "Ghost"} aria-pressed={panel === "layers"} onClick={() => setPanel("layers")}><Layers className="size-4" />Layers</Button><Button size="sm" variant={panel === "library" ? "Secondary" : "Ghost"} aria-pressed={panel === "library"} onClick={() => setPanel("library")}><Package className="size-4" />Library</Button></div>
            {panel === "library" ? <div className="studio-panel-section">
              <Label htmlFor="studio-search">Find a component</Label><Input id="studio-search" placeholder="Search library…" value={search} onChange={e => setSearch(e.target.value)} />
              <div className="studio-library">{Object.entries(ADAPTERS).filter(([, a]) => a.label.toLowerCase().includes(search.toLowerCase())).map(([ref, a]) => <Button variant="Ghost" key={ref} disabled={readOnly || busy || preview} data-studio-library={ref} onPointerDown={event => { if (event.button === 0) beginDrag(event, { kind: "insert", ref }); }} onClick={() => { if (dragged.current) { dragged.current = false; return; } insert(ref); }} aria-label={`Add ${a.label}`}><span className="studio-library-icon">{ref.startsWith("layout:") ? <Layers className="size-4" /> : <Package className="size-4" />}</span><span><strong>{a.label}</strong><small>{ref.startsWith("layout:") ? "Structure" : "KinetixUI component"}</small></span><Plus className="size-4" /></Button>)}</div>
              {!Object.values(ADAPTERS).some(a => a.label.toLowerCase().includes(search.toLowerCase())) && <p>No supported components match this search.</p>}
              <p className="studio-muted">A verified subset of the library. Other components are not editable yet.</p>
            </div> : <div className="studio-layer-panel">
              <div role="tree" aria-label="Screen layers" aria-multiselectable="true" ref={treeRef} onKeyDown={event => {
                const key = event.key;
                const index = Math.min(focusIndex, rows.length - 1);
                const next = key === "ArrowDown" ? Math.min(index + 1, rows.length - 1) : key === "ArrowUp" ? Math.max(index - 1, 0) : key === "Home" ? 0 : key === "End" ? rows.length - 1 : key === "ArrowLeft" ? Math.max(0, rows.findIndex(r => r.node.id === rows[index]?.parent?.id)) : key === "ArrowRight" ? Math.min(index + 1, rows.length - 1) : -1;
                if (next >= 0) { event.preventDefault(); setFocusIndex(next); treeRef.current?.querySelectorAll<HTMLElement>('[role="treeitem"]')[next]?.focus(); }
                if (key === "Delete" && history.selection.length) { event.preventDefault(); perform({ type: "delete", ids: history.selection }); }
              }}>{rows.map(({ node, depth }, index) => <Button variant="Ghost" role="treeitem" key={node.id} aria-level={depth + 1} aria-selected={history.selection.includes(node.id)} aria-expanded={node.children?.length ? true : undefined} tabIndex={Math.min(focusIndex, rows.length - 1) === index ? 0 : -1} style={{ paddingInlineStart: `calc(.75rem + ${depth} * .75rem)` }} onFocus={() => setFocusIndex(index)} onClick={e => select(node.id, e.shiftKey)}><Layers className="size-4" /><span>{nodeLabel(node)}</span></Button>)}</div>
              <p className="studio-muted studio-panel-section">Shift-click to select more than one layer. Use arrows to navigate, Space to select.</p>
            </div>}
          </aside>
          <div className="studio-center">
            <div className="studio-canvas-tools">
              <div className="studio-viewport"><Label htmlFor="studio-viewport-width">Viewport</Label><NativeSelect id="studio-viewport-width" aria-label="Viewport width" value={viewport} onChange={e => chooseViewport(Number(e.target.value))}>{viewportPresets.map(({ label, width, height }) => <option key={width} value={width}>{label} · {width} × {height}</option>)}</NativeSelect></div>
              {preview && <div className="studio-viewport"><Label htmlFor="studio-viewport-height">Height</Label><NativeSelect id="studio-viewport-height" value={viewportHeight} onChange={e => setViewportHeight(Number(e.target.value))}>{[600, 800, 844, 1024].map(height => <option key={height} value={height}>{height} px</option>)}</NativeSelect></div>}
              <Button variant="Ghost" size="icon" aria-label={dark ? "Light canvas" : "Dark canvas"} onClick={() => setDark(!dark)}>{dark ? <Sun className="size-4" /> : <Moon className="size-4" />}</Button>
              <Button variant="Ghost" size="sm" aria-pressed={rtl} onClick={() => setRtl(!rtl)}>RTL</Button>
              <Button disabled={preview} variant={pan ? "Secondary" : "Ghost"} size="icon" aria-label={pan ? "Use selection tool" : "Use pan tool"} onClick={() => setPan(!pan)}>{pan ? <Hand className="size-4" /> : <MousePointer2 className="size-4" />}</Button>
            </div>
            <div ref={canvasRef} className={`studio-canvas ${pan ? "studio-panning" : ""} ${preview ? "studio-canvas-preview" : ""} ${interaction.mode === "drag" ? "studio-canvas-dragging" : ""}`} tabIndex={0} role="region" aria-label="Design canvas" onKeyDown={event => { if (preview || event.target !== event.currentTarget) return; const delta: Record<string, [number, number]> = { ArrowLeft: [24, 0], ArrowRight: [-24, 0], ArrowUp: [0, 24], ArrowDown: [0, -24] }; if (delta[event.key]) { event.preventDefault(); const [x, y] = delta[event.key]; setOffset(p => ({ x: p.x + x, y: p.y + y })); } if (event.key.toLowerCase() === "h") setPan(true); if (event.key.toLowerCase() === "v") setPan(false); }} onPointerDown={e => {
              if (preview || (!pan && e.button !== 1)) return;
              e.preventDefault();
              dispatch({ type: "pan-start", pointerId: e.pointerId, x: e.clientX, y: e.clientY, offsetX: offset.x, offsetY: offset.y });
            }}>
              <div className="studio-world" style={{ width: viewport, transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}>
                <div className="studio-artboard-label"><span>{page.name}</span><span>{preview ? `${viewport} × ${viewportHeight}` : `${viewport}px`} · {Math.round(zoom * 100)}%</span></div>
                {preview ? <ViewportPreview root={page.root} height={viewportHeight} dark={dark} rtl={rtl} theme={themeStyle} onExit={exitPreview} /> :
                  <div data-studio-drop={page.root.id} className={`studio-artboard ${dark ? "dark" : "theme-light"} ${dropHint?.parentId === page.root.id ? "studio-node-drop" : ""}`} dir={rtl ? "rtl" : "ltr"} style={{ ...themeStyle, pointerEvents: pan ? "none" : undefined }}>
                    {page.root.children?.length ? <NodeView node={page.root} selection={history.selection} onSelect={select} onNodePointerDown={(id, event) => { if (event.button === 0) beginDrag(event, { kind: "move", ids: history.selection.includes(id) ? history.selection : [id] }); }} dropParentId={dropHint?.parentId ?? null} resize={{ active: interaction.mode === "resize" ? { nodeId: interaction.nodeId, width: interaction.width } : null, limits: FRAME_WIDTH, onStart: (id, width, event) => beginResize(event, id, width), onSet: applyWidth }} editWidth={viewport} dir={rtl ? "rtl" : "ltr"} /> : <div className="studio-empty"><h2>A new screen, ready for you.</h2><p>Add a frame, then fill it with components.</p><Button disabled={readOnly} onClick={() => insert("layout:section")}><Plus className="size-4" />Add frame</Button></div>}
                  </div>}
              </div>
              {interaction.mode === "resize" && <ResizeOverlay canvas={canvasRef.current} nodeId={interaction.nodeId} width={interaction.width} guide={interaction.guide} rtl={rtl} />}
              {interaction.mode === "drag" && <DropOverlay canvas={canvasRef.current} hint={dropHint} label={interaction.intent.kind === "insert" ? adapterFor(interaction.intent.ref).label : `${interaction.intent.ids.length} layer${interaction.intent.ids.length > 1 ? "s" : ""}`} x={interaction.x} y={interaction.y} />}
            </div>
            <p className="studio-announcement" role="status">{interaction.mode === "drag" ? (dropHint?.rejected ?? "Release to place it here.") : interaction.mode === "resize" ? `${interaction.width} pixels${interaction.guide ? ` · snapped to ${interaction.guide}` : ""}` : ""}</p>
            <div className="studio-zoom" role="group" aria-label="Canvas camera"><Button size="icon" variant="Ghost" aria-label="Zoom out" onClick={() => setZoom(Math.max(.1, Math.round((zoom - .1) * 10) / 10))}><ZoomOut className="size-4" /></Button><span>{Math.round(zoom * 100)}%</span><Button size="icon" variant="Ghost" aria-label="Zoom in" onClick={() => setZoom(Math.min(4, Math.round((zoom + .1) * 10) / 10))}><ZoomIn className="size-4" /></Button><Button size="sm" variant="Ghost" onClick={() => { setZoom(1); setOffset({ x: 24, y: 24 }); }}>Reset view</Button><Button size="sm" variant="Ghost" disabled={dirty || busy || !!Object.keys(fieldDrafts).length} onClick={() => recover()}>Recover draft</Button></div>
          </div>
          <aside className={`studio-inspector ${inspector ? "studio-inspector-open" : ""}`} aria-label="Properties inspector">
            <div className="studio-panel-section"><h2>Properties</h2>{current && selectedAdapter ? <>
              <p className="studio-selection-label">{selected.length > 1 ? `${selected.length} layers selected` : selectedAdapter.label}</p>
              <p className="studio-muted">{current.ref}</p>
              <fieldset disabled={readOnly || preview || busy} className="studio-fields">
                {responsiveSelection && <div className="studio-field">
                  <Label htmlFor="studio-breakpoint">Edit at breakpoint</Label>
                  <NativeSelect id="studio-breakpoint" value={breakpoint} onChange={event => {
                    const next = BREAKPOINTS.find(item => item.id === event.target.value);
                    setBreakpoint(next?.id ?? "base");
                    if (next) chooseViewport(next.minWidth);
                  }}>
                    <option value="base">Base · all widths</option>
                    {BREAKPOINTS.map(item => <option key={item.id} value={item.id}>{item.label} · {item.minWidth}px and up</option>)}
                  </NativeSelect>
                </div>}
                {controls.filter(([key]) => !activeBreakpoint || canOverride(current.ref!, key)).map(([key, control]) => {
                  const values = selected.map(node => ({
                    ...adapterFor(node.ref!).defaults,
                    ...(activeBreakpoint ? responsiveProps(node, activeBreakpoint.minWidth) : node.props),
                  })[key]);
                  const mixed = values.some(value => value !== values[0]);
                  const value = fieldDrafts[key] ?? (mixed ? "" : String(values[0]));
                  const overridden = !!activeBreakpoint && Object.hasOwn(current.responsive?.[activeBreakpoint.id] ?? {}, key);
                  const sourceId = activeBreakpoint ? `studio-source-${key}` : undefined;
                  const inheritedBreakpoint = activeBreakpoint && [...BREAKPOINTS].reverse().find(item =>
                    item.minWidth < activeBreakpoint.minWidth && Object.hasOwn(current.responsive?.[item.id] ?? {}, key));
                  const apply = (v?: Props[string]) => {
                    if (activeBreakpoint) {
                      if (!perform({ type: "responsive", id: current.id, breakpoint: activeBreakpoint.id, property: key, value: v })) return;
                    } else if (v === undefined || !perform({ type: "props", ids: history.selection, patch: { [key]: v } })) return;
                    setFieldDrafts(d => { const next = { ...d }; delete next[key]; return next; });
                  };
                  return <div key={key} className="studio-field"><Label htmlFor={`studio-prop-${key}`}>{control.label}{mixed ? " · Mixed" : ""}</Label>
                    {control.type === "select" ? <NativeSelect id={`studio-prop-${key}`} aria-describedby={sourceId} value={mixed ? "" : String(values[0])} onChange={e => apply(e.target.value)}>{mixed && <option value="">Mixed</option>}{control.values?.map(v => <option key={v}>{v}</option>)}</NativeSelect>
                    : control.type === "boolean" ? <Checkbox id={`studio-prop-${key}`} checked={!mixed && Boolean(values[0])} onCheckedChange={checked => apply(checked === true)} />
                    : <div className="studio-field-input"><Input id={`studio-prop-${key}`} type={control.type === "number" ? "number" : "text"} aria-describedby={sourceId} min={control.min} max={control.max} value={value} maxLength={1000} placeholder={mixed ? "Mixed values" : undefined} onChange={e => setFieldDrafts(d => ({ ...d, [key]: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); apply(control.type === "number" ? Number(value) : value); } if (e.key === "Escape") setFieldDrafts(d => { const next = { ...d }; delete next[key]; return next; }); }} /><Button size="sm" variant="Ghost" disabled={!Object.hasOwn(fieldDrafts, key)} onClick={() => apply(control.type === "number" ? Number(value) : value)}>Apply</Button></div>}
                    {activeBreakpoint && <>
                      <p id={sourceId} className="studio-breakpoint-source">{overridden ? `Overridden at ${activeBreakpoint.label}` : `Inherited from ${inheritedBreakpoint?.label ?? "Base"}`}</p>
                      <Button size="sm" variant="Ghost" aria-label={`${overridden ? "Reset" : "Override"} ${control.label}`} onClick={() => apply(overridden ? undefined : values[0])}>{overridden ? "Reset to inherited" : "Override inherited value"}</Button>
                    </>}
                  </div>;
                })}
                <div className="studio-field"><Label htmlFor="studio-surface">Surface token</Label><NativeSelect id="studio-surface" value={current.tokenBindings?.background ?? ""} onChange={e => perform({ type: "bindings", ids: history.selection, patch: { background: e.target.value || undefined } })}><option value="">Inherit component default</option>{["color.background", "color.card", "color.muted", "color.primary"].map(v => <option key={v}>{v}</option>)}</NativeSelect></div>
                <div className="studio-reorder"><Button size="sm" variant="Outline" aria-label="Move layer up" onClick={() => reorder(-1)}><ArrowUp className="size-4" />Up</Button><Button size="sm" variant="Outline" aria-label="Move layer down" onClick={() => reorder(1)}><ArrowDown className="size-4" />Down</Button></div>
                <Label htmlFor="studio-destination">Move into container</Label><NativeSelect id="studio-destination" value={moveTarget} onChange={e => setMoveTarget(e.target.value)}><option value="">Choose destination</option>{containers.filter(row => !history.selection.includes(row.node.id)).map(({ node }) => <option value={node.id} key={node.id}>{nodeLabel(node)} · {node.id}</option>)}</NativeSelect><Button size="sm" variant="Outline" disabled={!moveTarget} onClick={() => perform({ type: "move", ids: history.selection, parentId: moveTarget, index: 0 })}>Move selected layers</Button>
                <Button variant="Ghost" onClick={() => perform({ type: "delete", ids: history.selection })}><Trash2 className="size-4" />Delete selected</Button>
              </fieldset>
            </> : <div className="studio-inspector-empty"><MousePointer2 className="size-6" /><h3>Make it yours.</h3><p>Select a layer to edit its properties, layout and token bindings.</p></div>}</div>
          </aside>
        </div>
      </> : <div className="studio-welcome"><h2>Start with one product.</h2><p>Give it a name above. Add as many screens as your idea needs within the supported document limits.</p></div>}
      {!history && error && <p className="studio-error" role="alert">{error}</p>}
    </>}
    <Dialog open={upgrade} onOpenChange={setUpgrade}><DialogContent className="studio-dialog" onCloseAutoFocus={e => { e.preventDefault(); dialogReturnFocus.current?.focus(); }}><DialogHeader><DialogTitle>More products, when you’re ready.</DialogTitle><DialogDescription>Your free plan includes one product with multiple pages and screens. Your existing product remains editable. A paid subscription unlocks additional products.</DialogDescription></DialogHeader><p>Checkout is not configured in this local development build. No payment information is collected.</p><Button onClick={() => setUpgrade(false)}>Keep designing my product</Button></DialogContent></Dialog>
    <Dialog open={exportOpen} onOpenChange={setExportOpen}><DialogContent className="studio-dialog max-w-3xl" onCloseAutoFocus={e => { e.preventDefault(); dialogReturnFocus.current?.focus(); }}><DialogHeader><DialogTitle>Your React source</DialogTitle><DialogDescription>Generated from supported components. Imports the real KinetixUI library. React only; this download has not been built by a hosted service.</DialogDescription></DialogHeader><pre className="studio-export-code" tabIndex={0} aria-label="Generated React source">{exportSource}</pre><div className="studio-export-actions"><Button onClick={() => download("design.tsx", exportSource)}>Download React</Button><Button variant="Outline" onClick={() => download("theme.css", exportReact(history!.doc).theme)}>Theme CSS</Button><Button variant="Outline" onClick={() => download("README.md", exportReact(history!.doc).readme)}>Setup instructions</Button><Button variant="Ghost" onClick={() => download("create-project.json", serializeDocument(history!.doc))}>Document JSON</Button></div></DialogContent></Dialog>
  </section>;
}
