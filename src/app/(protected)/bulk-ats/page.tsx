"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { apiClient, ENDPOINTS } from "@/lib/api-config";
import {
  BulkATSBatchDetail,
  BulkATSBatchSummary,
  BulkATSDriveStatus,
  BulkATSCandidateDetail,
  BulkATSCandidateList,
  BulkATSCandidateStatus,
  BulkATSIngestResponse,
  BulkATSSelf,
} from "@/features/bulk-ats/types";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  DocumentArrowUpIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const TERMINAL_STATUSES: BulkATSCandidateStatus[] = ["completed", "needs_review", "failed"];
const MAX_CANDIDATES_PER_REQUEST = 100;

function humanize(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status: string): string {
  if (status === "completed") return "bg-emerald-100 text-emerald-800";
  if (status === "failed") return "bg-red-100 text-red-800";
  if (status === "needs_review") return "bg-amber-100 text-amber-900";
  if (status === "draft") return "bg-slate-100 text-slate-700";
  return "bg-blue-100 text-blue-800";
}

function Score({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">—</span>;
  const color = value >= 75 ? "text-emerald-700" : value >= 50 ? "text-amber-700" : "text-red-700";
  return <span className={`font-bold tabular-nums ${color}`}>{value.toFixed(1)}</span>;
}

export default function BulkATSPage() {
  const { user, loading: authLoading } = useAuth();
  const canUseBulkAts = Boolean(user?.authorizedUser.canUseBulkAts);
  const router = useRouter();
  // This is a recruiter workspace living in the student app: anyone without the role is
  // sent home instead of being shown any of its screens or wording.
  useEffect(() => {
    if (!authLoading && !canUseBulkAts) router.replace("/home");
  }, [authLoading, canUseBulkAts, router]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [batchName, setBatchName] = useState("");
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [evaluationIntent, setEvaluationIntent] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [preferredSkills, setPreferredSkills] = useState("");
  const [experienceMode, setExperienceMode] = useState<"fresher" | "experienced">("experienced");
  const [retentionDays, setRetentionDays] = useState("90");
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  const [linkSheet, setLinkSheet] = useState<File | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [reviewerDecision, setReviewerDecision] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [interviewOutcome, setInterviewOutcome] = useState("");
  const [candidateSort, setCandidateSort] = useState<
    "score" | "confidence" | "review_priority" | "created"
  >("review_priority");
  const [ingestMessage, setIngestMessage] = useState<string | null>(null);

  const selfQuery = apiClient.useQuery<BulkATSSelf>({
    key: ["bulk-ats-self"],
    url: ENDPOINTS.BULK_ATS.ME,
    enabled: canUseBulkAts,
    options: { staleTime: 60_000 },
  });

  const batchesQuery = apiClient.useQuery<BulkATSBatchSummary[]>({
    key: ["bulk-ats-batches"],
    url: ENDPOINTS.BULK_ATS.BATCHES,
    enabled: selfQuery.isSuccess,
    options: { staleTime: 10_000 },
  });

  const driveStatusQuery = apiClient.useQuery<BulkATSDriveStatus>({
    key: ["bulk-ats-drive-status"],
    url: ENDPOINTS.BULK_ATS.DRIVE_STATUS,
    enabled: selfQuery.isSuccess,
    options: { staleTime: 30_000 },
  });

  const batchQuery = apiClient.useQuery<BulkATSBatchDetail>({
    key: ["bulk-ats-batch", selectedBatchId],
    url: selectedBatchId ? ENDPOINTS.BULK_ATS.BATCH(selectedBatchId) : ENDPOINTS.BULK_ATS.BATCH(0),
    enabled: selectedBatchId !== null,
    options: {
      refetchInterval: (query) => {
        const data = query.state.data as BulkATSBatchDetail | undefined;
        return data?.status === "processing" ? 3_000 : false;
      },
      staleTime: 0,
    },
  });

  const candidatesQuery = apiClient.useQuery<BulkATSCandidateList>({
    key: ["bulk-ats-candidates", selectedBatchId, candidateSort],
    url: selectedBatchId
      ? ENDPOINTS.BULK_ATS.CANDIDATES(selectedBatchId)
      : ENDPOINTS.BULK_ATS.CANDIDATES(0),
    enabled: selectedBatchId !== null,
    params: { limit: 200, sort: candidateSort },
    options: {
      refetchInterval: (query) => {
        const data = query.state.data as BulkATSCandidateList | undefined;
        return data?.candidates.some((candidate) => !TERMINAL_STATUSES.includes(candidate.status))
          ? 3_000
          : false;
      },
      staleTime: 0,
    },
  });

  const candidateQuery = apiClient.useQuery<BulkATSCandidateDetail>({
    key: ["bulk-ats-candidate", selectedCandidateId],
    url: selectedCandidateId
      ? ENDPOINTS.BULK_ATS.CANDIDATE(selectedCandidateId)
      : ENDPOINTS.BULK_ATS.CANDIDATE(0),
    enabled: selectedCandidateId !== null,
    options: { staleTime: 0 },
  });

  const createBatch = apiClient.useMutation<BulkATSBatchSummary, FormData>({
    url: ENDPOINTS.BULK_ATS.BATCHES,
    config: { headers: { "Content-Type": "multipart/form-data" } },
    successMessage: "Batch created",
  });

  const uploadResumes = apiClient.useMutation<BulkATSIngestResponse, FormData>({
    url: selectedBatchId
      ? ENDPOINTS.BULK_ATS.RESUMES(selectedBatchId)
      : ENDPOINTS.BULK_ATS.RESUMES(0),
    config: { headers: { "Content-Type": "multipart/form-data" } },
  });

  const importLinks = apiClient.useMutation<BulkATSIngestResponse, FormData>({
    url: selectedBatchId
      ? ENDPOINTS.BULK_ATS.IMPORT_LINKS(selectedBatchId)
      : ENDPOINTS.BULK_ATS.IMPORT_LINKS(0),
    config: { headers: { "Content-Type": "multipart/form-data" } },
  });

  const rerunCandidate = apiClient.useMutation<{ candidateId: number; queued: boolean }, undefined>(
    {
      url: selectedCandidateId
        ? ENDPOINTS.BULK_ATS.RERUN(selectedCandidateId)
        : ENDPOINTS.BULK_ATS.RERUN(0),
    }
  );

  const reviewCandidate = apiClient.useMutation<BulkATSCandidateDetail, FormData>({
    url: selectedCandidateId
      ? ENDPOINTS.BULK_ATS.REVIEW(selectedCandidateId)
      : ENDPOINTS.BULK_ATS.REVIEW(0),
    method: "patch",
    config: { headers: { "Content-Type": "multipart/form-data" } },
  });

  const connectDrive = apiClient.useMutation<{ authorizationUrl: string }, undefined>({
    url: ENDPOINTS.BULK_ATS.DRIVE_CONNECT,
  });

  const disconnectDrive = apiClient.useMutation<void, undefined>({
    url: ENDPOINTS.BULK_ATS.DRIVE_CONNECTION,
    method: "delete",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const driveResult = params.get("drive");
    if (!driveResult) return;
    if (driveResult === "connected")
      toast.success("Google Drive connected for private resume access");
    else toast.error(params.get("reason") || "Google Drive connection failed");
    params.delete("drive");
    params.delete("reason");
    const query = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, []);

  useEffect(() => {
    if (selectedBatchId === null && batchesQuery.data?.length) {
      setSelectedBatchId(batchesQuery.data[0].id);
    }
  }, [batchesQuery.data, selectedBatchId]);

  useEffect(() => {
    if (candidateQuery.data) {
      setReviewerNotes(candidateQuery.data.reviewerNotes ?? "");
      setReviewerDecision(candidateQuery.data.reviewerDecision ?? "");
      setDecisionReason(candidateQuery.data.decisionReason ?? "");
      setInterviewOutcome(candidateQuery.data.interviewOutcome ?? "");
    }
  }, [candidateQuery.data]);

  const isProcessing = useMemo(
    () =>
      candidatesQuery.data?.candidates.some(
        (candidate) => !TERMINAL_STATUSES.includes(candidate.status)
      ) ?? false,
    [candidatesQuery.data]
  );

  const refreshResults = async () => {
    await Promise.all([batchesQuery.refetch(), batchQuery.refetch(), candidatesQuery.refetch()]);
    if (selectedCandidateId) await candidateQuery.refetch();
  };

  const handleCreateBatch = async (event: FormEvent) => {
    event.preventDefault();
    const form = new FormData();
    form.append("name", batchName.trim());
    form.append("role_name", roleName.trim());
    form.append("role_description", roleDescription.trim());
    form.append("evaluation_intent", evaluationIntent.trim());
    form.append("required_skills", requiredSkills.trim());
    form.append("preferred_skills", preferredSkills.trim());
    form.append("experience_mode", experienceMode);
    form.append("retention_days", retentionDays);
    try {
      const created = await createBatch.mutateAsync(form);
      setBatchName("");
      setRoleName("");
      setRoleDescription("");
      setEvaluationIntent("");
      setRequiredSkills("");
      setPreferredSkills("");
      setSelectedBatchId(created.id);
      await batchesQuery.refetch();
    } catch {
      toast.error("Could not create the batch");
    }
  };

  const summarizeIngest = (result: BulkATSIngestResponse) => {
    const queueFailures = result.accepted.filter((item) => !item.queued).length;
    const message = `${result.accepted.length} accepted, ${result.skipped.length} skipped${
      queueFailures ? `, ${queueFailures} could not be queued` : ""
    }.`;
    setIngestMessage(message);
    if (queueFailures) toast.error(message);
    else toast.success(message);
  };

  const handleResumeUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedBatchId || !resumeFiles.length) return;
    if (resumeFiles.length > MAX_CANDIDATES_PER_REQUEST) {
      toast.error(`Select at most ${MAX_CANDIDATES_PER_REQUEST} resumes per upload.`);
      return;
    }
    const form = new FormData();
    resumeFiles.forEach((file) => form.append("files", file));
    try {
      summarizeIngest(await uploadResumes.mutateAsync(form));
      setResumeFiles([]);
      await refreshResults();
    } catch {
      toast.error("Resume upload failed");
    }
  };

  const handleLinkImport = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedBatchId || !linkSheet) return;
    const form = new FormData();
    form.append("file", linkSheet);
    try {
      summarizeIngest(await importLinks.mutateAsync(form));
      setLinkSheet(null);
      await refreshResults();
    } catch {
      toast.error("Candidate-link import failed");
    }
  };

  const handleDriveConnect = async () => {
    try {
      const result = await connectDrive.mutateAsync(undefined);
      window.location.assign(result.authorizationUrl);
    } catch {
      toast.error("Google Drive connection could not be started");
    }
  };

  const handleDriveDisconnect = async () => {
    try {
      await disconnectDrive.mutateAsync(undefined);
      await driveStatusQuery.refetch();
      toast.success("Google Drive disconnected");
    } catch {
      toast.error("Google Drive could not be disconnected");
    }
  };

  const handleRerun = async () => {
    if (!selectedCandidateId) return;
    try {
      const result = await rerunCandidate.mutateAsync(undefined);
      if (!result.queued) toast.error("The worker queue is unavailable. Try again after recovery.");
      else toast.success("Candidate queued for a fresh evaluation");
      await refreshResults();
    } catch {
      toast.error("Could not rerun this candidate");
    }
  };

  const handleReview = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCandidateId) return;
    const form = new FormData();
    form.append("reviewer_notes", reviewerNotes.trim());
    form.append("reviewer_decision", reviewerDecision);
    form.append("decision_reason", decisionReason.trim());
    form.append("interview_outcome", interviewOutcome);
    try {
      await reviewCandidate.mutateAsync(form);
      toast.success("Review and outcome saved");
      await candidateQuery.refetch();
    } catch {
      toast.error("Could not save review notes");
    }
  };

  const candidateBrief = candidateQuery.data?.deterministicReport?.candidateBrief;
  const scorecard = candidateQuery.data?.deterministicReport?.bulkAtsScorecard;

  if (authLoading) {
    return (
      <div className="mx-auto max-w-7xl py-16 text-center text-slate-600">Checking access…</div>
    );
  }

  if (!canUseBulkAts) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 py-6">
      <header className="studio-page-heading">
        <div>
          <p className="studio-eyebrow">Recruiter workspace</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Bulk ATS screening</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Screen resume batches against one role. Scores assist review and never auto-reject a
            candidate.
          </p>
        </div>
        <div className="flex max-w-md flex-wrap justify-end gap-2">
          {[
            ["Jev", selfQuery.data?.jevConfigured],
            ["OCR", selfQuery.data?.ocrAvailable],
            ["Malware scan", selfQuery.data?.malwareScannerConfigured],
            ["Private Drive", selfQuery.data?.googleDriveOAuthConfigured],
          ].map(([label, ready]) => (
            <span
              key={String(label)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${ready ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}
            >
              {ready ? (
                <CheckCircleIcon className="size-4" />
              ) : (
                <ExclamationTriangleIcon className="size-4" />
              )}
              {label} {ready ? "ready" : "unavailable"}
            </span>
          ))}
        </div>
      </header>

      {selfQuery.isError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          The Bulk ATS API could not be reached or your role is not authorized.
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <form
          onSubmit={handleCreateBatch}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center gap-2">
            <PlusIcon className="size-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">New screening batch</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Batch name
              <input
                required
                value={batchName}
                onChange={(event) => setBatchName(event.target.value)}
                placeholder="October backend hiring"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Role
              <input
                required
                value={roleName}
                onChange={(event) => setRoleName(event.target.value)}
                placeholder="Backend Developer"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
              />
            </label>
          </div>
          <label className="mt-3 block text-sm font-medium text-slate-700">
            Evaluation intent <span className="font-normal text-slate-500">(optional)</span>
            <textarea
              value={evaluationIntent}
              onChange={(event) => setEvaluationIntent(event.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Example: Assess fit for a 12-week fintech migration project. Prioritize production FastAPI work, PostgreSQL performance, AWS operations, and evidence of owning delivery."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">
              Use 1–4 specific sentences. This is sent to Jev and DeepSeek as project or screening
              context and improves relevance, not the score automatically. Do not include secrets,
              protected traits, or candidate personal data.
            </span>
          </label>
          <label className="mt-3 block text-sm font-medium text-slate-700">
            Job Description <span className="font-normal text-slate-500">(optional)</span>
            <textarea
              value={roleDescription}
              onChange={(event) => setRoleDescription(event.target.value)}
              rows={4}
              placeholder="Describe responsibilities, seniority, must-have experience, and what good performance looks like."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">
              Recommended for stronger role-specific scoring. If omitted, the role name and skills
              are used.
            </span>
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Required skills
              <textarea
                value={requiredSkills}
                onChange={(event) => setRequiredSkills(event.target.value)}
                rows={3}
                placeholder="Python, FastAPI, PostgreSQL"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Preferred skills
              <textarea
                value={preferredSkills}
                onChange={(event) => setPreferredSkills(event.target.value)}
                rows={3}
                placeholder="AWS, Redis, Docker"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
              />
            </label>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Experience weighting
              <select
                value={experienceMode}
                onChange={(event) =>
                  setExperienceMode(event.target.value as "fresher" | "experienced")
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
              >
                <option value="experienced">Experienced</option>
                <option value="fresher">Fresher</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Resume retention
              <select
                value={retentionDays}
                onChange={(event) => setRetentionDays(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
              >
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
                <option value="365">365 days</option>
              </select>
            </label>
          </div>
          <button
            type="submit"
            disabled={createBatch.isPending || !batchName.trim() || !roleName.trim()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlusIcon className="size-4" />
            {createBatch.isPending ? "Creating…" : "Create batch"}
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Batches</h2>
            <button
              type="button"
              onClick={() => batchesQuery.refetch()}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Refresh batches"
            >
              <ArrowPathIcon
                className={`size-5 ${batchesQuery.isFetching ? "animate-spin" : ""}`}
              />
            </button>
          </div>
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {batchesQuery.data?.map((batch) => (
              <button
                key={batch.id}
                type="button"
                onClick={() => {
                  setSelectedBatchId(batch.id);
                  setSelectedCandidateId(null);
                  setIngestMessage(null);
                }}
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                  selectedBatchId === batch.id
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span>
                  <span className="block font-semibold text-slate-900">{batch.name}</span>
                  <span className="text-sm text-slate-500">{batch.roleName}</span>
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(batch.status)}`}
                >
                  {humanize(batch.status)}
                </span>
              </button>
            ))}
            {!batchesQuery.isLoading && !batchesQuery.data?.length && (
              <p className="py-8 text-center text-sm text-slate-500">
                Create your first batch to begin.
              </p>
            )}
          </div>
        </div>
      </section>

      {selectedBatchId && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-950">
                    {batchQuery.data?.name ?? "Loading batch…"}
                  </h2>
                  {batchQuery.data && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(batchQuery.data.status)}`}
                    >
                      {humanize(batchQuery.data.status)}
                    </span>
                  )}
                  {isProcessing && (
                    <ArrowPathIcon className="size-4 animate-spin text-indigo-600" />
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500">{batchQuery.data?.roleName}</p>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                {[
                  ["Total", batchQuery.data?.counts.total ?? 0],
                  ["Done", batchQuery.data?.counts.completed ?? 0],
                  ["Review", batchQuery.data?.counts.needsReview ?? 0],
                  ["Failed", batchQuery.data?.counts.failed ?? 0],
                  ["Pending", batchQuery.data?.counts.pending ?? 0],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-16 rounded-lg bg-slate-50 px-2 py-2">
                    <strong className="block text-lg text-slate-900">{value}</strong>
                    <span className="text-slate-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {batchQuery.data?.jdAnalysis && (
              <div
                className={`mt-4 rounded-xl border p-3 text-sm ${batchQuery.data.jdAnalysis.level === "limited" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}
              >
                <strong>
                  JD quality: {batchQuery.data.jdAnalysis.score}/100 ·{" "}
                  {humanize(batchQuery.data.jdAnalysis.level)}
                </strong>
                <span className="ml-2 text-slate-600">
                  This affects confidence, never the candidate score.
                </span>
                {batchQuery.data.jdAnalysis.warnings.length > 0 && (
                  <p className="mt-1 text-xs text-slate-600">
                    Improve: {batchQuery.data.jdAnalysis.warnings.map(humanize).join(", ")}
                  </p>
                )}
                {batchQuery.data.jdAnalysis.riskyCriteria.length > 0 && (
                  <p className="mt-1 text-xs font-semibold text-red-700">
                    Review potentially discriminatory criteria before screening.
                  </p>
                )}
              </div>
            )}

            {batchQuery.data?.evaluationIntent && (
              <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-slate-700">
                <strong className="text-indigo-950">Evaluation intent</strong>
                <p className="mt-1 whitespace-pre-wrap">{batchQuery.data.evaluationIntent}</p>
              </div>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <form
                onSubmit={handleResumeUpload}
                className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 p-4"
              >
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <CloudArrowUpIcon className="size-5 text-indigo-600" /> Upload resumes
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  PDF or DOCX, up to 10 MB each and 100 resumes per upload.
                </p>
                <input
                  key={resumeFiles.map((file) => file.name).join("|")}
                  type="file"
                  multiple
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    setResumeFiles(files);
                    if (files.length > MAX_CANDIDATES_PER_REQUEST) {
                      toast.error(
                        `Select at most ${MAX_CANDIDATES_PER_REQUEST} resumes per upload.`
                      );
                    }
                  }}
                  className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-semibold"
                />
                <button
                  disabled={
                    !resumeFiles.length ||
                    resumeFiles.length > MAX_CANDIDATES_PER_REQUEST ||
                    uploadResumes.isPending
                  }
                  className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {uploadResumes.isPending
                    ? "Uploading…"
                    : `Upload ${resumeFiles.length || ""} resume${resumeFiles.length === 1 ? "" : "s"}`}
                </button>
                {resumeFiles.length > MAX_CANDIDATES_PER_REQUEST && (
                  <p role="alert" className="mt-2 text-xs font-medium text-red-700">
                    This selection has {resumeFiles.length} files. Split it into uploads of 100 or
                    fewer.
                  </p>
                )}
              </form>

              <form
                onSubmit={handleLinkImport}
                className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4"
              >
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <DocumentArrowUpIcon className="size-5 text-slate-600" /> Import candidate links
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  CSV/XLSX, up to 100 rows. Columns: candidate_name, email_or_candidate_id,
                  resume_url, source. Public and authorized private Google Drive links are
                  supported.
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 text-xs">
                  <span className="text-slate-600">
                    {driveStatusQuery.data?.connected
                      ? `Drive connected${driveStatusQuery.data.googleEmail ? ` · ${driveStatusQuery.data.googleEmail}` : ""}`
                      : driveStatusQuery.data?.configured
                        ? "Connect Drive to process private resume links."
                        : "Private Drive OAuth is not configured on this deployment."}
                  </span>
                  {driveStatusQuery.data?.connected ? (
                    <button
                      type="button"
                      onClick={handleDriveDisconnect}
                      disabled={disconnectDrive.isPending}
                      className="font-semibold text-red-700 disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDriveConnect}
                      disabled={!driveStatusQuery.data?.configured || connectDrive.isPending}
                      className="rounded-md bg-blue-600 px-3 py-1.5 font-semibold text-white disabled:opacity-50"
                    >
                      Connect Google Drive
                    </button>
                  )}
                </div>
                <input
                  key={linkSheet?.name ?? "empty"}
                  type="file"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(event) => setLinkSheet(event.target.files?.[0] ?? null)}
                  className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-semibold"
                />
                <button
                  disabled={!linkSheet || importLinks.isPending}
                  className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {importLinks.isPending ? "Importing…" : "Import sheet"}
                </button>
              </form>
            </div>
            {ingestMessage && (
              <p role="status" className="mt-3 text-sm font-medium text-slate-700">
                {ingestMessage}
              </p>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">Candidates</h2>
              <div className="flex items-center gap-2">
                <select
                  value={candidateSort}
                  onChange={(event) => setCandidateSort(event.target.value as typeof candidateSort)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                >
                  <option value="review_priority">Review priority</option>
                  <option value="score">Highest score</option>
                  <option value="confidence">Lowest confidence</option>
                  <option value="created">Upload order</option>
                </select>
                <button
                  type="button"
                  onClick={refreshResults}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowPathIcon
                    className={`size-4 ${candidatesQuery.isFetching ? "animate-spin" : ""}`}
                  />{" "}
                  Refresh
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Candidate</th>
                    <th className="px-5 py-3">Score</th>
                    <th className="px-5 py-3">Confidence</th>
                    <th className="px-5 py-3">Band</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Warnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidatesQuery.data?.candidates.map((candidate) => (
                    <tr
                      key={candidate.id}
                      onClick={() => setSelectedCandidateId(candidate.id)}
                      className="cursor-pointer hover:bg-indigo-50/50"
                    >
                      <td className="px-5 py-4">
                        <span className="block font-semibold text-slate-900">
                          {candidate.candidateName ||
                            candidate.emailOrCandidateId ||
                            `Candidate #${candidate.id}`}
                        </span>
                        {candidate.candidateName && candidate.emailOrCandidateId && (
                          <span className="text-xs text-slate-500">
                            {candidate.emailOrCandidateId}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Score value={candidate.finalScore} />
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {candidate.confidenceScore === null
                          ? "—"
                          : `${Math.round(candidate.confidenceScore * 100)}%`}
                      </td>
                      <td className="px-5 py-4 text-slate-700">{candidate.scoreBand || "—"}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(candidate.status)}`}
                        >
                          {humanize(candidate.status)}
                        </span>
                      </td>
                      <td className="max-w-xs px-5 py-4 text-xs text-slate-500">
                        {candidate.warnings.length
                          ? candidate.warnings.map(humanize).join(", ")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!candidatesQuery.isLoading && !candidatesQuery.data?.candidates.length && (
                <p className="py-12 text-center text-sm text-slate-500">
                  Upload resumes or import a link sheet to populate this batch.
                </p>
              )}
            </div>
          </section>
        </>
      )}

      {selectedCandidateId && (
        <div
          className="fixed inset-0 z-[60] flex justify-end bg-slate-950/40"
          onClick={() => setSelectedCandidateId(null)}
        >
          <aside
            className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            aria-label="Candidate evaluation details"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-indigo-600">
                  Candidate #{selectedCandidateId}
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">
                  {candidateQuery.data?.candidateName ||
                    candidateQuery.data?.originalFilename ||
                    "Evaluation details"}
                </h2>
              </div>
              <button
                onClick={() => setSelectedCandidateId(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
                aria-label="Close candidate details"
              >
                <XMarkIcon className="size-6" />
              </button>
            </div>

            {candidateQuery.isLoading ? (
              <p className="py-12 text-center text-slate-500">Loading evaluation…</p>
            ) : candidateQuery.data ? (
              <div className="mt-6 space-y-5">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="text-xs text-slate-500">Score</span>
                    <div className="mt-1 text-xl">
                      <Score value={candidateQuery.data.finalScore} />
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="text-xs text-slate-500">Band</span>
                    <div className="mt-1 font-bold text-slate-900">
                      {candidateQuery.data.scoreBand || "—"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="text-xs text-slate-500">Status</span>
                    <div className="mt-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(candidateQuery.data.status)}`}
                      >
                        {humanize(candidateQuery.data.status)}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="text-xs text-slate-500">Confidence</span>
                    <div className="mt-1 font-bold text-slate-900">
                      {candidateQuery.data.confidenceScore === null
                        ? "—"
                        : `${Math.round(candidateQuery.data.confidenceScore * 100)}%`}
                    </div>
                    {candidateQuery.data.scoreLowerBound !== null &&
                      candidateQuery.data.scoreUpperBound !== null && (
                        <small className="text-slate-500">
                          Score range {candidateQuery.data.scoreLowerBound.toFixed(1)}–
                          {candidateQuery.data.scoreUpperBound.toFixed(1)}
                        </small>
                      )}
                  </div>
                </div>

                {candidateQuery.data.resumeUrl && (
                  <a
                    href={candidateQuery.data.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
                  >
                    Open source resume
                    <ArrowTopRightOnSquareIcon className="size-4" />
                  </a>
                )}

                {candidateQuery.data.errorMessage && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    {candidateQuery.data.errorMessage}
                  </div>
                )}

                {candidateBrief && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-950">Candidate brief</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-700">
                          {candidateBrief.summary}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-indigo-800">
                        {candidateBrief.recommendation}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                          Strongest signals
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-slate-700">
                          {candidateBrief.strengths.map((item) => (
                            <li key={item.metric} className="flex justify-between gap-3">
                              <span>{item.metric}</span>
                              <strong>{item.score.toFixed(1)}</strong>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                          Review gaps
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-slate-700">
                          {candidateBrief.gaps.map((item) => (
                            <li key={item.metric} className="flex justify-between gap-3">
                              <span>{item.metric}</span>
                              <strong>{item.score.toFixed(1)}</strong>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {candidateBrief.strengthNarratives?.length ? (
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                        {candidateBrief.strengthNarratives.map((text) => (
                          <li key={text}>{text}</li>
                        ))}
                      </ul>
                    ) : null}
                    {candidateBrief.interviewFocus?.length ? (
                      <div className="mt-3 rounded-lg bg-white p-3 text-sm text-slate-700">
                        <strong>Interview focus:</strong>{" "}
                        {candidateBrief.interviewFocus.join(" · ")}
                      </div>
                    ) : null}
                  </div>
                )}

                {scorecard && (
                  <div>
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <h3 className="font-bold text-slate-900">Metric scorecard</h3>
                      <p className="text-xs text-slate-500">
                        {humanize(scorecard.experienceMode)} weights ·{" "}
                        {humanize(scorecard.roleContext)} context ·{" "}
                        {humanize(scorecard.scoringSources)}
                      </p>
                    </div>
                    <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Metric</th>
                            <th className="px-3 py-2">Score</th>
                            <th className="px-3 py-2">Weight</th>
                            <th className="px-3 py-2">Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Object.entries(scorecard.categoryScores).map(([metric, score]) => (
                            <tr key={metric}>
                              <td className="px-3 py-2 font-medium text-slate-700">
                                {humanize(metric)}
                              </td>
                              <td className="px-3 py-2 tabular-nums text-slate-900">
                                {score.toFixed(1)}
                              </td>
                              <td className="px-3 py-2 tabular-nums text-slate-600">
                                {scorecard.weights[metric] ?? 0}%
                              </td>
                              <td className="px-3 py-2 tabular-nums font-semibold text-slate-900">
                                {(scorecard.weightedContributions[metric] ?? 0).toFixed(1)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {scorecard.jevAverageConfidence !== null && (
                      <p className="mt-2 text-xs text-slate-500">
                        Average Jev confidence: {Math.round(scorecard.jevAverageConfidence * 100)}%
                      </p>
                    )}
                    <div className="mt-3 space-y-2">
                      {Object.entries(scorecard.evidence ?? {}).map(([metric, evidence]) => (
                        <details
                          key={metric}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                          <summary className="cursor-pointer font-semibold text-slate-700">
                            Evidence for {humanize(metric)} ·{" "}
                            {Math.round(
                              (scorecard.confidence?.categoryConfidence?.[metric] ?? 0) * 100
                            )}
                            % confidence
                          </summary>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
                            {evidence.map((item, index) => (
                              <li key={`${item.source}-${index}`}>
                                {item.text}{" "}
                                <small className="text-slate-400">({item.source})</small>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ))}
                    </div>
                    {scorecard.confidence?.policy && (
                      <p className="mt-2 text-xs text-slate-500">{scorecard.confidence.policy}</p>
                    )}
                  </div>
                )}

                <div>
                  <h3 className="font-bold text-slate-900">Warnings</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {candidateQuery.data.warnings.length ? (
                      candidateQuery.data.warnings.map((warning) => (
                        <span
                          key={warning}
                          className="rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-900"
                        >
                          {humanize(warning)}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">No warnings.</span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">Jev semantic evaluation</h3>
                  <div className="mt-2 space-y-2">
                    {candidateQuery.data.jevReport ? (
                      Object.entries(candidateQuery.data.jevReport).map(([name, answer]) => (
                        <div
                          key={name}
                          className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                          <span className="text-slate-600">{humanize(name)}</span>
                          <span className="text-right font-semibold text-slate-900">
                            {answer.value === null ? "Unavailable" : String(answer.value)}
                            {answer.confidence !== null && (
                              <small className="ml-2 font-normal text-slate-400">
                                {Math.round(answer.confidence * 100)}%
                              </small>
                            )}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No Jev report is available.</p>
                    )}
                  </div>
                </div>

                <form onSubmit={handleReview}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-bold text-slate-900">
                      Recruiter decision
                      <select
                        value={reviewerDecision}
                        onChange={(event) => setReviewerDecision(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal"
                      >
                        <option value="">Not recorded</option>
                        <option value="shortlist">Shortlist</option>
                        <option value="hold">Hold</option>
                        <option value="not_shortlisted">Not shortlisted</option>
                      </select>
                    </label>
                    <label className="text-sm font-bold text-slate-900">
                      Interview outcome
                      <select
                        value={interviewOutcome}
                        onChange={(event) => setInterviewOutcome(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal"
                      >
                        <option value="">Not recorded</option>
                        <option value="not_interviewed">Not interviewed</option>
                        <option value="interviewed">Interviewed</option>
                        <option value="advanced">Advanced</option>
                        <option value="rejected">Rejected</option>
                        <option value="hired">Hired</option>
                        <option value="withdrew">Withdrew</option>
                      </select>
                    </label>
                  </div>
                  <label className="mt-3 block font-bold text-slate-900">
                    Decision reason
                    <textarea
                      value={decisionReason}
                      onChange={(event) => setDecisionReason(event.target.value)}
                      rows={2}
                      placeholder="Record job-related evidence for the human decision."
                      className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm font-normal outline-none focus:border-indigo-500"
                    />
                  </label>
                  <label className="font-bold text-slate-900">
                    Human review notes
                    <textarea
                      value={reviewerNotes}
                      onChange={(event) => setReviewerNotes(event.target.value)}
                      rows={4}
                      placeholder="Document the decision context, follow-up, or correction."
                      className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm font-normal outline-none focus:border-indigo-500"
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      disabled={reviewCandidate.isPending}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {reviewCandidate.isPending ? "Saving…" : "Save review"}
                    </button>
                    <button
                      type="button"
                      onClick={handleRerun}
                      disabled={rerunCandidate.isPending}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                    >
                      <ArrowPathIcon
                        className={`size-4 ${rerunCandidate.isPending ? "animate-spin" : ""}`}
                      />
                      Rerun evaluation
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <p className="py-12 text-center text-red-700">Could not load this candidate.</p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
