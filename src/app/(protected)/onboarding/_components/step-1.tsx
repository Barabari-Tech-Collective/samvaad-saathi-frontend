"use client";
import PageHeading from "@/components/studio/PageHeading";
import { DEGREE_OPTIONS, UNIVERSITY_OPTIONS } from "@/lib/constants";
import { useState } from "react";

interface Step1Props {
  onNext: (data: { degree: string; university: string }) => void;
}

export default function Step1({ onNext }: Step1Props) {
  const [degree, setDegree] = useState("");
  const [university, setUniversity] = useState("");
  const [customUniversity, setCustomUniversity] = useState("");

  const degrees = DEGREE_OPTIONS;
  const universities = UNIVERSITY_OPTIONS;

  return (
    <div>
      <PageHeading
        title="Tell us a little about yourself."
        description="Add your education details. You can update these later in Profile."
      />
      <div className="studio-panel">
        {/* Degree Dropdown */}
        <div className="mb-6">
          <label
            htmlFor="onboarding-degree"
            className="block mb-3 text-[16px] font-noto font-[600] text-gray-800"
          >
            Degree
          </label>
          <select
            id="onboarding-degree"
            value={degree}
            onChange={(e) => setDegree(e.target.value)}
            className="select select-bordered w-full h-[60px] text-gray-800 font-noto text-[16px] rounded-xl"
          >
            <option value="" disabled>
              Select Degree
            </option>
            {degrees.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* University Dropdown */}
        <div className="mb-6">
          <label
            htmlFor="onboarding-university"
            className="block mb-3 text-[16px] font-noto font-[600] text-gray-800"
          >
            University
          </label>
          <select
            id="onboarding-university"
            value={university}
            onChange={(e) => {
              setUniversity(e.target.value);
              if (e.target.value !== "Others") {
                setCustomUniversity("");
              }
            }}
            className="select select-bordered w-full h-[60px] text-gray-800 font-noto text-[16px] rounded-xl"
          >
            <option value="" disabled>
              Select University
            </option>
            {universities.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {university === "Others" && (
            <input
              type="text"
              aria-label="University name"
              placeholder="Enter university name"
              value={customUniversity}
              onChange={(e) => setCustomUniversity(e.target.value)}
              className="input input-bordered w-full h-[60px] text-gray-800 font-noto text-[16px] rounded-xl mt-3"
            />
          )}
        </div>

        <button
          onClick={() =>
            onNext({
              degree,
              university: university === "Others" ? customUniversity : university,
            })
          }
          disabled={!degree || !university || (university === "Others" && !customUniversity.trim())}
          className="btn btn-neutral btn-block p-6 rounded-xl mt-6"
        >
          Continue to career details
        </button>
      </div>
    </div>
  );
}
