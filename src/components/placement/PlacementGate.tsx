"use client";
import { useState } from "react";
import CourseChoiceForm from "@/components/placement/CourseChoiceForm";
import { usePlacement } from "@/components/placement/usePlacement";

const dismissKey = (account: unknown) => `placement-dismissed:${String(account)}`;

function dismissedThisVisit(account: unknown): boolean {
  try {
    return sessionStorage.getItem(dismissKey(account)) === "1";
  } catch {
    return false;
  }
}

// Shown once, until the learner has chosen. If the list cannot load, or nothing is open yet, it
// stays out of the way: the app remains usable and the Profile page explains what is missing.
export default function PlacementGate() {
  const [hidden, setHidden] = useState(false);
  const full = usePlacement({ loadOptions: false });
  if (full.overview?.needs_placement !== true || hidden || dismissedThisVisit(full.account))
    return null;
  const choices = full.choices;
  if (!choices || choices.items.length === 0) return null;
  const close = () => {
    try {
      sessionStorage.setItem(dismissKey(full.account), "1");
    } catch {
      // Without storage it only lasts until this page is closed.
    }
    setHidden(true);
  };
  return (
    <div
      className="modal modal-open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="placement-title"
    >
      <div className="modal-box max-w-lg">
        <h2 id="placement-title" className="text-lg font-semibold">
          Which course and batch are you in?
        </h2>
        <p className="mt-2 text-sm leading-relaxed">
          Choose every course you are taking, so your practice and assigned interviews match it.
          {full.overview?.college ? ` Your college: ${full.overview.college}.` : ""}
        </p>
        <div className="mt-4">
          <CourseChoiceForm
            items={choices.items}
            initial={[]}
            saving={full.saving}
            error={full.saveError}
            submitLabel="Save my courses"
            onSubmit={(keys) => full.save(keys, () => setHidden(true))}
            onCancel={close}
          />
        </div>
      </div>
    </div>
  );
}
