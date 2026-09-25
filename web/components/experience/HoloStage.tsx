"use client";

import { useEffect, useRef, useState } from "react";

import { drawHolo, type HoloFonts, type HoloLabels } from "@/lib/holo/draw";
import { HoloScene } from "@/lib/holo/scene";
import { useLang } from "@/lib/i18n";

/**
 * The explainer canvas. React owns the chapter and the language; one rAF loop owns the
 * pixels. The pointer tilts the camera and hovers actors (a bracket frame, a brighter
 * label); a click pings the one under it. Pauses when off-screen or in a hidden tab;
 * reduced motion draws each chapter's settled frame once.
 */
export function HoloStage({
  chapter,
  insetLeft = 0,
  className = "",
}: {
  chapter: number;
  /** Pixels on the left covered by text; the camera frames the scene in the rest. */
  insetLeft?: number;
  className?: string;
}) {
  const { t } = useLang();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene] = useState(() => new HoloScene());
  const redraw = useRef<() => void>(() => {});

  const labels: HoloLabels = {
    shipper: t("holoShipper"),
    shipperSub: t("holoShipperSub"),
    broker: t("holoBroker"),
    brokerSub: t("holoBrokerSub"),
    carrier: t("holoCarrier"),
    carrierSub: t("holoCarrierSub"),
    fromShipper: t("holoFromShipper"),
    toTrucker: t("holoToTrucker"),
    brokerKeeps: t("holoBrokerKeeps"),
    limit: t("holoLimit"),
    blocked: t("holoBlocked"),
    you: t("holoYou"),
  };
  const labelsRef = useRef(labels);
  useEffect(() => {
    labelsRef.current = labels;
  });

  useEffect(() => {
    scene.setChapter(chapter);
    redraw.current();
  }, [chapter, scene]);

  useEffect(() => {
    scene.setInset(insetLeft);
    redraw.current();
  }, [insetLeft, scene]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const css = getComputedStyle(document.documentElement);
    const fonts: HoloFonts = {
      sans: css.getPropertyValue("--font-geist-sans").trim() || "system-ui, sans-serif",
      mono: css.getPropertyValue("--font-geist-mono").trim() || "ui-monospace, monospace",
    };

    let width = 0;
    let height = 0;
    const paint = () => drawHolo(ctx, scene, width, height, labelsRef.current, fonts);
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const pw = Math.round(width * dpr);
      const ph = Math.round(height * dpr);
      if (canvas.width === pw && canvas.height === ph) return;
      canvas.width = pw;
      canvas.height = ph;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    if (reduced) {
      redraw.current = () => {
        scene.settle();
        paint();
      };
      redraw.current();
      return () => ro.disconnect();
    }

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      scene.pointer = { x: (x / r.width) * 2 - 1, y: (y / r.height) * 2 - 1 };
      scene.hovered = scene.hitTest(x, y);
      canvas.style.cursor = scene.hovered ? "pointer" : "default";
      if (scene.hovered) canvas.dataset.cursor = "";
      else delete canvas.dataset.cursor;
    };
    const onLeave = () => {
      scene.pointer = null;
      scene.hovered = null;
    };
    const onDown = () => {
      if (scene.hovered) scene.ping(scene.hovered);
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onDown);

    let raf = 0;
    let last = performance.now();
    let visible = true;
    const frame = (now: number) => {
      if (!visible || document.hidden) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      scene.step(dt);
      paint();
    };
    const resume = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) resume();
    });
    io.observe(canvas);
    const onVisibility = () => {
      if (!document.hidden && visible) resume();
    };
    document.addEventListener("visibilitychange", onVisibility);
    redraw.current = () => {};
    resume();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
    };
  }, [scene]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={`${t("holoShipper")} → ${t("holoBroker")} → ${t("holoCarrier")}`}
      className={`block h-full w-full ${className}`}
      style={{ touchAction: "pan-y" }}
    />
  );
}
