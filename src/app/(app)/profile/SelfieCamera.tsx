"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

/** True when this browser can open a live camera. Otherwise the caller keeps the file-upload path. */
export const cameraSupported = () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

/** Live front-camera preview with an oval framing guide. Stops the camera when done or unmounted. */
export function SelfieCamera({ onCapture, onClose }: { onCapture: (file: File) => void; onClose: (reason?: "denied" | "error") => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const [ready, setReady] = useState(false);
  const [stalled, setStalled] = useState(false);

  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        s.getTracks().forEach((t) => t.addEventListener("ended", () => onClose("error")));
        const v = video.current;
        if (v) {
          v.srcObject = s;
          v.play().catch(() => setStalled(true));
        }
      })
      .catch(() => {
        if (!cancelled) onClose("denied");
      });
    cancel.current?.focus();
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const timer = setTimeout(() => setStalled(true), 3000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once per mount
  }, []);

  const snap = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    c.toBlob(
      (blob) => {
        if (!blob) return onClose("error");
        stop();
        onCapture(new File([blob], "selfie.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-[3/4] w-full max-w-xs overflow-hidden rounded-card bg-inset">
        <video
          ref={video}
          playsInline
          muted
          autoPlay
          aria-label="Live camera preview"
          onPlaying={() => setReady(true)}
          onLoadedData={() => setReady(true)}
          className="h-full w-full -scale-x-100 object-cover"
        />
        <svg viewBox="0 0 300 400" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
          <defs>
            <mask id="selfie-oval">
              <rect width="300" height="400" fill="white" />
              <ellipse cx="150" cy="180" rx="85" ry="115" fill="black" />
            </mask>
          </defs>
          <rect width="300" height="400" fill="rgba(0,0,0,0.45)" mask="url(#selfie-oval)" />
          <ellipse cx="150" cy="180" rx="85" ry="115" fill="none" stroke="white" strokeWidth="3" strokeDasharray="8 6" />
        </svg>
      </div>
      <p className="text-center text-sm text-stone-600">Fit your face in the oval. Face a window or step outside; avoid lamps and glare behind you.</p>
      {stalled && !ready && (
        <p role="alert" className="text-center text-sm text-stone-600">
          The camera isn&apos;t starting. Tap Cancel, then Upload a photo.
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Camera controls">
        <Button type="button" variant="primary" size="sm" disabled={!ready} onClick={snap}>
          Take photo
        </Button>
        <Button ref={cancel} type="button" variant="secondary" size="sm" onClick={() => onClose()}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
