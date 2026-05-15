"use client";
import {
  ArrowsPointingOutIcon,
  ChartBarIcon,
  CodeBracketIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { MermaidDiagram } from "@lightenna/react-mermaid-diagram";
import React, { useRef } from "react";

interface Supplement {
  questionId: number | string;
  supplementType: string;
  format: string;
  content: string;
}

interface CodeViewProps {
  supplement?: Supplement | null;
  isLoading?: boolean;
}

const CodeView: React.FC<CodeViewProps> = ({ supplement, isLoading = false }) => {
  const modalRef = useRef<HTMLDialogElement>(null);

  // Determine supplement type
  const isDiagram = supplement?.supplementType === "diagram";
  const isCode = supplement?.supplementType === "code";
  const content = supplement?.content || "";

  // Get file name based on format
  const getFileName = () => {
    if (!supplement) return "Code.js";
    if (isDiagram && supplement.format === "mermaid") {
      return "Diagram.mmd";
    }
    if (isCode) {
      return supplement.format === "javascript" ? "Code.js" : `Code.${supplement.format}`;
    }
    return "Code.js";
  };

  const displayFileName = getFileName();

  if (isLoading) {
    return (
      <div className="w-full flex justify-center my-4 animate-pulse">
        <div className="card w-xl bg-[#1e1e1e] shadow-xl rounded-lg overflow-hidden border border-gray-800 h-48">
          <div className="flex justify-between items-center px-4 py-2 bg-[#252526] border-b border-gray-800">
            <div className="h-4 w-24 bg-gray-700 rounded"></div>
          </div>
          <div className="p-4 space-y-2">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if there's no supplement
  if (!supplement || !content) {
    return null;
  }

  return (
    <>
      <div className="w-full flex justify-center my-4">
        {/* Card Container */}
        <div className="card w-xl bg-[#1e1e1e] shadow-xl rounded-lg overflow-hidden border border-gray-800">
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-2 bg-[#252526] border-b border-gray-800">
            <div className="flex items-center gap-2">
              {isDiagram ? (
                <ChartBarIcon className="w-4 h-4 text-blue-400" />
              ) : (
                <CodeBracketIcon className="w-4 h-4 text-blue-400" />
              )}
              <span className="text-gray-400 text-sm">{displayFileName}</span>
            </div>
            <button
              onClick={() => modalRef.current?.showModal()}
              className="btn btn-ghost btn-xs btn-square text-gray-400 hover:text-white tooltip tooltip-left"
              data-tip="Expand"
            >
              <ArrowsPointingOutIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Content Preview */}
          <div
            className="p-4 relative group cursor-pointer"
            onClick={() => modalRef.current?.showModal()}
          >
            {isDiagram ? (
              <div className="overflow-hidden max-h-64 flex items-center justify-center">
                <div className="[&_svg_text]:word-wrap [&_svg_text]:break-words [&_svg_text]:max-w-full">
                  <MermaidDiagram suppressErrorRendering={true}>{content}</MermaidDiagram>
                </div>
              </div>
            ) : (
              <pre className="font-mono text-sm leading-relaxed text-gray-300 overflow-hidden max-h-32">
                <code>{content}</code>
              </pre>
            )}
            {/* Gradient overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#1e1e1e] to-transparent pointer-events-none flex items-end justify-center pb-2">
              <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                Click to expand
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <dialog ref={modalRef} className="modal">
        <div className="modal-box w-11/12 max-w-5xl bg-[#1e1e1e] p-0 text-left rounded-lg border border-gray-700">
          {/* Modal Header */}
          <div className="flex justify-between items-center px-4 py-3 bg-[#252526] border-b border-gray-800 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              {isDiagram ? (
                <ChartBarIcon className="w-5 h-5 text-blue-400" />
              ) : (
                <CodeBracketIcon className="w-5 h-5 text-blue-400" />
              )}
              <span className="text-gray-400 font-medium">{displayFileName}</span>
            </div>
            <form method="dialog">
              <button className="btn btn-ghost btn-sm btn-square text-gray-400 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </form>
          </div>

          {/* Full Content */}
          <div className="p-6 overflow-x-auto">
            {isDiagram ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="[&_svg_text]:word-wrap [&_svg_text]:break-words [&_svg_text]:max-w-full">
                  <MermaidDiagram suppressErrorRendering={true}>{content}</MermaidDiagram>
                </div>
              </div>
            ) : (
              <pre className="font-mono text-sm leading-relaxed text-gray-300">
                <code>{content}</code>
              </pre>
            )}
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
};

export default CodeView;
