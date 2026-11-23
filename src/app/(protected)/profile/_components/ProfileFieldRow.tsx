import { useEffect, useRef } from "react";
import { PencilIcon } from "@heroicons/react/24/solid";

interface ProfileFieldRowProps {
  label: string;
  /** What the row shows when it is not being edited. */
  value: React.ReactNode;
  errorId?: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave?: () => void;
  saving?: boolean;
  /** Edit is unavailable while another row is open. */
  locked?: boolean;
  error?: string;
  children: React.ReactNode;
}

// One row of the profile card. Read mode is plain text with an Edit action, like
// every other studio card; the form control only appears while editing, with its own
// Save and Cancel, so there are no disabled boxes and no save button far from the field.
export function ProfileFieldRow({
  label,
  value,
  errorId,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  saving = false,
  locked = false,
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
    <div className="min-w-0 border-t border-brand-line py-4 first-of-type:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-muted">{label}</p>
          {!isEditing && (
            <p className="mt-1 break-words text-base font-medium text-brand-navy">{value}</p>
          )}
        </div>
        {!isEditing && (
          <button
            ref={edit}
            type="button"
            aria-label={`${"Edit"} ${label}`}
            onClick={onEdit}
            disabled={locked}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-brand-blue hover:bg-brand-blue-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:opacity-40"
          >
            <PencilIcon className="size-4" aria-hidden="true" />
            <span>{"Edit"}</span>
          </button>
        )}
      </div>
      {isEditing && (
        <div ref={content} className="mt-3">
          {children}
          {error && (
            <p id={errorId} role="alert" className="mt-2 text-sm text-brand-danger">
              {error}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {onSave && (
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="ws-button min-h-11"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-brand-blue hover:bg-brand-blue-wash"
            >
              {"Cancel"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
