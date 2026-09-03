"use client";

import * as React from "react";
import { File, Loader2, TriangleAlert, Upload, X } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./button";

/**
 * FileUpload — a drag-and-drop zone plus file list, single or multiple.
 * Upload logic (network, storage) is the consumer's — this component is
 * presentational: it reports picked files via `onFilesSelected` and renders
 * whatever `files` list you hand back, each carrying its own status.
 */
export interface UploadFile {
  id: string;
  name: string;
  size?: number;
  status?: "loading" | "uploaded" | "error";
  progress?: number;
  error?: string;
}

function formatBytes(bytes?: number) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export interface FileUploadProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onDrop"> {
  multiple?: boolean;
  accept?: string;
  disabled?: boolean;
  helperText?: React.ReactNode;
  buttonLabel?: React.ReactNode;
  files?: UploadFile[];
  onFilesSelected?: (files: File[]) => void;
  onRemove?: (id: string) => void;
  onRetry?: (id: string) => void;
}

const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  (
    { className, multiple, accept, disabled, helperText, buttonLabel = "Browse files", files = [], onFilesSelected, onRemove, onRetry, ...props },
    ref,
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = React.useState(false);

    const pick = (list: FileList | null) => {
      if (!list || !list.length) return;
      onFilesSelected?.(Array.from(list));
    };

    return (
      <div ref={ref} className={cn("flex w-full flex-col gap-3 font-sans", className)} {...props}>
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (!disabled && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!disabled) pick(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center gap-2 rounded-md border border-dashed border-input p-6 text-center outline-none transition-colors",
            !disabled && "cursor-pointer hover:bg-accent/50 focus-visible:shadow-focus",
            dragging && "border-primary bg-accent",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <Upload className="size-6 text-muted-foreground" aria-hidden />
          <p className="text-body-sm text-muted-foreground">Drag &amp; drop {multiple ? "files" : "a file"} here, or</p>
          <Button
            type="button"
            variant="Outline"
            size="sm"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            {buttonLabel}
          </Button>
          {helperText && <p className="text-body-sm text-muted-foreground">{helperText}</p>}
          <input
            ref={inputRef}
            type="file"
            multiple={multiple}
            accept={accept}
            disabled={disabled}
            className="sr-only"
            onChange={(e) => {
              pick(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {files.length > 0 && (
          <ul className="flex flex-col gap-2">
            {files.map((f) => (
              <FileUploadItem key={f.id} file={f} onRemove={onRemove} onRetry={onRetry} />
            ))}
          </ul>
        )}
      </div>
    );
  },
);
FileUpload.displayName = "FileUpload";

export interface FileUploadItemProps {
  file: UploadFile;
  onRemove?: (id: string) => void;
  onRetry?: (id: string) => void;
}

function FileUploadItem({ file, onRemove, onRetry }: FileUploadItemProps) {
  const isError = file.status === "error";
  const isLoading = file.status === "loading";
  return (
    <li className={cn("flex items-center gap-2.5 rounded-md border p-2.5 text-body-sm", isError ? "border-destructive bg-destructive/5" : "border-input")}>
      {isLoading ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
      ) : isError ? (
        <TriangleAlert className="size-4 shrink-0 text-destructive" aria-hidden />
      ) : (
        <File className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-foreground">{file.name}</p>
        {isError && file.error ? <p className="text-destructive">{file.error}</p> : <p className="text-muted-foreground">{formatBytes(file.size)}</p>}
        {isLoading && typeof file.progress === "number" && (
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-[width]" style={{ width: `${Math.max(0, Math.min(100, file.progress))}%` }} />
          </div>
        )}
      </div>
      {isError && onRetry && (
        <button
          type="button"
          onClick={() => onRetry(file.id)}
          className="shrink-0 text-label-md font-medium text-primary underline-offset-2 outline-none hover:underline focus-visible:underline"
        >
          Retry
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(file.id)}
          aria-label={`Remove ${file.name}`}
          className="shrink-0 rounded-[2px] p-0.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-current"
        >
          <X className="size-3.5" />
        </button>
      )}
    </li>
  );
}
FileUploadItem.displayName = "FileUploadItem";

export { FileUpload, FileUploadItem, formatBytes };
