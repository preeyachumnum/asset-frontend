"use client";

import { ChangeEvent, useRef } from "react";

type UploadFileControlProps = {
  id: string;
  label: string;
  fileLabel: string;
  accept?: string;
  buttonText?: string;
  helperText?: string;
  onFileChange: (file: File | null, event: ChangeEvent<HTMLInputElement>) => void;
};

export function UploadFileControl({
  id,
  label,
  fileLabel,
  accept,
  buttonText = "เลือกไฟล์",
  helperText,
  onFileChange,
}: UploadFileControlProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="rounded-xl border border-[#d5e4f2] bg-[#f8fbff] p-3">
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-[#355b7f]">
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        className="hidden"
        type="file"
        accept={accept}
        onChange={(event) => onFileChange(event.target.files?.[0] || null, event)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-10 items-center rounded-lg border border-[#8fb4d7] bg-white px-3.5 text-sm font-semibold text-[#1f517a] transition hover:border-[#5f95c8] hover:bg-[#edf5ff]"
        >
          {buttonText}
        </button>
        <span className="max-w-[65%] truncate text-sm text-[#315271]">{fileLabel}</span>
      </div>
      {helperText ? <p className="muted mt-2 text-xs">{helperText}</p> : null}
    </div>
  );
}
