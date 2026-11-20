"use client";
import { useState } from "react";
import { Copy, MessageCircle, ShieldCheck, Anchor } from "lucide-react";
import { Button, Card, Meta, Screen } from "@/components/ui";
import { useStore } from "@/lib/store";
import { deployment } from "@/lib/deployment";
import { worstCase } from "@/lib/boat";
import { pct } from "@/lib/format";

export default function Invite() {
  const { boats } = useStore();
  // Invite to a boat that is still boarding: yours if you captain one, else the safest open one.
  const open = boats.filter((x) => x.state === "Open");
  const featured = new Set(deployment.boats.map((x) => x.address.toLowerCase()));
  const b = open.find((x) => x.position.isCaptain) ?? [...open].sort((x, y) => Number(featured.has(y.address.toLowerCase())) - Number(featured.has(x.address.toLowerCase())) || worstCase(x).bps - worstCase(y).bps)[0];
  const [copied, setCopied] = useState(false);
  const msg = `Mamá, te guardé un lugar en mi bote. Lo peor que puede pasar es que pierdas ${b ? pct(worstCase(b).bps) : "1%"}.`;
  const link = typeof window !== "undefined" && b ? `${location.origin}/boat/${b.address}` : "";
  return (
    <Screen back title={"Save Mom a seat."}>
      <p className="text-ink-2 -mt-2">She sees the rules and the worst case before she puts in a dollar.</p>
      {b && (
        <Card>
          <div className="font-semibold">{b.name}</div>
          <div className="flex gap-3 mt-1"><Meta icon={ShieldCheck}>Worst case {pct(-worstCase(b).bps)}</Meta><Meta icon={Anchor}>Boarding now</Meta></div>
        </Card>
      )}
      <Card><div className="label mb-1">Message</div><p>{msg}</p></Card>
      <Button icon={MessageCircle} href={`https://wa.me/?text=${encodeURIComponent(`${msg} ${link}`)}`}>Send on WhatsApp</Button>
      <Button variant="secondary" icon={Copy} onClick={() => { navigator.clipboard?.writeText(`${msg} ${link}`); setCopied(true); }}>{copied ? "Copied" : "Copy link"}</Button>
    </Screen>
  );
}
