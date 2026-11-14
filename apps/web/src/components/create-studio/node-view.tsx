"use client";
import * as React from "react";
import { Button, Input, Label, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Tabs, TabsList, TabsTrigger, TabsContent } from "@kinetixui/ui";
import type { Node } from "@/lib/create-studio/model";
import { adapterFor } from "@/lib/create-studio/registry";
import { nodeStyle } from "@/lib/create-studio/presentation";
export function NodeView({ node, selection, onSelect, onNodePointerDown, dropParentId, preview = false, editWidth, dir }: { node: Node; selection: string[]; onSelect: (id: string, additive: boolean) => void; onNodePointerDown?: (id: string, event: React.PointerEvent) => void; dropParentId?: string | null; preview?: boolean; editWidth?: number; dir?: "ltr" | "rtl" }) {
  const children = (node.children ?? []).map(child => <NodeView key={child.id} node={child} selection={selection} onSelect={onSelect} onNodePointerDown={onNodePointerDown} dropParentId={dropParentId} preview={preview} editWidth={editWidth} dir={dir} />);
  if (node.kind === "slot") return <>{children}</>;
  const adapter = adapterFor(node.ref!);
  const p = { ...adapter.defaults, ...node.props };
  const style = nodeStyle(node, editWidth);
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
    const nearest = (event.target as HTMLElement).closest("[data-studio-node]");
    if (nearest?.getAttribute("data-studio-node") === node.id) onNodePointerDown?.(node.id, event);
  }} onClickCapture={preview ? undefined : event => {
    // Stop at the deepest editor-owned wrapper, including disabled library controls.
    const nearest = (event.target as HTMLElement).closest("[data-studio-node]");
    if (nearest?.getAttribute("data-studio-node") !== node.id) return;
    event.preventDefault(); event.stopPropagation(); onSelect(node.id, event.shiftKey);
  }}>
    <div inert={!preview && !adapter.container ? true : undefined}>{content}</div>
  </div>;
}
