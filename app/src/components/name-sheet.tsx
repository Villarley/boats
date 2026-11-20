"use client";
import { useEffect, useState } from "react";
import { Sheet } from "./sheet";
import { Button } from "./button";
import { NameField } from "./name-field";
import { appCopy } from "@/lib/copy.app";

const N = appCopy.name;

/** Asks (or changes) the name shown for this account. Kept on this device. */
export function NameSheet({ open, initial = "", onSave, onClose }: { open: boolean; initial?: string; onSave: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState(initial);
  useEffect(() => { if (open) setName(initial); }, [open, initial]);
  const ok = name.trim().length > 0;
  return (
    <Sheet open={open} onClose={onClose} title={N.title} testId="name-sheet" closeLabel={N.later}>
      <p className="mt-2 text-[15px] leading-[1.45] text-muted">{N.sub}</p>
      <form className="mt-4 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (ok) onSave(name); }}>
        <NameField value={name} onChange={setName} autoFocus />
        <Button type="submit" disabled={!ok} testId="save-name">{N.save}</Button>
      </form>
    </Sheet>
  );
}
