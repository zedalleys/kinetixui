"use client";
import * as React from "react";
import { Button, Input, Label, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Tabs, TabsList, TabsTrigger, TabsContent } from "@kinetixui/ui";
import type { Node } from "@/lib/create-studio/model";
import { adapterFor } from "@/lib/create-studio/registry";
import { nodeStyle } from "@/lib/create-studio/presentation";
export type ResizeHandling = {
  /** The node being resized and the width it would take; the document is not written until release. */
  active: { nodeId: string; width: number } | null;
  limits: { min: number; max: number };
  onStart: (id: string, width: number, event: React.PointerEvent) => void;
  /** The keyboard path: the same width-setting function the pointer commits to. */
  onSet: (id: string, width: number) => void;
};
export function NodeView({ node, selection, onSelect, onNodePointerDown, dropParentId, resize, preview = false, editWidth, dir }: { node: Node; selection: string[]; onSelect: (id: string, additive: boolean) => void; onNodePointerDown?: (id: string, event: React.PointerEvent) => void; dropParentId?: string | null; resize?: ResizeHandling; preview?: boolean; editWidth?: number; dir?: "ltr" | "rtl" }) {
  const children = (node.children ?? []).map(child => <NodeView key={child.id} node={child} selection={selection} onSelect={onSelect} onNodePointerDown={onNodePointerDown} dropParentId={dropParentId} resize={resize} preview={preview} editWidth={editWidth} dir={dir} />);
  if (node.kind === "slot") return <>{children}</>;
  const adapter = adapterFor(node.ref!);
  const p = { ...adapter.defaults, ...node.props };
  const style = nodeStyle(node, editWidth);
  // Live resize feedback without touching the document: the committed width arrives through the
  // ordinary `props`/`responsive` command only when the pointer is released.
  if (resize?.active?.nodeId === node.id) style.width = resize.active.width;
  const resizable = !preview && !!resize && node.ref === "layout:section" && p.widthMode !== "fill" && selection.includes(node.id);
  const currentWidth = Number(resize?.active?.nodeId === node.id ? resize.active.width : p.width);
  const layoutId = node.responsive ? node.id : undefined;
  let content: React.ReactNode;
  switch (node.ref) {
    case "layout:section": content = <section aria-label={String(p.name)} style={style} data-kx-layout={layoutId} className={preview ? undefined : "studio-frame"}>{preview || children.length ? children : <p className="studio-empty">Add a component from the library to start this screen.</p>}</section>; break;
    case "layout:stack": case "layout:grid": content = <div style={style} data-kx-layout={layoutId} className={!preview && !children.length ? "studio-layout-empty" : undefined}>{preview || children.length ? children : <span className="studio-muted">Empty {adapter.label.toLowerCase()}</span>}</div>; break;
    case "component:Button": content = <Button variant={p.variant as "Primary"} size={p.size as "md"} disabled={Boolean(p.disabled)} style={style}>{String(p.text)}</Button>; break;
    case "component:Input": content = <div style={style}><Label htmlFor={node.id}>{String(p.label)}</Label><Input id={node.id} placeholder={String(p.placeholder)} disabled={Boolean(p.disabled)} /></div>; break;
    case "component:Badge": content = <Badge variant={p.variant as "default"} style={style}>{String(p.text)}</Badge>; break;
    case "component:Card": content = <Card style={style}><CardHeader><CardTitle>{String(p.title)}</CardTitle><CardDescription>{String(p.description)}</CardDescription></CardHeader><CardContent>{children}</CardContent></Card>; break;
    case "component:Tabs": content = <Tabs defaultValue="first" style={style} dir={dir}><TabsList aria-label="Content views"><TabsTrigger value="first">{String(p.firstLabel)}</TabsTrigger><TabsTrigger value="second">{String(p.secondLabel)}</TabsTrigger></TabsList><TabsContent value="first">{String(p.firstContent)}</TabsContent><TabsContent value="second">{String(p.secondContent)}</TabsContent></Tabs>; break;
    default: content = <p role="alert">This component cannot be rendered.</p>;
  }
  if (preview) return <div style={{ minWidth: 0 }}><div>{content}</div></div>;
  return <div data-studio-node={node.id} data-studio-drop={adapter.container ? node.id : undefined} className={`studio-node ${selection.includes(node.id) && !preview ? "studio-node-selected" : ""} ${dropParentId === node.id ? "studio-node-drop" : ""}`} onPointerDownCapture={preview ? undefined : event => {
    // The canvas owns the press: library controls inside the artboard must not take it, and a press
    // that becomes a drag must not also start a text selection.
    event.preventDefault();
    // The resize handle is the one child of a node that owns its own gesture. Without this, the
    // wrapper's capture-phase handler claims the press as a move-drag and the handle's own
    // pointerdown is then refused by the machine's one-gesture-at-a-time rule.
    if ((event.target as HTMLElement).closest("[data-studio-resize]")) return;
    const nearest = (event.target as HTMLElement).closest("[data-studio-node]");
    if (nearest?.getAttribute("data-studio-node") === node.id) onNodePointerDown?.(node.id, event);
  }} onClickCapture={preview ? undefined : event => {
    // Stop at the deepest editor-owned wrapper, including disabled library controls.
    const nearest = (event.target as HTMLElement).closest("[data-studio-node]");
    if (nearest?.getAttribute("data-studio-node") !== node.id) return;
    event.preventDefault(); event.stopPropagation(); onSelect(node.id, event.shiftKey);
  }}>
    <div inert={!preview && !adapter.container ? true : undefined}>{content}</div>
    {resizable && <div
      role="slider"
      tabIndex={0}
      aria-label={`${String(p.name)} frame width`}
      aria-orientation="horizontal"
      aria-valuemin={resize!.limits.min}
      aria-valuemax={resize!.limits.max}
      aria-valuenow={currentWidth}
      aria-valuetext={`${currentWidth} pixels`}
      className="studio-resize-handle"
      data-studio-resize={node.id}
      // The handle belongs on the FRAME's own edge, not on its wrapper's. The wrapper is a full-width
      // block, so an `inset-inline-end` handle floats far to the right of a narrow frame — measured,
      // and unreachable by a pointer once it leaves the visible canvas. `min()` also follows the
      // frame's own `max-width:100%` cap.
      style={{ insetInlineStart: `min(100%, ${currentWidth}px)` }}
      onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); event.stopPropagation(); resize!.onStart(node.id, currentWidth, event); }}
      onClick={event => { event.preventDefault(); event.stopPropagation(); }}
      onKeyDown={event => {
        // The keyboard equivalent of dragging the edge. Direction follows the document, so Right
        // always grows the frame in a left-to-right document and shrinks it in a right-to-left one.
        const step = event.shiftKey ? 10 : 1;
        const towardsEnd = dir === "rtl" ? -1 : 1;
        const next = event.key === "ArrowRight" ? currentWidth + step * towardsEnd
          : event.key === "ArrowLeft" ? currentWidth - step * towardsEnd
          : event.key === "Home" ? resize!.limits.min
          : event.key === "End" ? resize!.limits.max
          : null;
        if (next === null) return;
        event.preventDefault(); event.stopPropagation();
        resize!.onSet(node.id, Math.min(resize!.limits.max, Math.max(resize!.limits.min, next)));
      }}
    />}
  </div>;
}
