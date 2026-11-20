"use client";
import { CaretRight, ChartLineUp, CheckCircle, ShieldCheck } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Badge } from "../badge";
import { Button } from "../button";
import { IconTile, ListGroup, ListRow } from "../list-group";
import { BackButton, TopBar } from "../top-bar";
import { MockActions, MockPage } from "./mock-shell";
import { copy } from "@/lib/copy";
import { mockCopy } from "@/lib/copy.mock";
import { mockData } from "@/lib/mock-data";

type Step = (typeof mockData.application.steps)[number];
const TILE: Record<Step, ReactNode> = {
  identity: <IconTile color="gain"><CheckCircle weight="fill" /></IconTile>,
  documents: <IconTile color="gain"><CheckCircle weight="fill" /></IconTile>,
  license: <IconTile color="signal"><ShieldCheck weight="fill" /></IconTile>,
  track: <IconTile color="indigo"><ChartLineUp weight="bold" /></IconTile>,
};

/** M2 · Under review: professional path. Done = green check tile, pending = grey pill. */
export function M2UnderReview() {
  const r = copy.becomeManager.review;
  const a = mockCopy.application;
  return (
    <MockPage testId="mock-m2">
      <TopBar left={<BackButton to="/mock" />} title={a.title} />
      <Badge className="mt-[22px] self-start !px-2.5 !py-[5px] !text-[13px]">{r.badge}</Badge>
      <h1 className="mt-3 text-[26px] font-bold leading-[1.15] tracking-[-0.01em]">{r.title}</h1>
      <p className="mt-2 text-[15px] leading-[1.45] text-muted">{r.body}</p>
      <ListGroup className="mt-[22px]">
        {mockData.application.steps.map((s) => {
          const step = a.steps[s];
          const badge = "badge" in step ? step.badge : undefined;
          return (
            <ListRow
              key={s}
              dense
              dividerInset={0}
              leading={TILE[s]}
              title={step.title}
              sub={step.sub}
              trailing={badge && <>
                <Badge>{badge}</Badge>
                {s === "track" && <CaretRight weight="bold" className="size-4 text-faint" />}
              </>}
            />
          );
        })}
      </ListGroup>
      <MockActions>
        <Button variant="secondary" href="/mock">{a.edit}</Button>
        <Button href="/mock">{a.done}</Button>
      </MockActions>
    </MockPage>
  );
}
