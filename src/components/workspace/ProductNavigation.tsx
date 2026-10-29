"use client";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function centralHome(): string | null {
  try {
    const u = new URL(
      process.env.NEXT_PUBLIC_CENTRAL_HOME_ORIGIN || "https://home.barabaricollective.org"
    );
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.search ||
      u.hash ||
      u.pathname !== "/"
    )
      return null;
    return u.origin + "/products";
  } catch {
    return null;
  }
}
export default function ProductNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const home = centralHome();
  if (!home) return null;
  const guarded = ![
    "/home",
    "/practice",
    "/history",
    "/assessment-reviews",
    "/human-interviews",
  ].includes(pathname);
  const confirm = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      guarded &&
      !window.confirm(
        "Leave this task? Unsaved changes or recordings may be lost. Choose Cancel to finish or save your work first."
      )
    )
      event.preventDefault();
  };
  return (
    <div className="relative">
      <button
        type="button"
        className="ws-button"
        aria-expanded={open}
        aria-controls="student-products"
        onClick={() => setOpen(!open)}
      >
        Products
      </button>
      {open && (
        <nav
          id="student-products"
          aria-label="Product navigation"
          className="absolute right-0 top-full z-50 mt-2 min-w-56 rounded-xl border bg-white p-3 shadow-lg"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              (event.currentTarget.previousElementSibling as HTMLElement)?.focus();
            }
          }}
        >
          <p className="px-2 py-2 font-semibold" aria-current="true">
            Samvaad Saathi
          </p>
          <a className="ws-button w-full" href={home} onClick={confirm}>
            All products
          </a>
          <a
            className="ws-button mt-2 w-full"
            href={home}
            target="_blank"
            rel="noopener noreferrer"
            onClick={confirm}
          >
            All products (new tab)
          </a>
          <p className="px-2 py-2 text-sm">Sampark learner app: unavailable</p>
          <p className="px-2 py-2 text-sm">CodeGuru: coming later</p>
        </nav>
      )}
    </div>
  );
}
