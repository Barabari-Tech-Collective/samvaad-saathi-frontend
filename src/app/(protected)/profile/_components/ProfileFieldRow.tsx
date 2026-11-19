import { useEffect, useRef } from "react";
import { PencilIcon, XMarkIcon } from "@heroicons/react/24/solid";
interface ProfileFieldRowProps {
  label: string;
  errorId?: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  error?: string;
  children: React.ReactNode;
}
export function ProfileFieldRow({
  label,
  errorId,
  isEditing,
  onEdit,
  onCancel,
  error,
  children,
}: ProfileFieldRowProps) {
  const content = useRef<HTMLDivElement>(null);
  const edit = useRef<HTMLButtonElement>(null);
  const previous = useRef(false);
  useEffect(() => {
    if (isEditing)
      content.current?.querySelector<HTMLElement>("select,input,textarea,button")?.focus();
    else if (previous.current) edit.current?.focus();
    previous.current = isEditing;
  }, [isEditing]);
  // A plain row in the profile card, like every other card in the app: the label,
  // the value or its form, and a text Edit/Cancel action on the same line.
  return (
    <fieldset className="min-w-0 border-t border-brand-line py-4 first-of-type:border-t-0">
      <legend className="sr-only">{label}</legend>
      <div className="flex items-center justify-between gap-3">
        <p aria-hidden="true" className="text-sm font-semibold text-brand-navy">
          {label}
        </p>
        <button
          ref={edit}
          aria-label={isEditing ? `Cancel editing ${label}` : `Edit ${label}`}
          onClick={isEditing ? onCancel : onEdit}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-brand-blue hover:bg-brand-blue-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          type="button"
        >
          {isEditing ? (
            <XMarkIcon className="size-4" aria-hidden="true" />
          ) : (
            <PencilIcon className="size-4" aria-hidden="true" />
          )}
          <span>{isEditing ? "Cancel" : "Edit"}</span>
        </button>
      </div>
      <div ref={content} className="mt-2">
        {children}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-brand-rose">
          {error}
        </p>
      )}
    </fieldset>
  );
}
