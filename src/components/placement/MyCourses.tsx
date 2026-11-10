"use client";
import { useState } from "react";
import CourseChoiceForm from "@/components/placement/CourseChoiceForm";
import { usePlacement } from "@/components/placement/usePlacement";

// On the Profile page: what you chose, and a way to change it.
export default function MyCourses() {
  const [editing, setEditing] = useState(false);
  const p = usePlacement({ loadOptions: editing });
  const overview = p.overview;
  return (
    <section className="studio-profile-card space-y-3" aria-labelledby="my-courses-heading">
      <h2 id="my-courses-heading" className="text-xl font-semibold">
        My courses
      </h2>
      {p.mine.isError ? (
        <div role="alert" className="space-y-2">
          <p>Your courses could not be loaded.</p>
          <button
            type="button"
            className="btn btn-outline min-h-11"
            onClick={() => void p.mine.refetch()}
          >
            Try again
          </button>
        </div>
      ) : !overview ? (
        <p role="status">Loading your courses…</p>
      ) : editing ? (
        p.options.isError ? (
          <div role="alert" className="space-y-2">
            <p>The list of courses could not be loaded right now. Your choice was not changed.</p>
            <button
              type="button"
              className="btn btn-outline min-h-11"
              onClick={() => void p.options.refetch()}
            >
              Try again
            </button>
            <button
              type="button"
              className="btn btn-outline min-h-11"
              onClick={() => setEditing(false)}
            >
              Close
            </button>
          </div>
        ) : !p.choices ? (
          <p role="status">Loading the courses you can choose…</p>
        ) : p.choices.items.length === 0 ? (
          <div className="space-y-2">
            <p>No courses are open for choosing yet. Ask your teacher.</p>
            <button
              type="button"
              className="btn btn-outline min-h-11"
              onClick={() => setEditing(false)}
            >
              Close
            </button>
          </div>
        ) : (
          <CourseChoiceForm
            items={mergeHeld(p.choices.items, overview.selected)}
            initial={overview.selected.map((s) => s.batch_key)}
            saving={p.saving}
            error={p.saveError}
            submitLabel="Save my courses"
            cancelLabel="Cancel"
            onSubmit={(keys) => p.save(keys, () => setEditing(false))}
            onCancel={() => setEditing(false)}
          />
        )
      ) : (
        <>
          {overview.college && <p className="studio-muted">Your college: {overview.college}</p>}
          {overview.selected.length ? (
            <ul className="space-y-1">
              {overview.selected.map((s) => (
                <li key={s.batch_key}>{s.label}</li>
              ))}
            </ul>
          ) : (
            <p>
              {overview.needs_placement
                ? "You have not chosen a course yet."
                : "Your course was set by your teacher."}
            </p>
          )}
          <button
            type="button"
            className="btn btn-outline min-h-11"
            onClick={() => setEditing(true)}
          >
            {overview.selected.length ? "Change my courses" : "Choose my courses"}
          </button>
        </>
      )}
    </section>
  );
}

// A batch the learner already holds stays selectable even if the teacher has since closed it.
function mergeHeld<T extends { batch_key: string }>(open: T[], held: T[]): T[] {
  const keys = new Set(open.map((o) => o.batch_key));
  return [...open, ...held.filter((h) => !keys.has(h.batch_key))];
}
