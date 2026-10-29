"use client";
import { usePathname } from "next/navigation";

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
  // One plain link to the Barabari products page: nothing to open, close or choose between.
  return (
    <a className="ws-button" href={home} onClick={confirm}>
      All products
    </a>
  );
}
