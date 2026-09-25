"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

import type { Lang, Localized } from "@/lib/catalog";

/**
 * Two languages for the page, one for the agent. Alex speaks English (the market is the
 * US truckload market and the attack detector reads English), so every line the visitor
 * is meant to *say* stays in English in both languages; everything meant to be
 * *understood* switches. Copy is short on purpose: one idea per line.
 */
const STRINGS = {
  en: {
    brand: "Voice Freight Negotiator",
    navHow: "How it works",
    navCode: "Code",
    langToggle: "ES",
    langToggleLabel: "Cambiar a español",

    heroKicker: "Live voice AI · limits enforced in code",
    heroTitle: "Can you talk an AI into overpaying?",
    heroSub:
      "Alex hires trucks over the phone for a freight broker. You're the trucker. Alex has a secret limit, and code that won't let it cross.",
    heroCta: "Call Alex",
    heroSample: "Watch a sample call",
    heroScroll: "How it works",

    storyKicker: "How freight works, in one minute",
    ch1Title: "A company needs to ship something.",
    ch1Body: "Say, 42,000 lbs of goods from Chicago to Dallas.",
    ch2Title: "It pays a broker to get it there.",
    ch2Body: "The broker gets $3,300 for the job, and owns no trucks.",
    ch3Title: "The broker hires a trucker for less.",
    ch3Body: "Pay the trucker $2,700, keep $600. That gap is the whole business.",
    ch4Title: "Truckers call to negotiate. Alex answers.",
    ch4Body: "Every dollar more for the trucker is a dollar less for the broker. Hundreds of calls a day.",
    ch5Title: "Alex has a limit it can never cross.",
    ch5Body: "The AI chooses the words. Code checks who's calling and decides every number.",
    ch6Title: "Your turn. Try to break it.",
    ch6Body: "Pick a truck, pick a load, call. Push, bluff, rush it, pretend to be someone else.",

    holoShipper: "Company",
    holoShipperSub: "shipper",
    holoBroker: "Alex",
    holoBrokerSub: "broker · AI",
    holoCarrier: "Trucker",
    holoCarrierSub: "carrier",
    holoFromShipper: "from the company",
    holoToTrucker: "to the trucker",
    holoBrokerKeeps: "broker keeps",
    holoLimit: "Alex's limit",
    holoBlocked: "blocked by code",
    holoYou: "you",

    back: "Back",
    step: "Step {n} of 2",
    pickCarrierTitle: "Who are you?",
    pickCarrierSub: "Pick your trucking company. Alex checks your MC number before talking money.",
    mcHelpTitle: "What's an MC number?",
    mcHelp:
      "The federal license every US trucking company needs. Brokers look it up before booking, to avoid fraud.",
    trucks: "{n} trucks",
    pickLoadTitle: "Which load?",
    pickLoadSub: "Alex's open loads. The price is hidden: that's what you negotiate.",
    fits: "fits your truck",
    noFit: "wrong truck: Alex says no",
    rateHidden: "rate: ?",
    readyTitle: "Ready to call",
    readyYou: "You are",
    readyAbout: "Calling about",
    readyCta: "Call Alex",
    readyMic: "Your browser will ask for the microphone. Headphones help.",
    readySample: "Or watch a sample call first",
    change: "change",

    callConnecting: "Connecting to Alex…",
    sampleBadge: "Sample call",
    hangUp: "Hang up",
    skipSample: "Skip to result",
    yourMove: "Your move",
    sayThis: "say it in English",
    objIdentify: "Tell Alex which load you want.",
    objQualify: "Alex checks who you are. Give your company and MC.",
    objRejected: "Alex couldn't verify you, so it won't talk money.",
    objLoad: "You're verified. Tell Alex where your truck is.",
    objNegotiate: "Push for more money, or play a trick.",
    objClose: "Deal booked. Hang up to see your result.",
    objCloseSample: "Deal booked. Your result is next.",
    tricks: "Tricks",
    tricksHint: "Tap one, then say the line.",
    backToSuggestion: "back to the suggestion",
    transcript: "Transcript",
    transcriptEmpty: "The conversation appears here as you talk.",
    whoYou: "you",
    whoAlex: "alex",
    whoCode: "code",
    stageIdentify: "Load",
    stageQualify: "ID check",
    stageLoad: "Details",
    stageNegotiate: "Price",
    stageClose: "Deal",
    statusConnecting: "connecting",
    statusIdle: "on the line",
    statusListening: "Alex is listening",
    statusThinking: "Alex is thinking",
    statusSpeaking: "Alex is speaking",
    statusFailed: "Alex couldn't join",
    enableAudio: "Tap to hear Alex",

    capOffered: "offered",
    capBlocked: "blocked",
    capApproved: "approved",
    capBooked: "booked",
    capVerified: "verified",
    capNotVerified: "not verified",
    capFiltered: "stopped before it was said",
    capLoad: "now discussing",

    debKicker: "Result",
    debGotPaid: "You got paid {amount}.",
    debNoDeal: "No deal this time.",
    debRejected: "Alex won't work with an unverified carrier.",
    debSub: "Here are Alex's secret numbers.",
    scaleFirst: "Alex's first offer",
    scaleGoal: "Alex's goal",
    scaleLimit: "Alex's limit",
    scaleSecret: "secret",
    scaleYouAsked: "you asked",
    scaleAlexOffered: "Alex offered",
    scaleDeal: "deal",
    scaleWall: "code blocks everything past here",
    statKept: "Under Alex's limit by",
    statBlocked: "Asks & tricks blocked",
    statId: "ID check",
    idPassed: "passed",
    idFailed: "failed",
    idNotReached: "not reached",
    debExplain:
      "Alex never said its limit, and couldn't have paid more even if it wanted to: every number came from code, not from the AI.",
    debAgain: "Try another trick",
    debChange: "Different truck or load",
    debHome: "Back to start",

    footStress: "Stress-tested with 30 scripted attacks: 0 crossed the limit, 0 leaked it.",
    footReport: "Read the report",
    footBy: "Built by Juan Sebastián Peña Donneys",
  },
  es: {
    brand: "Voice Freight Negotiator",
    navHow: "Cómo funciona",
    navCode: "Código",
    langToggle: "EN",
    langToggleLabel: "Switch to English",

    heroKicker: "IA de voz en vivo · límites en código",
    heroTitle: "¿Puedes convencer a una IA de pagar de más?",
    heroSub:
      "Alex contrata camiones por teléfono para un bróker de carga. Tú eres el camionero. Alex tiene un límite secreto, y código que no le deja cruzarlo.",
    heroCta: "Llamar a Alex",
    heroSample: "Ver una llamada de ejemplo",
    heroScroll: "Cómo funciona",

    storyKicker: "Cómo funciona el transporte, en un minuto",
    ch1Title: "Una empresa necesita enviar algo.",
    ch1Body: "Por ejemplo, 19 toneladas de mercancía de Chicago a Dallas.",
    ch2Title: "Le paga a un bróker para que llegue.",
    ch2Body: "El bróker recibe $3,300 por el trabajo, y no tiene camiones.",
    ch3Title: "El bróker contrata a un camionero por menos.",
    ch3Body: "Le paga $2,700 al camionero y se queda $600. Esa diferencia es todo el negocio.",
    ch4Title: "Los camioneros llaman a negociar. Alex contesta.",
    ch4Body: "Cada dólar más para el camionero es un dólar menos para el bróker. Cientos de llamadas al día.",
    ch5Title: "Alex tiene un límite que nunca puede cruzar.",
    ch5Body: "La IA elige las palabras. El código verifica quién llama y decide cada número.",
    ch6Title: "Tu turno. Intenta romperlo.",
    ch6Body: "Elige un camión, elige una carga, llama. Presiona, farolea, mete prisa, hazte pasar por otro.",

    holoShipper: "Empresa",
    holoShipperSub: "remitente",
    holoBroker: "Alex",
    holoBrokerSub: "bróker · IA",
    holoCarrier: "Camionero",
    holoCarrierSub: "transportista",
    holoFromShipper: "de la empresa",
    holoToTrucker: "al camionero",
    holoBrokerKeeps: "gana el bróker",
    holoLimit: "límite de Alex",
    holoBlocked: "bloqueado por código",
    holoYou: "tú",

    back: "Atrás",
    step: "Paso {n} de 2",
    pickCarrierTitle: "¿Quién eres?",
    pickCarrierSub: "Elige tu empresa de camiones. Alex verifica tu número MC antes de hablar de dinero.",
    mcHelpTitle: "¿Qué es el número MC?",
    mcHelp:
      "La licencia federal que necesita toda empresa de camiones en EE. UU. Los brókers la verifican antes de contratar, para evitar fraudes.",
    trucks: "{n} camiones",
    pickLoadTitle: "¿Qué carga?",
    pickLoadSub: "Las cargas abiertas de Alex. El precio está oculto: eso es lo que negocias.",
    fits: "encaja con tu camión",
    noFit: "otro camión: Alex dirá que no",
    rateHidden: "tarifa: ?",
    readyTitle: "Listo para llamar",
    readyYou: "Eres",
    readyAbout: "Llamas por",
    readyCta: "Llamar a Alex",
    readyMic: "El navegador te pedirá el micrófono. Mejor con auriculares.",
    readySample: "O mira primero una llamada de ejemplo",
    change: "cambiar",

    callConnecting: "Conectando con Alex…",
    sampleBadge: "Llamada de ejemplo",
    hangUp: "Colgar",
    skipSample: "Ver resultado",
    yourMove: "Tu turno",
    sayThis: "dilo en inglés",
    objIdentify: "Dile a Alex qué carga quieres.",
    objQualify: "Alex verifica quién eres. Da tu empresa y tu MC.",
    objRejected: "Alex no pudo verificarte, así que no hablará de dinero.",
    objLoad: "Estás verificado. Dile a Alex dónde está tu camión.",
    objNegotiate: "Pide más dinero, o juega un truco.",
    objClose: "Trato cerrado. Cuelga para ver tu resultado.",
    objCloseSample: "Trato cerrado. Ahora, tu resultado.",
    tricks: "Trucos",
    tricksHint: "Toca uno y di la frase.",
    backToSuggestion: "volver a la sugerencia",
    transcript: "Transcripción",
    transcriptEmpty: "La conversación aparece aquí mientras hablas.",
    whoYou: "tú",
    whoAlex: "alex",
    whoCode: "código",
    stageIdentify: "Carga",
    stageQualify: "Verificación",
    stageLoad: "Detalles",
    stageNegotiate: "Precio",
    stageClose: "Trato",
    statusConnecting: "conectando",
    statusIdle: "en línea",
    statusListening: "Alex escucha",
    statusThinking: "Alex piensa",
    statusSpeaking: "Alex habla",
    statusFailed: "Alex no pudo entrar",
    enableAudio: "Toca para oír a Alex",

    capOffered: "ofrecido",
    capBlocked: "bloqueado",
    capApproved: "aprobado",
    capBooked: "reservado",
    capVerified: "verificado",
    capNotVerified: "no verificado",
    capFiltered: "frenado antes de decirlo",
    capLoad: "ahora hablando de",

    debKicker: "Resultado",
    debGotPaid: "Conseguiste {amount}.",
    debNoDeal: "Esta vez no hubo trato.",
    debRejected: "Alex no trabaja con un transportista sin verificar.",
    debSub: "Estos eran los números secretos de Alex.",
    scaleFirst: "Primera oferta de Alex",
    scaleGoal: "Meta de Alex",
    scaleLimit: "Límite de Alex",
    scaleSecret: "secreto",
    scaleYouAsked: "pediste",
    scaleAlexOffered: "Alex ofreció",
    scaleDeal: "trato",
    scaleWall: "el código bloquea todo lo que pase de aquí",
    statKept: "Por debajo del límite de Alex",
    statBlocked: "Cifras y trucos bloqueados",
    statId: "Verificación",
    idPassed: "aprobada",
    idFailed: "fallida",
    idNotReached: "no llegó",
    debExplain:
      "Alex nunca dijo su límite, y no habría podido pagar más aunque quisiera: cada cifra salió del código, no de la IA.",
    debAgain: "Probar otro truco",
    debChange: "Otro camión u otra carga",
    debHome: "Volver al inicio",

    footStress: "Probado con 30 ataques guionizados: 0 cruzaron el límite, 0 lo filtraron.",
    footReport: "Ver el informe",
    footBy: "Hecho por Juan Sebastián Peña Donneys",
  },
} as const satisfies Record<Lang, Record<string, string>>;

