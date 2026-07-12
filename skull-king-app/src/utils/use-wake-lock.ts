import { useEffect } from "react";

// Keeps the device screen awake while `active` is true so mobile browsers
// don't suspend the app (and its polling) mid-game. Best-effort: silently
// does nothing where the Screen Wake Lock API is unsupported or denied.
export const useWakeLock = (active: boolean) => {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) {
      return;
    }

    let wakeLock: WakeLockSentinel | null = null;
    let released = false;

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (released) {
          lock.release();
        } else {
          wakeLock = lock;
        }
      } catch {
        // Request fails when the page is hidden or the battery is low
      }
    };

    // The browser auto-releases the lock whenever the page is hidden,
    // so re-acquire it each time the page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        acquire();
      }
    };

    acquire();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      wakeLock?.release().catch(() => {});
    };
  }, [active]);
};
