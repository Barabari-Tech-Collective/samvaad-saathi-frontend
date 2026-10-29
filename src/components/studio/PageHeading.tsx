import type { ReactNode } from "react";

export default function PageHeading({
  eyebrow,
  title,
  description,
  action,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`studio-page-heading ${className}`}>
      <div>
        {eyebrow && <p className="studio-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="studio-description">{description}</p>}
      </div>
      {action && <div className="studio-heading-action">{action}</div>}
    </header>
  );
}
