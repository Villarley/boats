"use client";
import { useEffect, useRef, useState } from "react";
import { createOnrampKit, parseOnrampSession, type KitError } from "@circle-fin/onramp-kit";
import { CircleNotch } from "@phosphor-icons/react";

export type OnrampOutcome = { kind: "submitted"; amount?: number } | { kind: "settled"; hash?: string } | { kind: "cancelled" } | { kind: "expired" } | { kind: "error" };

/**
 * Circle's hosted checkout (card, Apple Pay, Google Pay) inside our page. The session comes from
 * our own /api/onramp (the API key stays on the server). Events only drive the screen; arrival is
 * confirmed by the balance going up on-chain.
 */
export function OnrampWidget({ session, widget, title, onEvent }: { session: unknown; widget: string; title: string; onEvent: (o: OnrampOutcome) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const cb = useRef(onEvent);
  cb.current = onEvent;

  useEffect(() => {
    if (!box.current) return;
    let w: { close: () => void } | null = null;
    try {
      const kit = createOnrampKit({ widgetBaseUrl: widget });
      w = kit.mountIframe({
        session: parseOnrampSession(session),
        container: box.current,
        title,
        onInitializationSuccess: () => setReady(true),
        onInitializationError: () => cb.current({ kind: "error" }),
        onDepositSubmitted: ({ payload }) => cb.current({ kind: "submitted", amount: payload.amount }),
        onDepositSettled: ({ payload }) => cb.current({ kind: "settled", hash: (payload as { transactionHash?: string }).transactionHash }),
        onDepositNotCompleted: ({ code }) => {
          if (code === "CANCELED_BY_CUSTOMER") cb.current({ kind: "cancelled" });
        },
        onSessionExpired: () => cb.current({ kind: "expired" }),
      });
    } catch (e) {
      console.warn("onramp mount", (e as KitError)?.type ?? e);
      cb.current({ kind: "error" });
    }
    return () => w?.close();
  }, [session, widget, title]);

  return (
    <div className="relative mt-4 overflow-hidden rounded-card bg-card" style={{ height: "min(720px, calc(100dvh - 210px))", minHeight: 540 }} data-testid="onramp-widget">
      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-muted" aria-hidden>
          <CircleNotch weight="bold" className="size-7 animate-spin" />
        </div>
      )}
      <div ref={box} className="absolute inset-0" />
    </div>
  );
}
