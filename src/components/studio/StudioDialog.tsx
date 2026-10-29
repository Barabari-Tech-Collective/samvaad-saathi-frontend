"use client";
import { useEffect, useRef, type ReactNode } from "react";

/** Mount only while open; native modal behavior owns focus containment and Escape. */
export default function StudioDialog({
  children,
  labelledBy,
  onClose,
}: {
  children: ReactNode;
  labelledBy: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={onClose}
      className="modal p-4 backdrop:bg-black/50"
    >
      {children}
    </dialog>
  );
}
