"use client";

import PageHeading from "@/components/studio/PageHeading";
import { ROLE_OPTIONS, UNIVERSITY_OPTIONS } from "@/lib/constants";
import { useState } from "react";

/** The only two things needed before a learner can start. The rest can wait for Profile. */
export default function FirstSetup({
  onSubmit,
  saving,
}: {
  onSubmit: (data: { university: string; target_position: string }) => void;
  saving: boolean;
}) {
  const [role, setRole] = useState("");
  const [college, setCollege] = useState("");
  const [other, setOther] = useState("");
  const university = college === "Others" ? other.trim() : college;
  return (
    <form
      className="studio-panel space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (role && university) onSubmit({ university, target_position: role });
      }}
    >
      <PageHeading title="Welcome" description="Two quick answers and you can start practising." />
      <div className="space-y-2">
        <label htmlFor="first-role" className="block font-bold">
          What job are you preparing for?
        </label>
        <select id="first-role" className="select select-bordered w-full" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="" disabled>
            Choose a job
          </option>
          {ROLE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
          <option value="Not sure yet">Not sure yet</option>
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor="first-college" className="block font-bold">
          Which college are you from?
        </label>
        <select id="first-college" className="select select-bordered w-full" value={college} onChange={(e) => setCollege(e.target.value)}>
          <option value="" disabled>
            Choose your college
          </option>
          {UNIVERSITY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {college === "Others" && (
          <input aria-label="College name" className="input input-bordered w-full" value={other} placeholder="Your college" onChange={(e) => setOther(e.target.value)} />
        )}
      </div>
      <button type="submit" className="btn btn-neutral btn-block btn-lg" disabled={!role || !university || saving}>
        {saving ? "Saving…" : "Start practising"}
      </button>
    </form>
  );
}
