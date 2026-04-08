import React from 'react';

interface ScratchpadProps {
  label?: string;
  placeholder?: string;
}

export function Scratchpad({ label = "Temporary Source Notes", placeholder = "Paste raw text here..." }: ScratchpadProps) {
  return (
    <div className="space-y-2 p-4 bg-neutral-950/50 border border-dashed border-neutral-700 rounded-xl">
      <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{label}</label>
      <textarea
        className="w-full bg-transparent text-sm text-neutral-300 focus:outline-none placeholder-neutral-700"
        rows={3}
        placeholder={placeholder}
      />
    </div>
  );
}
