"use client";

import { useEffect } from "react";

/** Registers the service worker once per page load. Skipped in local dev unless ?sw=1. */
export default function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const dev = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (dev && !new URLSearchParams(location.search).has("sw")) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* unsupported or blocked: the site works the same without it */
    });
  }, []);
  return null;
}
