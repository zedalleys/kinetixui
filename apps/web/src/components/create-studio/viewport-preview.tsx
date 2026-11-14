"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import type { Node } from "@/lib/create-studio/model";
import { responsiveCss } from "@/lib/create-studio/presentation";
import { NodeView } from "./node-view";

const shell = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Screen preview</title></head><body></body></html>';
const noop = () => {};

export function ViewportPreview({
  root, height, dark, rtl, theme, onExit,
}: {
  root: Node;
  height: number;
  dark: boolean;
  rtl: boolean;
  theme: React.CSSProperties;
  onExit: () => void;
}) {
  const [body, setBody] = React.useState<HTMLElement | null>(null);
  const css = React.useMemo(() => responsiveCss([root]), [root]);

  function load(frame: HTMLIFrameElement) {
    const target = frame.contentDocument;
    if (!target?.body) return;
    // Only copy the host's stylesheets. The iframe contains no host markup or scripts.
    for (const stylesheet of document.head.querySelectorAll('link[rel="stylesheet"], style')) {
      target.head.append(target.importNode(stylesheet, true));
    }
    const sans = getComputedStyle(document.documentElement).getPropertyValue("--font-sans");
    target.documentElement.style.setProperty("--font-sans", sans || "Inter, system-ui, sans-serif");
    setBody(target.body);
  }

  React.useEffect(() => {
    if (!body) return;
    body.ownerDocument.documentElement.dir = rtl ? "rtl" : "ltr";
    body.ownerDocument.documentElement.className = dark ? "dark" : "theme-light";
  }, [body, dark, rtl]);

  React.useEffect(() => {
    if (!body) return;
    const frameDocument = body.ownerDocument;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      onExit();
    };
    frameDocument.addEventListener("keydown", handleEscape);
    return () => frameDocument.removeEventListener("keydown", handleEscape);
  }, [body, onExit]);

  return <>
    <iframe
      title="Screen preview"
      className="studio-preview-frame"
      sandbox="allow-same-origin"
      srcDoc={shell}
      style={{ height }}
      onLoad={event => load(event.currentTarget)}
    />
    {body && createPortal(<>
      <style>{`html,body{margin:0} .kinetix-product{min-height:100vh;font-family:var(--font-sans);background:hsl(var(--background));color:hsl(var(--foreground))} ${css}`}</style>
      <main className="kinetix-product" style={theme} onKeyDown={event => {
        // Escape belongs to the frame document, including when its body is focused.
        if (event.key !== "Escape") event.stopPropagation();
      }} onPointerDown={event => event.stopPropagation()}>
        <NodeView node={root} selection={[]} onSelect={noop} dir={rtl ? "rtl" : "ltr"} preview />
      </main>
    </>, body)}
  </>;
}
