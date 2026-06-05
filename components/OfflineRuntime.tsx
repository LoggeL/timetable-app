"use client";

import { useEffect } from "react";

const SW_URL = "/sw.js";
const PRECACHE_NAME = "timetable-offline-v2026-06-05-1-client";
const OFFLINE_CORE_URLS = [
  "/",
  "/api/votes",
  "/manifest.webmanifest",
  "/icon.png",
  "/apple-icon.png",
  "/og-image.png",
  "/images/rock-am-ring-bg.png",
  "/images/stagetopia-bg.png",
  "/images/southside-bg.png",
  "/images/highfield-bg.png",
];

function sameOriginPath(url: string) {
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

async function cacheCurrentPageShell() {
  if (!("caches" in window)) return;

  const resourceUrls = Array.from(document.querySelectorAll<HTMLLinkElement | HTMLScriptElement | HTMLImageElement>("link[href], script[src], img[src]"))
    .map((element) => element instanceof HTMLLinkElement ? element.href : element.src)
    .map(sameOriginPath)
    .filter((url): url is string => Boolean(url));

  const performanceUrls = performance.getEntriesByType("resource")
    .map((entry) => sameOriginPath(entry.name))
    .filter((url): url is string => Boolean(url));

  const urls = Array.from(new Set([...OFFLINE_CORE_URLS, ...resourceUrls, ...performanceUrls]));
  const cache = await caches.open(PRECACHE_NAME);

  await Promise.allSettled(
    urls.map((url) => cache.add(new Request(url, { cache: "reload" }))),
  );
}

export function OfflineRuntime() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;

    let cancelled = false;

    window.addEventListener("load", () => {
      if (cancelled) return;
      navigator.serviceWorker
        .register(SW_URL)
        .then(() => navigator.serviceWorker.ready)
        .then(() => cacheCurrentPageShell())
        .catch((error) => {
          console.warn("Offline setup failed", error);
        });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
