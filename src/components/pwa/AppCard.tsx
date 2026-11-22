"use client";

import { useEffect, useState } from "react";
import { Button, Card, Checkbox } from "@/components/ui";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Prefs = { morning: boolean; prices: boolean; votes: boolean };

const b64ToBytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** "Get the app" and notification switches, on the Profile page. */
export default function AppCard() {
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [push, setPush] = useState<{ supported: boolean; configured: boolean; key: string | null }>({ supported: false, configured: false, key: null });
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>({ morning: true, prices: true, votes: true });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    Promise.resolve().then(() => {
      setStandalone(isStandalone);
      setIos(isIos);
    });
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    fetch("/api/push")
      .then((r) => r.json())
      .then((j) => setPush({ supported, configured: !!j.configured, key: j.publicKey ?? null }))
      .catch(() => setPush({ supported, configured: false, key: null }));
    if (supported) {
      navigator.serviceWorker.getRegistration().then((reg) => reg?.pushManager.getSubscription()).then((s) => s && setEndpoint(s.endpoint)).catch(() => {});
    }
    try {
      const saved = localStorage.getItem("valette-push-prefs");
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Prefs>;
        Promise.resolve().then(() => setPrefs((p) => ({ ...p, ...parsed })));
      }
    } catch {
      /* storage blocked */
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const install = async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    await installEvt.userChoice.catch(() => null);
    setInstallEvt(null);
  };

  const turnOn = async () => {
    if (!push.key) return;
    setBusy(true);
    setNote(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setNote("Notifications are blocked for this site. Allow them in your browser or phone settings.");
        return;
      }
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(push.key) }));
      const r = await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "subscribe", subscription: sub.toJSON(), prefs }) });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setNote(j.error ?? "Could not turn on notifications.");
        return;
      }
      setEndpoint(sub.endpoint);
      await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "test" }) });
      setNote("On. We just sent a test notification.");
    } catch {
      setNote("This browser couldn't turn on notifications.");
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "unsubscribe", endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setEndpoint(null);
      setNote("Off on this device.");
    } finally {
      setBusy(false);
    }
  };

  const setPref = async (k: keyof Prefs, v: boolean) => {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    try {
      localStorage.setItem("valette-push-prefs", JSON.stringify(next));
    } catch {
      /* storage blocked */
    }
    if (endpoint) await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "prefs", endpoint, prefs: { [k]: v } }) }).catch(() => {});
  };

  return (
    <Card as="section" className="space-y-4">
      <div className="space-y-2">
        <h2 className="font-display text-lg font-bold leading-snug">The app</h2>
        {standalone ? (
          <p className="text-sm text-stone-600">
            <span aria-hidden="true">✓ </span>Installed on this device.
          </p>
        ) : installEvt ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="primary" size="sm" onClick={install}>
              Add valette to your home screen
            </Button>
          </div>
        ) : ios ? (
          <p className="text-sm text-stone-600">
            On iPhone: tap the <b>Share</b> button in Safari, then <b>Add to Home Screen</b>. It opens full screen like an app, and notifications work once it&apos;s installed.
          </p>
        ) : (
          <p className="text-sm text-stone-600">Open your browser menu and choose <b>Install</b> or <b>Add to Home screen</b>.</p>
        )}
      </div>

      <div className="space-y-3 border-t border-line pt-4">
        <h3 className="font-semibold">Notifications</h3>
        {!push.supported ? (
          <p className="text-sm text-stone-600">{ios && !standalone ? "Add valette to your home screen first, then turn notifications on here." : "This browser doesn't support notifications."}</p>
        ) : !push.configured ? (
          <p className="text-sm text-stone-600">Notifications are coming soon. In the meantime, new votes and price drops show at the top of Today.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {endpoint ? (
                <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={turnOff}>
                  Turn off on this device
                </Button>
              ) : (
                <Button type="button" variant={installEvt ? "secondary" : "primary"} size="sm" disabled={busy} aria-busy={busy || undefined} onClick={turnOn}>
                  {busy ? "Turning on…" : "Turn on notifications"}
                </Button>
              )}
            </div>
            <div className="flex flex-col items-start gap-0.5">
              {(
                [
                  ["morning", "Morning outfit, around 7am"],
                  ["votes", "When a friend votes on your look"],
                  ["prices", "Price drops on finds you watch"],
                ] as Array<[keyof Prefs, string]>
              ).map(([k, label]) => (
                <Checkbox key={k} checked={prefs[k]} onChange={(e) => setPref(k, e.target.checked)} label={label} />
              ))}
            </div>
          </>
        )}
        <p role="status" aria-live="polite" className="text-sm text-stone-700 empty:hidden">
          {note}
        </p>
      </div>
    </Card>
  );
}
