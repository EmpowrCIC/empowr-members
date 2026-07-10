"use client";

// Briefly re-poll server data while the Stripe webhook lands — the
// confirmation page renders "confirming…" until the booking flips to
// confirmed. Stops itself after ~20s; the page offers a manual reload.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    let ticks = 0;
    const timer = setInterval(() => {
      if (++ticks > 10) {
        clearInterval(timer);
        return;
      }
      router.refresh();
    }, 2000);
    return () => clearInterval(timer);
  }, [active, router]);

  return null;
}
