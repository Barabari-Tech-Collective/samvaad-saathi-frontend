import {
  ArrowUpTrayIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

export function FileDragDropZone({
  file,
  onFileSelect,
}: {
  file: File | null;
  onFileSelect: (f: File | null) => void;
}) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (
      droppedFile &&
      (droppedFile.type === "application/pdf" || droppedFile.name.endsWith(".docx"))
    ) {
      onFileSelect(droppedFile);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      onFileSelect(selected);
    }
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
      <p className="text-slate-500 text-sm mb-5">or browse from your device</p>

      <div className="px-5 py-2 rounded-full border border-slate-200 bg-white text-slate-700 font-medium text-sm shadow-sm hover:border-primary/30 hover:text-primary transition-all">
        Browse files
      </div>
    </label>
  );
}
