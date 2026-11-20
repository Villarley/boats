import { appCopy } from "@/lib/copy.app";

/** Card-style text field for a first name (same look as the fund name field in Create). */
export function NameField({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <label className="block rounded-card bg-card px-4 py-3 text-left">
      <span className="text-[13px] font-medium text-muted">{appCopy.name.label}</span>
      <input
        className="mt-1 block w-full bg-transparent text-[20px] font-semibold outline-none placeholder:text-faint"
        value={value}
        placeholder={appCopy.name.placeholder}
        autoComplete="given-name"
        autoCapitalize="words"
        autoFocus={autoFocus}
        maxLength={24}
        onChange={(e) => onChange(e.target.value)}
        data-testid="name-input"
      />
    </label>
  );
}
