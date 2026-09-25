/**
 * The one line under the core after a guardian event, in the page language.
 */

import { FILTER_REASON, type GuardianEvent, usd } from "@/lib/guardian";
import type { StringKey } from "@/lib/i18n";
import type { Caption } from "@/lib/orb/model";

type T = (key: StringKey) => string;
type Reason = (r: string | undefined) => string;

export function captionFor(ev: GuardianEvent, t: T, reason: Reason): Caption | null {
  switch (ev.type) {
    case "rate.proposed":
      return { text: `${usd.format(ev.amount)}  ${t("capOffered")}`, tone: "ink" };
    case "rate.rejected": {
      const amount = usd.format(ev.amount);
      const why = ev.reason === FILTER_REASON ? t("capFiltered") : reason(ev.reason);
      return { text: `${amount}  ${t("capBlocked")} · ${why}`, tone: "ink", strike: amount };
    }
    case "rate.accepted": {
      const booked = ev.reason === "booked";
      return {
        text: `${usd.format(ev.amount)}  ${t(booked ? "capBooked" : "capApproved")}`,
        tone: "accent",
        sticky: booked,
      };
    }
    case "carrier.verified":
      return { text: `${ev.company ?? `MC ${ev.mc ?? ""}`}  ${t("capVerified")}`, tone: "accent" };
    case "carrier.rejected":
      return {
        text: `MC ${ev.mc ?? "?"}  ${t("capNotVerified")} · ${reason(ev.reason)}`,
        tone: "ink",
      };
    case "load.focus":
      return { text: `${t("capLoad")} ${ev.loadId}`, tone: "ink" };
  }
}
