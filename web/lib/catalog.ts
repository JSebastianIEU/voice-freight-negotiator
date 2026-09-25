/**
 * The load board and the carrier personas, typed. Source of truth is the agent's copy
 * (agent/src/freight_negotiator/data/catalog.json); `make sync-catalog` refreshes this
 * one and an agent test fails when they drift.
 *
 * The private numbers (floor / target / ceiling) are in here too. That is on purpose:
 * the point of the project is that the *model* never sees them, not that the demo page
 * hides them from a curious visitor. The debrief screen reveals them after the call.
 */

import raw from "@/data/catalog.json";

export type Lang = "en" | "es";
export type Localized = Record<Lang, string>;

export type Stop = {
  city: string;
  state: string;
  date: string; // ISO
  window: [string, string]; // "08:00", "14:00"
};

export type Load = {
  id: string;
  origin: Stop;
  destination: Stop;
  equipment: string;
  commodity: Localized;
  weight_lbs: number;
  miles: number;
  notes: Localized;
  sell_rate: number;
  prices: { floor: number; target: number; ceiling: number };
};

export type Carrier = {
  id: string;
  company: string;
  mc: string;
  equipment: string[];
  base: { city: string; state: string };
  driver: string;
  phone: string;
  persona: Localized;
};

type Catalog = {
  broker: { name: string; rep: string };
  loads: Load[];
  carriers: Carrier[];
};

const catalog = raw as Catalog;

export const broker = catalog.broker;
export const loads: Load[] = catalog.loads;
export const carriers: Carrier[] = catalog.carriers;

export function findLoad(id: string | null | undefined): Load {
  return loads.find((l) => l.id === id) ?? loads[0];
}

export function findCarrier(id: string | null | undefined): Carrier {
  return carriers.find((c) => c.id === id) ?? carriers[0];
}

/** Carriers whose equipment matches the load come first; the rest stay selectable. */
export function carriersFor(load: Load): Carrier[] {
  return [...carriers].sort(
    (a, b) => Number(b.equipment.includes(load.equipment)) - Number(a.equipment.includes(load.equipment)),
  );
}

export const lane = (l: Load) => `${l.origin.city}, ${l.origin.state} → ${l.destination.city}, ${l.destination.state}`;
