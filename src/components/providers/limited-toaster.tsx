"use client";

import { useEffect } from "react";
import { Toaster, toast, useToasterStore } from "react-hot-toast";

const MAX_TOASTS = 3;

export function LimitedToaster() {
  const { toasts } = useToasterStore();

  useEffect(() => {
    if (toasts.length <= MAX_TOASTS) return;

    const excess = toasts.length - MAX_TOASTS;
    for (let i = 0; i < excess; i++) {
      const oldest = toasts[toasts.length - 1 - i];
      toast.remove(oldest.id);
    }
  }, [toasts]);

  return <Toaster />;
}
