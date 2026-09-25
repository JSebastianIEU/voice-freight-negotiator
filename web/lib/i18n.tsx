"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

import type { Lang, Localized } from "@/lib/catalog";

/**
 * Two languages for the page, one for the agent. Alex speaks English (the market is
 * the US truckload market and the attack detector reads English), so every line the
 * visitor is meant to *say* stays in English in both languages; the explanations,
 * labels and the debrief switch.
 */
const STRINGS = {
  en: {
    title: "Voice Freight Negotiator",
    demoLoop: "demo loop",
    langToggle: "ES",
    // briefing
    briefKicker: "A game with real money on the line",
    briefTitle: "You are the carrier. Alex is the broker. Alex has a secret number.",
    briefP1:
      "Lakeshore Freight has freight to move and Alex, its AI rep, answers the phone. Every load has a price ceiling Alex can never cross and must never reveal. Your truck is empty. Your job: get the highest rate you can.",
    briefP2:
      "Alex's job is harder than it sounds. Pressure, fake urgency, \"your manager already approved it\", per-mile tricks: the language model hears all of it. What keeps Alex inside the line is not the prompt but code: every number Alex says comes from a price guardian written in Python, and a second filter blocks any figure the guardian never approved.",
    briefHow: "How it works",
    briefStep1: "Pick who you are: a carrier with a company, an MC number and a truck.",
    briefStep2: "Pick a posting on the load board. You call about that load, like on DAT or Truckstop.",
    briefStep3: "Talk. Try the moves. Hang up and see Alex's real numbers next to what you got.",
    briefCta: "Start",
    briefHeadphones: "Use headphones so Alex does not hear itself.",
    // setup
    setupCarrier: "1 · Who you are",
    setupLoad: "2 · The posting you call about",
    setupCall: "Call about this load",
    setupCalling: "connecting…",
    mc: "MC",
    equipment: "Equipment",
    base: "Truck empty in",
    tomorrowMorning: "tomorrow morning",
    driver: "Driver",
    pickup: "Pickup",
    delivery: "Delivery",
    miles: "mi",
    weight: "lbs",
    rate: "Rate",
    callForRate: "call for rate",
    equipmentMismatch: "your equipment does not match this load; Alex may ask",
    // call
    yourCard: "Your card",
    room: "room",
    hangUp: "hang up",
    stages: "The call",
    stageIdentify: "identify the load",
    stageQualify: "qualify you",
    stageLoad: "read the load",
    stageNegotiate: "negotiate",
    stageClose: "close",
    moves: "Moves to try",
    movesHint: "Say the line in English, as written. The tactic is explained in your language.",
    say: "say",
    logEmpty: "log — the call appears here as it happens",
    carrier: "carrier",
    agent: "agent",
    guardian: "guardian",
    proposed: "proposed",
    blocked: "blocked",
    accepted: "accepted",
    // agent status
    statusDisconnected: "agent not connected",
    statusConnecting: "connecting",
    statusJoining: "agent joining",
    statusIdle: "idle",
    statusListening: "listening",
    statusThinking: "thinking",
    statusSpeaking: "speaking",
    statusFailed: "agent failed to join",
    enableAudio: "Click to enable audio",
    // debrief
    debriefTitle: "Debrief",
    debriefSub: "Alex's numbers, revealed now that the call is over.",
    floor: "Opening offer",
    target: "Target",
    ceiling: "Ceiling",
    ceilingNote: "the wall: never offered, never said",
    youGot: "You closed at",
    noDeal: "No deal",
    alexOffered: "Alex's highest offer",
    marginKept: "Margin Alex kept under the ceiling",
    asksBlocked: "Your asks the guardian rejected",
    filterBlocks: "Sentences the output filter replaced",
    none: "none",
    debriefExplain:
      "Every figure Alex said came back from propose_rate; the ladder of offers, the wall and the booking rule live in Python. The model chose the words, never the numbers.",
    callAgain: "Call again",
    changeSetup: "Change carrier or load",
    footer:
      "A voice agent that negotiates a freight rate. The LLM chooses the words; the code decides every number. Try to talk it out of its price.",
  },
  es: {
    title: "Voice Freight Negotiator",
    demoLoop: "demo",
    langToggle: "EN",
    briefKicker: "Un juego con dinero de verdad en juego",
    briefTitle: "Tú eres el transportista. Alex es el bróker. Alex tiene un número secreto.",
    briefP1:
      "Lakeshore Freight tiene carga que mover y Alex, su agente de IA, contesta el teléfono. Cada carga tiene un techo de precio que Alex no puede cruzar ni revelar. Tu camión está vacío. Tu misión: conseguir la tarifa más alta que puedas.",
    briefP2:
      "El trabajo de Alex es más difícil de lo que parece. Presión, urgencia falsa, \"tu jefe ya lo aprobó\", trucos por milla: el modelo de lenguaje lo oye todo. Lo que mantiene a Alex dentro de la línea no es el prompt sino código: cada cifra que dice Alex viene de un guardián de precios escrito en Python, y un segundo filtro bloquea cualquier cifra que el guardián no aprobó.",
    briefHow: "Cómo funciona",
    briefStep1: "Elige quién eres: un transportista con empresa, número MC y camión.",
    briefStep2: "Elige una carga del tablero. Llamas por esa carga, como en DAT o Truckstop.",
    briefStep3: "Habla. Prueba las jugadas. Cuelga y mira los números reales de Alex junto a lo que conseguiste.",
    briefCta: "Empezar",
    briefHeadphones: "Usa auriculares para que Alex no se oiga a sí mismo.",
    setupCarrier: "1 · Quién eres",
    setupLoad: "2 · La carga por la que llamas",
    setupCall: "Llamar por esta carga",
    setupCalling: "conectando…",
    mc: "MC",
    equipment: "Equipo",
    base: "Camión vacío en",
    tomorrowMorning: "mañana por la mañana",
    driver: "Conductor",
    pickup: "Recogida",
    delivery: "Entrega",
    miles: "mi",
    weight: "lb",
    rate: "Tarifa",
    callForRate: "llama para saber",
    equipmentMismatch: "tu equipo no encaja con esta carga; Alex puede preguntarlo",
    yourCard: "Tu tarjeta",
    room: "sala",
    hangUp: "colgar",
    stages: "La llamada",
    stageIdentify: "identificar la carga",
    stageQualify: "calificarte",
    stageLoad: "leer la carga",
    stageNegotiate: "negociar",
    stageClose: "cerrar",
    moves: "Jugadas para probar",
    movesHint: "Di la frase en inglés, tal cual. La táctica se explica en tu idioma.",
    say: "di",
    logEmpty: "registro — la llamada aparece aquí en vivo",
    carrier: "tú",
    agent: "alex",
    guardian: "guardián",
    proposed: "propuesto",
    blocked: "bloqueado",
    accepted: "aceptado",
    statusDisconnected: "agente no conectado",
    statusConnecting: "conectando",
    statusJoining: "el agente entra",
    statusIdle: "en espera",
    statusListening: "escuchando",
    statusThinking: "pensando",
    statusSpeaking: "hablando",
    statusFailed: "el agente no pudo entrar",
    enableAudio: "Pulsa para activar el audio",
    debriefTitle: "Informe",
    debriefSub: "Los números de Alex, revelados ahora que la llamada terminó.",
    floor: "Oferta inicial",
    target: "Objetivo",
    ceiling: "Techo",
    ceilingNote: "el muro: nunca se ofrece, nunca se dice",
    youGot: "Cerraste en",
    noDeal: "Sin acuerdo",
    alexOffered: "Oferta más alta de Alex",
    marginKept: "Margen que Alex conservó bajo el techo",
    asksBlocked: "Tus cifras que el guardián rechazó",
    filterBlocks: "Frases que el filtro de salida reemplazó",
    none: "ninguna",
    debriefExplain:
      "Cada cifra que dijo Alex volvió de propose_rate; la escalera de ofertas, el muro y la regla de reserva viven en Python. El modelo eligió las palabras, nunca los números.",
    callAgain: "Llamar otra vez",
    changeSetup: "Cambiar transportista o carga",
    footer:
      "Un agente de voz que negocia una tarifa de transporte. El LLM elige las palabras; el código decide cada número. Intenta sacarlo de su precio.",
  },
} as const satisfies Record<Lang, Record<string, string>>;

