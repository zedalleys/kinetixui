"use client";

import * as React from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { cn } from "../lib/utils";
import { Slider } from "./slider";

/**
 * AudioPlayer — interactive playback controls (design source: Capi "Audio
 * player", Full + Mini). Wraps a native <audio> element: play / pause, scrubber
 * with time, ±10s skip, and optional prev / next track callbacks.
 */
export interface AudioPlayerProps extends React.HTMLAttributes<HTMLDivElement> {
  src: string;
  variant?: "full" | "mini";
  title?: string;
  artist?: string;
  coverSrc?: string;
  /** ±10s skip step, seconds */
  skipBy?: number;
  onPrev?: () => void;
  onNext?: () => void;
}

function fmt(t: number) {
  if (!Number.isFinite(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const AudioPlayer = React.forwardRef<HTMLDivElement, AudioPlayerProps>(
  ({ src, variant = "full", title, artist, coverSrc, skipBy = 10, onPrev, onNext, className, ...props }, ref) => {
    const audioRef = React.useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = React.useState(false);
    const [current, setCurrent] = React.useState(0);
    const [duration, setDuration] = React.useState(0);

    const toggle = () => {
      const a = audioRef.current;
      if (!a) return;
      if (a.paused) void a.play();
      else a.pause();
    };
    const seek = (t: number) => {
      const a = audioRef.current;
      if (a) a.currentTime = Math.max(0, Math.min(duration || 0, t));
    };
    const skip = (delta: number) => seek(current + delta);

    const audio = (
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
      />
    );

    const PlayPause = ({ size = 44 }: { size?: number }) => (
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className="grid shrink-0 place-items-center rounded-full bg-primary text-primary-foreground outline-none transition-transform hover:scale-105 focus-visible:shadow-focus"
        style={{ width: size, height: size }}
      >
        {playing ? <Pause className="size-1/3 fill-current" /> : <Play className="size-1/3 translate-x-px fill-current" />}
      </button>
    );

    const iconBtn =
      "grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:text-foreground disabled:opacity-40 [&>svg]:size-4";

    if (variant === "mini") {
      const pct = duration ? (current / duration) * 100 : 0;
      return (
        <div
          ref={ref}
          className={cn(
            "relative flex w-full max-w-[360px] items-center gap-3 overflow-hidden rounded-full border border-border bg-background p-2 pl-3 font-sans",
            className,
          )}
          {...props}
        >
          {audio}
          {coverSrc ? (
            <img src={coverSrc} alt="" className="size-10 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="size-10 shrink-0 rounded-full bg-muted" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-label-md font-semibold text-foreground">{title ?? "Audio"}</p>
            {artist && <p className="truncate text-body-sm text-muted-foreground">{artist}</p>}
          </div>
          <button type="button" onClick={() => skip(skipBy)} aria-label={`Forward ${skipBy}s`} className={iconBtn}>
            <SkipForward />
          </button>
          <PlayPause size={36} />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-muted">
            <div className="h-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn("flex w-full max-w-[360px] flex-col gap-2 font-sans", className)}
        {...props}
      >
        {audio}
        <Slider
          value={[current]}
          max={duration || 1}
          step={0.5}
          onValueChange={(vals) => seek(vals[0] ?? 0)}
          aria-label="Seek"
        />
        <div className="flex justify-between text-body-sm text-muted-foreground">
          <span>{fmt(current)}</span>
          <span>{fmt(duration)}</span>
        </div>
        <div className="mt-1 flex items-center justify-center gap-3">
          <button type="button" onClick={onPrev} disabled={!onPrev} aria-label="Previous track" className={iconBtn}>
            <SkipBack className="fill-current" />
          </button>
          <button type="button" onClick={() => skip(-skipBy)} aria-label={`Back ${skipBy}s`} className={iconBtn}>
            <SkipBack />
          </button>
          <PlayPause />
          <button type="button" onClick={() => skip(skipBy)} aria-label={`Forward ${skipBy}s`} className={iconBtn}>
            <SkipForward />
          </button>
          <button type="button" onClick={onNext} disabled={!onNext} aria-label="Next track" className={iconBtn}>
            <SkipForward className="fill-current" />
          </button>
        </div>
      </div>
    );
  },
);
AudioPlayer.displayName = "AudioPlayer";

export { AudioPlayer };
