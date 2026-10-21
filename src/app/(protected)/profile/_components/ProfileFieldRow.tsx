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
  return (
    <fieldset className="min-w-0 space-y-2 rounded-2xl border border-[#DEE8FB] bg-white p-4">
      <legend className="px-2 text-sm font-semibold text-[#1F285B]">{label}</legend>
      <div className="flex justify-end">
        <button
          ref={edit}
          aria-label={isEditing ? `Cancel editing ${label}` : `Edit ${label}`}
          onClick={isEditing ? onCancel : onEdit}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#C0CFF2] text-[#344499]"
          type="button"
        >
          {isEditing ? (
            <XMarkIcon className="size-5" aria-hidden="true" />
          ) : (
            <PencilIcon className="size-5" aria-hidden="true" />
          )}
        </button>
      </div>
      <div ref={content}>{children}</div>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-[#9F1239]">
          {error}
        </p>
      )}
    </fieldset>
  );
}