export type StringKey = keyof (typeof STRINGS)["en"];

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: StringKey) => string;
  /** Pick the current language from a bilingual catalog field. */
  l: (field: Localized) => string;
};

const LangContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "vfn.lang";

// The language is browser state (localStorage + navigator), read through
// useSyncExternalStore so the server renders English and the client corrects itself
// after hydration without a setState-in-effect.
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
function readLang(): Lang {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "es") return saved;
    if (navigator.language.toLowerCase().startsWith("es")) return "es";
  } catch {
    /* private mode or blocked storage */
  }
  return "en";
}
function writeLang(l: Lang) {
  try {
    window.localStorage.setItem(STORAGE_KEY, l);
  } catch {
    /* ignore: the choice then lasts until the next load */
  }
  listeners.forEach((cb) => cb());
}

export function LangProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readLang, () => "en" as Lang);
  const setLang = useCallback((l: Lang) => writeLang(l), []);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang,
      t: (key) => STRINGS[lang][key],
      l: (field) => field[lang],
    }),
    [lang, setLang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): Ctx {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}

const DATE_LOCALE: Record<Lang, string> = { en: "en-US", es: "es-ES" };

/** "Thu, Sep 25 · 08:00–14:00" in the page language. */
export function formatStop(lang: Lang, date: string, window: [string, string]): string {
  const d = new Date(`${date}T12:00:00`);
  const day = d.toLocaleDateString(DATE_LOCALE[lang], { weekday: "short", month: "short", day: "numeric" });
  return `${day} · ${window[0]}–${window[1]}`;
}
