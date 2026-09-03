"use client";

import * as React from "react";
import { ImageOff } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * Image — a ratio-locked image with a muted placeholder while loading and a
 * fallback on error (presets 1:1 / 3:2 / 4:3 / 3:4 / 3:1 / 16:9). Pass
 * `ratio` as a preset string or a number (w / h).
 */
const RATIOS: Record<string, number> = {
  "1:1": 1,
  "3:2": 3 / 2,
  "4:3": 4 / 3,
  "3:4": 3 / 4,
  "3:1": 3,
  "16:9": 16 / 9,
};

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  ratio?: keyof typeof RATIOS | number;
  rounded?: boolean;
  fallback?: React.ReactNode;
}

const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  ({ ratio = "1:1", rounded = true, fallback, className, alt = "", onLoad, onError, ...props }, forwardedRef) => {
    const [status, setStatus] = React.useState<"loading" | "loaded" | "error">("loading");
    const innerRef = React.useRef<HTMLImageElement | null>(null);
    const setRef = React.useCallback(
      (node: HTMLImageElement | null) => {
        innerRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLImageElement | null>).current = node;
      },
      [forwardedRef],
    );
    const r = typeof ratio === "number" ? ratio : (RATIOS[ratio] ?? 1);

    // A cached image can finish loading before React attaches onLoad (notably
    // after hydration of a statically-rendered page) — reconcile on mount.
    React.useEffect(() => {
      const img = innerRef.current;
      if (!img) return;
      if (img.complete) setStatus(img.naturalWidth > 0 ? "loaded" : "error");
    }, [props.src]);

    return (
      <div
        className={cn(
          "relative w-full overflow-hidden bg-muted",
          rounded && "rounded-md",
          className,
        )}
        style={{ aspectRatio: r }}
      >
        {status === "error" ? (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground">
            {fallback ?? <ImageOff className="size-6" />}
          </div>
        ) : (
          <img
            ref={setRef}
            alt={alt}
            className={cn(
              "size-full object-cover transition-opacity duration-300",
              status === "loaded" ? "opacity-100" : "opacity-0",
            )}
            onLoad={(e) => {
              setStatus("loaded");
              onLoad?.(e);
            }}
            onError={(e) => {
              setStatus("error");
              onError?.(e);
            }}
            {...props}
          />
        )}
      </div>
    );
  },
);
Image.displayName = "Image";

export { Image };
