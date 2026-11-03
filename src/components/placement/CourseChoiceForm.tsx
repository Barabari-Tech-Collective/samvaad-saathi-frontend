"use client";
import { useState } from "react";
import { groupByCourse, toggleChoice, type PlacementChoice } from "@/lib/placement";

interface CourseChoiceFormProps {
  items: PlacementChoice[];
  initial: string[];
  saving: boolean;
  error: string | null;
  submitLabel: string;
  onSubmit: (batchKeys: string[]) => void;
  onCancel?: () => void;
  cancelLabel?: string;
}

// Pick every course you are taking. One batch per course: choosing another batch of the same
// course replaces the first.
export default function CourseChoiceForm({
  items,
  initial,
  saving,
  error,
  submitLabel,
  onSubmit,
  onCancel,
  cancelLabel = "Not now",
}: CourseChoiceFormProps) {
  const [selected, setSelected] = useState<string[]>(initial);
  const groups = groupByCourse(items);
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (selected.length) onSubmit(selected);
      }}
    >
      {groups.map((group) => (
        <fieldset key={group.course_id} className="space-y-1">
          <legend className="font-medium">{group.title}</legend>
          {group.batches.map((batch) => (
            <label
              key={batch.batch_key}
              className="flex min-h-11 items-center gap-3 rounded-lg border px-3 text-sm"
            >
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={selected.includes(batch.batch_key)}
                onChange={() => setSelected((now) => toggleChoice(now, batch.batch_key, items))}
              />
              <span>{batch.batch_name}</span>
            </label>
          ))}
        </fieldset>
      ))}
      <p className="studio-muted text-sm">One batch for each course. You can change this later.</p>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="btn btn-primary min-h-11"
          disabled={saving || selected.length === 0}
        >
          {saving ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            className="btn btn-outline min-h-11"
            onClick={onCancel}
            disabled={saving}
          >
            {cancelLabel}
          </button>
        )}
      </div>
    </form>
  );
}
