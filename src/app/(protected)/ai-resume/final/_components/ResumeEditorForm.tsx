"use client";

import React, { useState } from "react";
import { CheckIcon, XMarkIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/solid";
import toast from "react-hot-toast";

interface ResumeEditorFormProps {
  initialData: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export default function ResumeEditorForm({
  initialData,
  onSave,
  onCancel,
  isSaving,
}: ResumeEditorFormProps) {
  const [formData, setFormData] = useState<any>(
    initialData || {
      header: {},
      summary: "",
      skills: [],
      experience: [],
      projects: [],
      education: [],
    }
  );

  const handleHeaderChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      header: { ...formData.header, [field]: value },
    });
  };

  const handleSkillsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData({
      ...formData,
      skills: val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  const handleArrayChange = (
    section: "experience" | "projects" | "education",
    index: number,
    field: string,
    value: string
  ) => {
    const newArray = [...(formData[section] || [])];
    if (!newArray[index]) newArray[index] = {};

    if (field === "bullets") {
      newArray[index][field] = value
        .split("\n")
        .map((b) => b.trim())
        .filter(Boolean);
    } else {
      newArray[index][field] = value;
    }

    setFormData({ ...formData, [section]: newArray });
  };

  const addArrayItem = (section: "experience" | "projects" | "education", emptyItem: any) => {
    setFormData({ ...formData, [section]: [...(formData[section] || []), emptyItem] });
  };

  const removeArrayItem = (section: "experience" | "projects" | "education", index: number) => {
    const newArray = [...(formData[section] || [])];
    newArray.splice(index, 1);
    setFormData({ ...formData, [section]: newArray });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-6 w-full animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-900">Edit Resume Details</h2>
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
          <XMarkIcon className="size-5" />
        </button>
      </div>

      <div className="flex flex-col gap-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {/* Header */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Contact Info
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              Full Name
              <input
                type="text"
                className="input input-sm input-bordered focus:outline-primary bg-slate-50"
                value={formData.header?.fullName || formData.header?.name || ""}
                onChange={(e) => handleHeaderChange("fullName", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              Email
              <input
                type="email"
                className="input input-sm input-bordered focus:outline-primary bg-slate-50"
                value={formData.header?.email || ""}
                onChange={(e) => handleHeaderChange("email", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              Phone
              <input
                type="text"
                className="input input-sm input-bordered focus:outline-primary bg-slate-50"
                value={formData.header?.phone || ""}
                onChange={(e) => handleHeaderChange("phone", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              Location
              <input
                type="text"
                className="input input-sm input-bordered focus:outline-primary bg-slate-50"
                value={formData.header?.location || ""}
                onChange={(e) => handleHeaderChange("location", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              LinkedIn URL
              <input
                type="text"
                className="input input-sm input-bordered focus:outline-primary bg-slate-50"
                value={formData.header?.linkedin || ""}
                onChange={(e) => handleHeaderChange("linkedin", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              GitHub URL
              <input
                type="text"
                className="input input-sm input-bordered focus:outline-primary bg-slate-50"
                value={formData.header?.github || ""}
                onChange={(e) => handleHeaderChange("github", e.target.value)}
              />
            </label>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Professional Summary
          </h3>
          <textarea
            className="textarea textarea-bordered focus:outline-primary w-full bg-slate-50 h-24"
            value={formData.summary || ""}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
          />
        </div>

        {/* Skills */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Skills (Comma Separated)
          </h3>
          <input
            type="text"
            className="input input-sm input-bordered focus:outline-primary w-full bg-slate-50"
            value={(formData.skills || []).join(", ")}
            onChange={handleSkillsChange}
          />
        </div>

        {/* Experience */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Experience
            </h3>
            <button
              onClick={() =>
                addArrayItem("experience", { company: "", role: "", duration: "", bullets: [] })
              }
              className="text-xs flex items-center gap-1 text-primary hover:underline font-medium"
            >
              <PlusIcon className="size-3" /> Add Role
            </button>
          </div>
          {(formData.experience || []).map((exp: any, idx: number) => (
            <div
              key={idx}
              className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative group"
            >
              <button
                onClick={() => removeArrayItem("experience", idx)}
                className="absolute top-3 right-3 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <TrashIcon className="size-4" />
              </button>
              <div className="grid grid-cols-2 gap-3 pr-6">
                <label className="flex flex-col gap-1 text-xs text-slate-600">
                  Company{" "}
                  <input
                    type="text"
                    className="input input-xs input-bordered"
                    value={exp.company || ""}
                    onChange={(e) =>
                      handleArrayChange("experience", idx, "company", e.target.value)
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-600">
                  Role{" "}
                  <input
                    type="text"
                    className="input input-xs input-bordered"
                    value={exp.role || exp.title || ""}
                    onChange={(e) => handleArrayChange("experience", idx, "role", e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-600">
                  Duration{" "}
                  <input
                    type="text"
                    className="input input-xs input-bordered"
                    value={exp.duration || ""}
                    onChange={(e) =>
                      handleArrayChange("experience", idx, "duration", e.target.value)
                    }
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-xs text-slate-600">
                Bullet Points (One per line)
                <textarea
                  className="textarea textarea-bordered textarea-xs h-20"
                  value={(exp.highlights || exp.bullets || []).join("\n")}
                  onChange={(e) => handleArrayChange("experience", idx, "bullets", e.target.value)}
                />
              </label>
            </div>
          ))}
        </div>

        {/* Projects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Projects</h3>
            <button
              onClick={() =>
                addArrayItem("projects", {
                  title: "",
                  duration: "",
                  github_link: "",
                  hosted_link: "",
                  bullets: [],
                })
              }
              className="text-xs flex items-center gap-1 text-primary hover:underline font-medium"
            >
              <PlusIcon className="size-3" /> Add Project
            </button>
          </div>
          {(formData.projects || []).map((proj: any, idx: number) => (
            <div
              key={idx}
              className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative group"
            >
              <button
                onClick={() => removeArrayItem("projects", idx)}
                className="absolute top-3 right-3 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <TrashIcon className="size-4" />
              </button>
              <div className="grid grid-cols-2 gap-3 pr-6">
                <label className="flex flex-col gap-1 text-xs text-slate-600">
                  Title{" "}
                  <input
                    type="text"
                    className="input input-xs input-bordered"
                    value={proj.title || ""}
                    onChange={(e) => handleArrayChange("projects", idx, "title", e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-600">
                  Duration{" "}
                  <input
                    type="text"
                    className="input input-xs input-bordered"
                    value={proj.duration || ""}
                    onChange={(e) => handleArrayChange("projects", idx, "duration", e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-600">
                  GitHub Link (Optional){" "}
                  <input
                    type="text"
                    className="input input-xs input-bordered"
                    value={proj.github_link || ""}
                    onChange={(e) =>
                      handleArrayChange("projects", idx, "github_link", e.target.value)
                    }
                    placeholder="e.g. https://github.com/..."
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-600">
                  Hosted Link (Optional){" "}
                  <input
                    type="text"
                    className="input input-xs input-bordered"
                    value={proj.hosted_link || ""}
                    onChange={(e) =>
                      handleArrayChange("projects", idx, "hosted_link", e.target.value)
                    }
                    placeholder="e.g. https://myproject.com"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-xs text-slate-600">
                Bullet Points / Description (One per line)
                <textarea
                  className="textarea textarea-bordered textarea-xs h-20"
                  value={
                    proj.bullets || proj.description
                      ? proj.bullets
                        ? proj.bullets.join("\n")
                        : proj.description
                      : ""
                  }
                  onChange={(e) => handleArrayChange("projects", idx, "bullets", e.target.value)}
                />
              </label>
            </div>
          ))}
        </div>

        {/* Education */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Education</h3>
            <button
              onClick={() =>
                addArrayItem("education", { institution: "", degree: "", duration: "" })
              }
              className="text-xs flex items-center gap-1 text-primary hover:underline font-medium"
            >
              <PlusIcon className="size-3" /> Add Education
            </button>
          </div>
          {(formData.education || []).map((edu: any, idx: number) => (
            <div
              key={idx}
              className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative group"
            >
              <button
                onClick={() => removeArrayItem("education", idx)}
                className="absolute top-3 right-3 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <TrashIcon className="size-4" />
              </button>
              <div className="grid grid-cols-2 gap-3 pr-6">
                <label className="flex flex-col gap-1 text-xs text-slate-600">
                  Institution{" "}
                  <input
                    type="text"
                    className="input input-xs input-bordered"
                    value={edu.institution || ""}
                    onChange={(e) =>
                      handleArrayChange("education", idx, "institution", e.target.value)
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-600">
                  Degree{" "}
                  <input
                    type="text"
                    className="input input-xs input-bordered"
                    value={edu.degree || ""}
                    onChange={(e) => handleArrayChange("education", idx, "degree", e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-600">
                  Duration/Year{" "}
                  <input
                    type="text"
                    className="input input-xs input-bordered"
                    value={edu.duration || edu.year || ""}
                    onChange={(e) =>
                      handleArrayChange("education", idx, "duration", e.target.value)
                    }
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(formData)}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2 bg-primary hover:opacity-90 text-white rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50"
        >
          {isSaving ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <CheckIcon className="size-4" strokeWidth={3} />
          )}
          Save Changes
        </button>
      </div>
    </div>
  );
}
