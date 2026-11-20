"use client";
import { useState } from "react";
import { Page } from "@/components/top-bar";
import { ListGroup, ListRow, TitleRow } from "@/components/list-group";
import { Proof } from "@/components/proof";
import { WebTopBar } from "@/components/web-top-bar";
import { BlockedSheet, type BlockedEvent } from "@/components/blocked-sheet";
import { useActivityItems, type ActivityEntry } from "@/components/activity-items";
import { appCopy } from "@/lib/copy.app";

const A = appCopy.activityPage;

export default function ActivityPage() {
  const { yours, everyone, stopped } = useActivityItems();
  const [sheet, setSheet] = useState<BlockedEvent | null>(null);

  const row = (i: ActivityEntry) => <ListRow key={i.key} dense leading={i.tile} title={i.title} sub={<span className="flex flex-wrap gap-x-3">{i.sub}<Proof hash={i.hash} /></span>} />;

  return (
    <Page web="wide" testId="activity">
      <WebTopBar title={A.title} />
      <h1 className="mt-4 text-[34px] font-bold leading-[1.15] tracking-[-0.01em] lg:hidden">{A.title}</h1>
      {stopped.length > 0 && (
        <ListGroup className="mt-4">
          {stopped.map((e) => (
            <ListRow key={e.key} dense testId="blocked-row" leading={e.tile} title={e.title}
              sub={e.at ? e.sub : <Proof hash={e.hash} />} onClick={e.blocked ? () => setSheet(e.blocked!) : undefined} />
          ))}
        </ListGroup>
      )}
      <TitleRow title={A.yours} />
      {yours.length ? <ListGroup>{yours.slice(0, 12).map(row)}</ListGroup> : <p className="rounded-card bg-card px-4 py-3.5 text-[14px] text-muted">{A.empty}</p>}
      {everyone.length > 0 && (
        <>
          <TitleRow title={A.everyone} />
          <ListGroup testId="live-feed">{everyone.slice(0, 12).map(row)}</ListGroup>
        </>
      )}
      <p className="mb-6 mt-4 text-center text-[13px] text-muted">{A.quiet}</p>
      <BlockedSheet event={sheet} onClose={() => setSheet(null)} />
    </Page>
  );
}
