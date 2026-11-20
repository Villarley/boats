"use client";
import { useState } from "react";
import { Copy, MessageCircle, ShieldCheck, Clock } from "lucide-react";
import { Button, Card, Meta, Sample, Screen } from "@/components/ui";
import { useStore } from "@/lib/store";
import { worstCase } from "@/lib/boat";
import { pct } from "@/lib/format";

export default function Invite() {
  const { boats } = useStore();
  const b = boats.find((x) => x.position.isCaptain) ?? boats[0];
  const [copied, setCopied] = useState(false);
  const msg = `Mamá, te guardé un lugar en mi bote. Lo peor que puede pasar es que pierdas ${b ? pct(worstCase(b).bps) : "1%"}.`;
  const link = typeof window !== "undefined" && b ? `${location.origin}/boat/${b.address}` : "";
  return (
    <Screen back title={<span className="flex items-center gap-2">Save Mom a seat. <Sample /></span>}>
      <p className="text-ink-2 -mt-2">She sees the rules and the worst case before she puts in a dollar.</p>
      {b && (
        <Card>
          <div className="font-semibold">{b.name}</div>
          <div className="flex gap-3 mt-1"><Meta icon={ShieldCheck}>Worst case {pct(-worstCase(b).bps)}</Meta><Meta icon={Clock}>Link valid 48 h</Meta></div>
        </Card>
      )}
      <Card><div className="label mb-1">Message</div><p>{msg}</p></Card>
      <Button icon={MessageCircle} href={`https://wa.me/?text=${encodeURIComponent(`${msg} ${link}`)}`}>Send on WhatsApp</Button>
      <Button variant="secondary" icon={Copy} onClick={() => { navigator.clipboard?.writeText(`${msg} ${link}`); setCopied(true); }}>{copied ? "Copied" : "Copy link"}</Button>
    </Screen>
  );
}
