import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { appCopy } from "@/lib/copy.app";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-4 px-5">
      <div className="text-ink"><Wordmark width={112} /></div>
      <h1 className="text-[30px] font-bold leading-[1.15] tracking-[-0.01em]">{appCopy.notFound.title}</h1>
      <p className="text-[16px] text-muted">{appCopy.notFound.body}</p>
      <Link href="/home" className="mt-2 inline-flex h-[52px] items-center justify-center rounded-full bg-signal text-[16px] font-semibold text-white">{appCopy.notFound.cta}</Link>
    </main>
  );
}
