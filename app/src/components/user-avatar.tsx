import Link from "next/link";
import { appCopy } from "@/lib/copy.app";

/** The signed-in person: initial on card-2. Opens the profile (Profile is not a tab). */
export function UserAvatar({ name, href = "/me", dot, manager, size = 38 }: { name: string; href?: string | null; dot?: boolean; manager?: boolean; size?: number }) {
  const cls = `relative grid flex-none place-items-center rounded-full bg-card-2 text-[16px] font-semibold text-ink ${manager ? "shadow-[0_0_0_2.5px_var(--bt-navy)]" : ""}`;
  const inner = (
    <>
      {name.slice(0, 1).toUpperCase()}
      {dot && <span className="absolute right-px top-px size-[9px] rounded-full border-2 border-white bg-loss" aria-hidden />}
    </>
  );
  if (!href) return <span className={cls} style={{ width: size, height: size }} aria-hidden>{inner}</span>;
  return (
    <Link href={href} className={cls} style={{ width: size, height: size }} aria-label={appCopy.nav.openProfile} data-testid="avatar">
      {inner}
    </Link>
  );
}
