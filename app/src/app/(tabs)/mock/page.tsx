"use client";
import { CaretRight } from "@phosphor-icons/react";
import { Badge } from "@/components/badge";
import { ListGroup, ListRow } from "@/components/list-group";
import { MockPage } from "@/components/mock/mock-shell";
import { mockCopy } from "@/lib/copy.mock";
import { appCopy } from "@/lib/copy.app";

/** Index of the mock screens (example data, no chain). */
export default function MockIndex() {
  const m = mockCopy.index;
  return (
    <MockPage testId="mock-index">
      <h1 className="mt-3 text-[28px] font-bold leading-[1.15] tracking-[-0.01em]">{m.title}</h1>
      <p className="mt-2 text-[15px] leading-[1.45] text-muted">{m.sub}</p>
      {m.groups.map((g) => (
        <section key={g.title}>
          <h2 className="mb-2.5 mt-[26px] text-[13px] font-semibold text-muted">{g.title}</h2>
          <ListGroup>
            {g.codes.map((code) => {
              const s = m.screens[code]!;
              return (
                <ListRow
                  key={code}
                  href={`/mock/${code}`}
                  dense
                  dividerInset={0}
                  testId={`mock-link-${code}`}
                  leading={<span className="grid size-[38px] place-items-center rounded-[10px] bg-card-2 font-mono text-[12px] font-bold uppercase">{code}</span>}
                  title={s.name}
                  sub={s.sub}
                  trailing={<><Badge>{appCopy.example}</Badge><CaretRight weight="bold" className="size-4 text-faint" /></>}
                />
              );
            })}
          </ListGroup>
        </section>
      ))}
    </MockPage>
  );
}
