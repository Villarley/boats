"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bank, Bell, CaretRight, ChartLineUp, Copy, Lifebuoy, ScanSmiley, ShieldCheck, SignOut, UserPlus } from "@phosphor-icons/react";
import { BackButton, Page, TopBar } from "@/components/top-bar";
import { Button } from "@/components/button";
import { HelmIcon } from "@/components/brand";
import { IconTile, ListGroup, ListRow } from "@/components/list-group";
import { ModeSwitch } from "@/components/sidebar";
import { useStore } from "@/lib/store";
import { saveName, useDisplayName, useSavedName } from "@/lib/names";
import { NameSheet } from "@/components/name-sheet";
import { managerOf } from "@/lib/fund";
import { usd } from "@/lib/format";
import { copy } from "@/lib/copy";
import { appCopy } from "@/lib/copy.app";
import { useUnlock } from "@/lib/unlock";

const chev = <CaretRight weight="bold" className="size-4 text-faint" />;

/** H1 Profile (opened from the avatar). Approved managers get the Investor/Manager switch (M3). */
export default function Profile() {
  const { wallet, captainOf, boats, signOut, cash } = useStore();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const name = useDisplayName(wallet?.address);
  const saved = useSavedName(wallet?.address);
  const [editName, setEditName] = useState(false);
  const isManager = captainOf.length > 0;
  const managed = boats.filter((b) => captainOf.some((a) => a.toLowerCase() === b.address.toLowerCase()));
  const verified = managed.some((b) => managerOf(b).verified);
  const passkey = wallet?.kind === "passkey";
  const unlock = useUnlock();
  const addr = wallet?.address ?? "";

  return (
    <Page testId="profile">
      <TopBar left={<BackButton />} title={copy.profile.title} />
      <div className="mt-3.5 flex flex-col items-center gap-1 rounded-[20px] bg-card px-4 pb-4 pt-5">
        <span className={`grid size-[68px] place-items-center rounded-full bg-card-2 text-[26px] font-semibold ${isManager ? "shadow-[0_0_0_2.5px_var(--bt-navy)]" : ""}`}>{name.slice(0, 1)}</span>
        <b className="mt-1.5 text-[20px] font-semibold">{name}</b>
        <button type="button" onClick={() => setEditName(true)} className="text-[13px] font-semibold text-signal" data-testid="edit-name">{appCopy.name.edit}</button>
        {isManager && verified ? (
          <span className="flex items-center gap-1 text-[13px] font-semibold"><ShieldCheck weight="fill" className="size-4 text-signal" />{copy.profile.verified}</span>
        ) : (
          <span className="text-[13px] text-muted">{unlock.signedIn}</span>
        )}
        {isManager && <ModeSwitch className="mt-3.5" />}
      </div>

      {!isManager && (
        <Link href="/manager" className="mt-3.5 grid grid-cols-[40px_1fr_auto] items-center gap-3 rounded-card bg-card p-3.5" data-testid="manage-others">
          <span className="grid size-10 place-items-center rounded-[11px] bg-navy text-white"><HelmIcon size={21} /></span>
          <div>
            <b className="block text-[15px] font-semibold">{copy.profile.manageOthers}</b>
            <p className="mt-0.5 text-[13px] leading-[1.35] text-muted">{copy.profile.manageOthersSub}</p>
          </div>
          {chev}
        </Link>
      )}

      <ListGroup className="mt-3.5">
        {isManager && (
          <>
            <ListRow dense href="/captain" leading={<IconTile color="indigo"><ChartLineUp weight="fill" /></IconTile>} title={appCopy.profile.publicFunds} sub={appCopy.profile.publicFundsSub} trailing={<><b className="text-[15px] font-semibold">{managed.length}</b>{chev}</>} />
            <ListRow dense leading={<IconTile color="sky"><UserPlus weight="fill" /></IconTile>} title={appCopy.profile.privateFunds} sub={appCopy.profile.privateFundsSub} trailing={<><b className="text-[15px] font-semibold">0</b>{chev}</>} />
          </>
        )}
        <ListRow dense leading={<IconTile color="gain"><ScanSmiley weight="fill" /></IconTile>} title={passkey ? `${unlock.how[0]!.toUpperCase()}${unlock.how.slice(1)} · ${appCopy.unlock.row}` : appCopy.unlock.row} trailing={<><span className="text-[15px] font-medium text-muted">{passkey ? appCopy.profile.on : appCopy.profile.off}</span>{chev}</>} />
        {!isManager && (
          <>
            <ListRow dense href="/add" leading={<IconTile color="teal"><Bank weight="fill" /></IconTile>} title={copy.profile.rows[1]} sub={appCopy.profile.demoBalance(usd(cash, { cents: true }))} trailing={chev} />
            <ListRow dense href="/activity" leading={<IconTile color="loss"><Bell weight="fill" /></IconTile>} title={copy.profile.rows[2]} trailing={chev} />
            <ListRow dense href="/invite" leading={<IconTile color="sky"><UserPlus weight="fill" /></IconTile>} title={copy.profile.rows[3]} trailing={chev} />
          </>
        )}
        <ListRow dense leading={<IconTile color="muted"><Lifebuoy weight="fill" /></IconTile>} title={copy.profile.rows[4]} trailing={chev} />
      </ListGroup>

      {addr && (
        <button
          type="button"
          className="mt-3.5 flex items-center justify-between rounded-card bg-card px-4 py-3 text-left"
          onClick={() => navigator.clipboard?.writeText(addr).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {})}
          data-testid="account-id"
        >
          <span>
            <span className="block font-mono text-[11px] uppercase tracking-[.07em] text-faint">{appCopy.profile.accountId}</span>
            <span className="font-mono text-[14px]">{addr.slice(0, 6)}…{addr.slice(-4)}</span>
          </span>
          <span className="flex items-center gap-1 text-[13px] font-semibold text-signal">{copied ? appCopy.profile.copied : <Copy weight="bold" className="size-4" />}</span>
        </button>
      )}

      <NameSheet open={editName} initial={saved ?? ""} onClose={() => setEditName(false)}
        onSave={(n) => { if (wallet) saveName(wallet.address, n); setEditName(false); }} />
      <Button variant="outline" className="mb-6 mt-4" icon={<SignOut weight="bold" />} onClick={() => { signOut(); router.replace("/"); }} testId="signout">{copy.profile.signOut}</Button>
    </Page>
  );
}
