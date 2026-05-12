import { PencilIcon, XMarkIcon } from "@heroicons/react/24/solid";

interface ProfileFieldRowProps {
  label: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  error?: string;
  children: React.ReactNode;
}

export function ProfileFieldRow({
  label,
  isEditing,
  onEdit,
  onCancel,
  error,
  children,
}: ProfileFieldRowProps) {
  return (
    <div className="form-control">
      <label className="label flex justify-between items-center mb-2">
        <span className="label-text">{label}</span>
        {isEditing ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }}
            className="btn btn-xs btn-ghost"
            type="button"
          >
            <XMarkIcon className="size-4" />
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
            className="btn btn-xs btn-ghost"
            type="button"
          >
            <PencilIcon className="size-4" />
          </button>
        )}
      </label>
      {children}
      {error && (
        <label className="label">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}
    </div>
  );
}
