import {
  ArrowUpTrayIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { AI_RESUME_FILE_TYPES, AI_RESUME_MIME_TYPES, MAX_AI_RESUME_SIZE_MB } from "@/lib/constants";

const MAX_FILE_SIZE_BYTES = MAX_AI_RESUME_SIZE_MB * 1024 * 1024;
const ALLOWED_EXTENSIONS = AI_RESUME_FILE_TYPES.split(",");

export function FileDragDropZone({
  file,
  onFileSelect,
}: {
  file: File | null;
  onFileSelect: (f: File | null) => void;
}) {
  const validateFile = (selectedFile: File): boolean => {
    if (selectedFile.size === 0) {
      toast.error("File cannot be empty. Please upload a valid resume.");
      return false;
    }

    const fileName = selectedFile.name.toLowerCase();
    const isAllowedExt = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
    const isAllowedMime =
      !selectedFile.type || (AI_RESUME_MIME_TYPES as readonly string[]).includes(selectedFile.type);

    if (!isAllowedExt || !isAllowedMime) {
      toast.error("Only .pdf and .docx files are allowed");
      return false;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File size must be less than ${MAX_AI_RESUME_SIZE_MB}MB`);
      return false;
    }

    return true;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (validateFile(droppedFile)) {
        onFileSelect(droppedFile);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (validateFile(selected)) {
        onFileSelect(selected);
      }
    }
    e.target.value = "";
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(0)) + " " + sizes[i];
  };

  if (file) {
    return (
      <div className="w-full rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white rounded-xl shadow-sm border border-emerald-50">
            <DocumentTextIcon className="size-6 text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-emerald-600 mb-0.5">
              <CheckCircleIcon className="size-4" />
              <span className="text-xs font-semibold">Resume uploaded</span>
            </div>
            <p className="text-sm font-semibold text-slate-800 truncate max-w-[180px] sm:max-w-xs">
              {file.name}
            </p>
            <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onFileSelect(null)}
          className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 border border-slate-100 shadow-sm transition-colors"
        >
          <ArrowPathIcon className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <label
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="w-full flex flex-col items-center justify-center py-8 rounded-2xl border-[1.5px] border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer group relative"
    >
      <input
        type="file"
        className="hidden"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleChange}
      />
      <div className="p-4 bg-primary/10 text-primary rounded-2xl mb-4 group-hover:scale-110 transition-transform">
        <ArrowUpTrayIcon className="size-6" />
      </div>
      <p className="text-slate-800 font-semibold mb-1">Drag & drop your resume</p>
      <p className="text-slate-500 text-sm mb-1">or browse from your device</p>
      <p className="text-slate-400 text-xs mb-5">Only .pdf and .docx (Max 10MB)</p>

      <div className="px-5 py-2 rounded-full border border-slate-200 bg-white text-slate-700 font-medium text-sm shadow-sm hover:border-primary/30 hover:text-primary transition-all">
        Browse files
      </div>
    </label>
  );
}
