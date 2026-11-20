import Link from "next/link";
import { BOATS_WORD, Flag } from "@/components/flags";

export default function NotFound() {
  return (
    <main className="screen screen-navy flex flex-col justify-center gap-4" style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="flex gap-1">{BOATS_WORD.map((c) => <Flag key={c} code={c} size={16} />)}</div>
      <h1 className="bt-title text-[2rem] leading-tight">This page sailed off.</h1>
      <p className="opacity-80">The link may be wrong. Your money is where you left it.</p>
      <Link href="/home" className="btn bg-white text-[#0B1A30] mt-2">Back to my money</Link>
    </main>
  );
}
