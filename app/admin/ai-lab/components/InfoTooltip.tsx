"use client";

import { Info } from "lucide-react";
import { MouseEvent } from "react";

interface InfoTooltipProps {
  text: string;
  className?: string;
}

export function InfoTooltip({ text, className }: InfoTooltipProps) {
  const stopLabelActivation = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <span
      className={`group relative inline-flex items-center ${
        className ?? ""
      }`.trim()}
    >
      <button
        type="button"
        aria-label={text}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:text-slate-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-blue-400"
        onClick={stopLabelActivation}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <Info size={14} aria-hidden="true" />
      </button>
      <span className="pointer-events-none absolute left-1/2 top-[125%] z-30 hidden w-64 -translate-x-1/2 rounded-md bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-xl ring-1 ring-slate-800 group-hover:flex group-focus-within:flex">
        {text}
      </span>
    </span>
  );
}