export type StringKey = keyof (typeof STRINGS)["en"];

/** The desk's reasons arrive in English from the worker; the page shows them localized. */
const REASONS_ES: Record<string, string> = {
  "above what this load can pay": "por encima de lo que paga esta carga",
  "opening offer": "oferta inicial",
  counter: "contraoferta",
  "best and final": "oferta final",
  approved: "aprobado",
  booked: "reservado",
  "never offered": "nunca se ofreció",
  "not a usable rate": "tarifa no válida",
  "unvalidated amount in reply": "cifra no validada",
  "not found": "MC no encontrado",
  "authority inactive": "autoridad inactiva",
  "name mismatch": "el nombre no coincide",
};

type Vars = Record<string, string | number>;

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Translate a key; `{name}` placeholders are filled from `vars`. */
  t: (key: StringKey, vars?: Vars) => string;
  /** Pick the current language from a bilingual catalog field. */
  l: (field: Localized) => string;
  /** Localize a reason string published by the worker. */
  reason: (r: string | undefined) => string;
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
  document.documentElement.lang = l;
  listeners.forEach((cb) => cb());
}

function fill(s: string, vars?: Vars): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function LangProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readLang, () => "en" as Lang);
  const setLang = useCallback((l: Lang) => writeLang(l), []);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => fill(STRINGS[lang][key], vars),
      l: (field) => field[lang],
      reason: (r) => (r ? (lang === "es" ? (REASONS_ES[r] ?? r) : r) : ""),
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

/** "Thu, Sep 25" in the page language. */
export function formatDay(lang: Lang, date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString(DATE_LOCALE[lang], { weekday: "short", month: "short", day: "numeric" });
}

/** "Thu, Sep 25 · 08:00–14:00" in the page language. */
export function formatStop(lang: Lang, date: string, window: [string, string]): string {
  return `${formatDay(lang, date)} · ${window[0]}–${window[1]}`;
}
