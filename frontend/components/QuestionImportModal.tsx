"use client";

import React, { useState, useRef } from "react";
import { api, getErrorMessage } from "@/lib/api";
import {
  QuestionImportItem,
  QuestionImportPreviewResponse,
  QuestionImportConfirmResponse,
} from "@/types";
import { Button, Alert, Badge, Card } from "./UIComponents";
import {
  X,
  Upload,
  FileSpreadsheet,
  FileText,
  Code,
  FileUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  ChevronRight,
  ArrowLeft,
  Download,
  Search,
  Filter,
  RefreshCw,
  HelpCircle
} from "lucide-react";

interface QuestionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

type FilterTab = "ALL" | "VALID" | "INVALID" | "DUPLICATE";

export default function QuestionImportModal({
  isOpen,
  onClose,
  onImportSuccess,
}: QuestionImportModalProps) {
  // Step: 1 = Upload, 2 = Preview & Validate, 3 = Completed
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Upload State
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Preview State
  const [previewData, setPreviewData] = useState<QuestionImportPreviewResponse | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [previewSearch, setPreviewSearch] = useState("");
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [allowDuplicates, setAllowDuplicates] = useState(false);

  // Confirm / Import State
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<QuestionImportConfirmResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const resetModal = () => {
    setStep(1);
    setFile(null);
    setParseError(null);
    setPreviewData(null);
    setActiveTab("ALL");
    setPreviewSearch("");
    setSkipInvalid(true);
    setAllowDuplicates(false);
    setIsParsing(false);
    setIsImporting(false);
    setImportResult(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  // Download Sample Templates
  const handleDownloadTemplate = async (format: "csv" | "excel" | "json" | "docx") => {
    try {
      const mimeTypes: Record<string, string> = {
        csv: "text/csv",
        excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        json: "application/json",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
      const filenames: Record<string, string> = {
        csv: "question_import_template.csv",
        excel: "question_import_template.xlsx",
        json: "question_import_template.json",
        docx: "question_import_template.docx",
      };

      const res = await api.get(`/questions/template/${format}`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: mimeTypes[format] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filenames[format]);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Failed to download ${format.toUpperCase()} template: ` + getErrorMessage(err));
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setParseError(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setParseError(null);
    }
  };

  // Step 1 -> Step 2: Upload file and fetch preview
  const handleParseAndPreview = async () => {
    if (!file) {
      setParseError("Please select a file to parse.");
      return;
    }

    setIsParsing(true);
    setParseError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post<QuestionImportPreviewResponse>(
        "/questions/import/preview",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setPreviewData(res.data);
      setStep(2);
    } catch (err) {
      setParseError(getErrorMessage(err));
    } finally {
      setIsParsing(false);
    }
  };

  // Step 2 -> Step 3: Confirm and persist to DB
  const handleConfirmImport = async () => {
    if (!previewData || previewData.questions.length === 0) return;

    setIsImporting(true);
    try {
      const res = await api.post<QuestionImportConfirmResponse>(
        "/questions/import/confirm",
        {
          questions: previewData.questions,
          skip_invalid: skipInvalid,
          allow_duplicates: allowDuplicates,
        }
      );
      setImportResult(res.data);
      setStep(3);
      onImportSuccess();
    } catch (err) {
      alert("Failed to confirm question import: " + getErrorMessage(err));
    } finally {
      setIsImporting(false);
    }
  };

  // Filter questions in Preview
  const filteredQuestions = (previewData?.questions || []).filter((q) => {
    if (activeTab === "VALID" && q.status !== "VALID") return false;
    if (activeTab === "INVALID" && q.status !== "INVALID") return false;
    if (activeTab === "DUPLICATE" && q.status !== "DUPLICATE") return false;

    if (previewSearch.trim()) {
      const term = previewSearch.toLowerCase();
      const matchText = q.question_text.toLowerCase().includes(term);
      const matchSubject = q.subject.toLowerCase().includes(term);
      const matchTopic = (q.topic || "").toLowerCase().includes(term);
      return matchText || matchSubject || matchTopic;
    }
    return true;
  });

  // Calculate questions that will be imported
  const payableCount = (previewData?.questions || []).filter((q) => {
    if (q.status === "INVALID") return !skipInvalid;
    if (q.status === "DUPLICATE") return allowDuplicates;
    return true;
  }).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#EAE6DF] w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE6DF] bg-[#FAF7F9]">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#C85332]/10 rounded-lg text-[#C85332]">
                <FileUp className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-[#1C1C1F]">
                Import Questions into Question Bank
              </h2>
            </div>
            <p className="text-xs text-[#6B6B76] mt-0.5">
              Supports CSV, Excel (.xlsx), JSON, Word (.docx), PDF (.pdf), and Image OCR.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-[#6B6B76] hover:text-[#1C1C1F] hover:bg-[#EAE6DF]/50 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* STEP 1: UPLOAD FILE & FORMAT GUIDANCE */}
          {step === 1 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Template Download Section */}
              <div className="bg-[#FAF7F9] border border-[#EAE6DF] rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-[#1C1C1F] uppercase tracking-wider">
                      Need a formatting blueprint?
                    </h4>
                    <p className="text-xs text-[#6B6B76] mt-0.5">
                      Download pre-formatted sample templates with demonstration questions and option keys:
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleDownloadTemplate("csv")}
                      className="px-2.5 py-1.5 text-xs font-semibold text-[#2B7853] bg-white border border-[#EAE6DF] rounded-lg hover:bg-[#FEF3EC] flex items-center gap-1.5 shadow-2xs"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
                    </button>
                    <button
                      onClick={() => handleDownloadTemplate("excel")}
                      className="px-2.5 py-1.5 text-xs font-semibold text-[#16A34A] bg-white border border-[#EAE6DF] rounded-lg hover:bg-[#FEF3EC] flex items-center gap-1.5 shadow-2xs"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" /> Excel (.xlsx)
                    </button>
                    <button
                      onClick={() => handleDownloadTemplate("json")}
                      className="px-2.5 py-1.5 text-xs font-semibold text-[#D97706] bg-white border border-[#EAE6DF] rounded-lg hover:bg-[#FEF3EC] flex items-center gap-1.5 shadow-2xs"
                    >
                      <Code className="h-3.5 w-3.5" /> JSON
                    </button>
                    <button
                      onClick={() => handleDownloadTemplate("docx")}
                      className="px-2.5 py-1.5 text-xs font-semibold text-[#2563EB] bg-white border border-[#EAE6DF] rounded-lg hover:bg-[#FEF3EC] flex items-center gap-1.5 shadow-2xs"
                    >
                      <FileText className="h-3.5 w-3.5" /> Word (.docx)
                    </button>
                  </div>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? "border-[#C85332] bg-[#C85332]/5"
                    : file
                    ? "border-[#2B7853] bg-[#2B7853]/5"
                    : "border-[#D8D2D7] hover:border-[#A8A29E] bg-white"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".csv,.xlsx,.xls,.json,.docx,.pdf,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className={`p-4 rounded-full ${file ? "bg-[#2B7853]/10 text-[#2B7853]" : "bg-[#FEF3EC] text-[#C85332]"}`}>
                    <Upload className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1C1C1F]">
                      {file ? file.name : "Click to browse or drag & drop questions file"}
                    </p>
                    <p className="text-xs text-[#6B6B76] mt-1">
                      {file
                        ? `${(file.size / 1024).toFixed(1)} KB • Ready for validation`
                        : "Supports CSV, XLSX, JSON, DOCX, PDF, or Image (PNG/JPG)"}
                    </p>
                  </div>

                  {file && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] font-bold px-2.5 py-1 bg-[#2B7853]/10 text-[#2B7853] rounded-full">
                        File Selected
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="text-xs text-[#9B3D4A] hover:underline"
                      >
                        Change File
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Supported Format Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center text-[11px]">
                <div className="p-2 border border-[#EAE6DF] rounded-lg bg-[#FAF7F9]">
                  <span className="font-bold text-[#2B7853] block">CSV</span>
                  <span className="text-[#6B6B76] text-[10px]">Comma-separated</span>
                </div>
                <div className="p-2 border border-[#EAE6DF] rounded-lg bg-[#FAF7F9]">
                  <span className="font-bold text-[#16A34A] block">Excel</span>
                  <span className="text-[#6B6B76] text-[10px]">.xlsx / .xls</span>
                </div>
                <div className="p-2 border border-[#EAE6DF] rounded-lg bg-[#FAF7F9]">
                  <span className="font-bold text-[#D97706] block">JSON</span>
                  <span className="text-[#6B6B76] text-[10px]">Structured Array</span>
                </div>
                <div className="p-2 border border-[#EAE6DF] rounded-lg bg-[#FAF7F9]">
                  <span className="font-bold text-[#2563EB] block">DOCX</span>
                  <span className="text-[#6B6B76] text-[10px]">Word Tables/Text</span>
                </div>
                <div className="p-2 border border-[#EAE6DF] rounded-lg bg-[#FAF7F9]">
                  <span className="font-bold text-[#9B3D4A] block">PDF</span>
                  <span className="text-[#6B6B76] text-[10px]">Document Text</span>
                </div>
                <div className="p-2 border border-[#EAE6DF] rounded-lg bg-[#FAF7F9]">
                  <span className="font-bold text-[#7C3AED] block">OCR Image</span>
                  <span className="text-[#6B6B76] text-[10px]">PNG / JPG OCR</span>
                </div>
              </div>

              {parseError && (
                <Alert type="error">
                  <div className="font-semibold">Parsing Error</div>
                  <div className="text-xs mt-0.5">{parseError}</div>
                </Alert>
              )}
            </div>
          )}

          {/* STEP 2: PREVIEW & VALIDATION MATRIX */}
          {step === 2 && previewData && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#FAF7F9] border border-[#EAE6DF] rounded-xl">
                  <span className="text-[11px] font-semibold text-[#6B6B76] uppercase tracking-wider block">
                    Total Detected
                  </span>
                  <div className="text-xl font-bold text-[#1C1C1F] mt-0.5">
                    {previewData.total_detected}
                  </div>
                  <span className="text-[10px] text-[#A8A29E]">
                    From {previewData.filename} ({previewData.file_type})
                  </span>
                </div>

                <div className="p-3 bg-[#2B7853]/5 border border-[#2B7853]/20 rounded-xl">
                  <span className="text-[11px] font-semibold text-[#2B7853] uppercase tracking-wider block">
                    Valid Questions
                  </span>
                  <div className="text-xl font-bold text-[#2B7853] mt-0.5">
                    {previewData.valid_count}
                  </div>
                  <span className="text-[10px] text-[#2B7853]/80">
                    Ready for immediate import
                  </span>
                </div>

                <div className="p-3 bg-[#9B3D4A]/5 border border-[#9B3D4A]/20 rounded-xl">
                  <span className="text-[11px] font-semibold text-[#9B3D4A] uppercase tracking-wider block">
                    Validation Errors
                  </span>
                  <div className="text-xl font-bold text-[#9B3D4A] mt-0.5">
                    {previewData.invalid_count}
                  </div>
                  <span className="text-[10px] text-[#9B3D4A]/80">
                    Missing fields or bad options
                  </span>
                </div>

                <div className="p-3 bg-[#D97706]/5 border border-[#D97706]/20 rounded-xl">
                  <span className="text-[11px] font-semibold text-[#D97706] uppercase tracking-wider block">
                    Duplicates
                  </span>
                  <div className="text-xl font-bold text-[#D97706] mt-0.5">
                    {previewData.duplicate_count}
                  </div>
                  <span className="text-[10px] text-[#D97706]/80">
                    Already in database or batch
                  </span>
                </div>
              </div>

              {/* Filter Tabs & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAE6DF] pb-3">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setActiveTab("ALL")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "ALL"
                        ? "bg-[#C85332] text-white"
                        : "bg-[#FAF7F9] text-[#6B6B76] hover:bg-[#FEF3EC]"
                    }`}
                  >
                    All ({previewData.total_detected})
                  </button>
                  <button
                    onClick={() => setActiveTab("VALID")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "VALID"
                        ? "bg-[#2B7853] text-white"
                        : "bg-[#FAF7F9] text-[#6B6B76] hover:bg-[#FEF3EC]"
                    }`}
                  >
                    Valid ({previewData.valid_count})
                  </button>
                  <button
                    onClick={() => setActiveTab("INVALID")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "INVALID"
                        ? "bg-[#9B3D4A] text-white"
                        : "bg-[#FAF7F9] text-[#6B6B76] hover:bg-[#FEF3EC]"
                    }`}
                  >
                    Errors ({previewData.invalid_count})
                  </button>
                  <button
                    onClick={() => setActiveTab("DUPLICATE")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "DUPLICATE"
                        ? "bg-[#D97706] text-white"
                        : "bg-[#FAF7F9] text-[#6B6B76] hover:bg-[#FEF3EC]"
                    }`}
                  >
                    Duplicates ({previewData.duplicate_count})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B6B76]" />
                  <input
                    type="text"
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    placeholder="Search in preview..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#EAE6DF] rounded-lg focus:outline-hidden focus:border-[#C85332]"
                  />
                </div>
              </div>

              {/* Import Options Checkboxes */}
              <div className="flex flex-wrap items-center gap-6 p-3 bg-[#FAF7F9] border border-[#EAE6DF] rounded-xl text-xs text-[#1C1C1F]">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={skipInvalid}
                    onChange={(e) => setSkipInvalid(e.target.checked)}
                    className="rounded border-[#EAE6DF] text-[#C85332] focus:ring-[#C85332]"
                  />
                  <span>
                    <strong>Skip invalid records</strong> (Do not insert questions with validation errors)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allowDuplicates}
                    onChange={(e) => setAllowDuplicates(e.target.checked)}
                    className="rounded border-[#EAE6DF] text-[#C85332] focus:ring-[#C85332]"
                  />
                  <span>
                    <strong>Allow duplicate questions</strong> (Insert even if identical question exists in DB)
                  </span>
                </label>
              </div>

              {/* Questions List / Table */}
              <div className="border border-[#EAE6DF] rounded-xl overflow-hidden divide-y divide-[#EAE6DF] max-h-[46vh] overflow-y-auto">
                {filteredQuestions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#6B6B76]">
                    No questions matching the selected filter criteria.
                  </div>
                ) : (
                  filteredQuestions.map((q, idx) => {
                    const isValid = q.status === "VALID";
                    const isInvalid = q.status === "INVALID";
                    const isDuplicate = q.status === "DUPLICATE";

                    return (
                      <div
                        key={idx}
                        className={`p-4 transition-colors ${
                          isInvalid
                            ? "bg-[#9B3D4A]/5 hover:bg-[#9B3D4A]/10"
                            : isDuplicate
                            ? "bg-[#D97706]/5 hover:bg-[#D97706]/10"
                            : "bg-white hover:bg-[#FEF3EC]/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1.5 flex-1">
                            {/* Meta pill badges */}
                            <div className="flex flex-wrap items-center gap-2 text-[10px]">
                              <span className="font-bold px-1.5 py-0.5 bg-[#FAF7F9] border border-[#EAE6DF] rounded text-[#6B6B76]">
                                #{q.row_index}
                              </span>
                              <span className="font-semibold text-[#C85332] bg-[#C85332]/10 px-2 py-0.5 rounded">
                                {q.subject || "No Subject"}
                              </span>
                              {q.topic && (
                                <span className="text-[#6B6B76] bg-[#FAF7F9] px-2 py-0.5 rounded border border-[#EAE6DF]">
                                  {q.topic}
                                </span>
                              )}
                              <span className="font-medium text-[#1C1C1F] bg-[#FAF7F9] px-2 py-0.5 rounded border border-[#EAE6DF]">
                                {q.question_type}
                              </span>
                              <span className="font-medium text-[#1C1C1F] bg-[#FAF7F9] px-2 py-0.5 rounded border border-[#EAE6DF]">
                                {q.difficulty}
                              </span>
                              <span className="font-semibold text-[#2B7853]">
                                {q.marks} Marks
                              </span>
                              {q.negative_marks > 0 && (
                                <span className="font-semibold text-[#9B3D4A]">
                                  (-{q.negative_marks})
                                </span>
                              )}
                            </div>

                            {/* Question text */}
                            <div className="text-xs font-semibold text-[#1C1C1F] leading-relaxed">
                              {q.question_text || <span className="text-[#9B3D4A] italic">[Missing Question Text]</span>}
                            </div>

                            {/* Options if present */}
                            {q.options && q.options.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
                                {q.options.map((opt, oIdx) => (
                                  <div
                                    key={oIdx}
                                    className={`px-2 py-1 rounded text-[11px] flex items-center gap-1.5 ${
                                      opt.is_correct
                                        ? "bg-[#2B7853]/10 border border-[#2B7853]/30 text-[#2B7853] font-semibold"
                                        : "bg-[#FAF7F9] border border-[#EAE6DF] text-[#6B6B76]"
                                    }`}
                                  >
                                    <span className="w-3.5 text-center font-mono text-[10px]">
                                      {String.fromCharCode(65 + oIdx)}.
                                    </span>
                                    <span className="flex-1 truncate">{opt.option_text}</span>
                                    {opt.is_correct && (
                                      <CheckCircle2 className="h-3 w-3 text-[#2B7853] shrink-0" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Expected answer / explanation */}
                            {(q.expected_answer || q.explanation) && (
                              <div className="text-[11px] text-[#6B6B76] italic mt-1">
                                {q.expected_answer && <span>Answer: {q.expected_answer} </span>}
                                {q.explanation && <span>• Explanation: {q.explanation}</span>}
                              </div>
                            )}

                            {/* Validation Errors List */}
                            {q.errors && q.errors.length > 0 && (
                              <div className="mt-2 space-y-0.5">
                                {q.errors.map((err, errIdx) => (
                                  <div
                                    key={errIdx}
                                    className="flex items-center gap-1.5 text-[11px] text-[#9B3D4A] font-semibold"
                                  >
                                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                                    <span>{err}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Duplicate Warning */}
                            {q.warnings && q.warnings.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {q.warnings.map((warn, wIdx) => (
                                  <div
                                    key={wIdx}
                                    className="flex items-center gap-1.5 text-[11px] text-[#D97706] font-medium"
                                  >
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                    <span>{warn}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0">
                            {isValid && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#2B7853]/10 text-[#2B7853] border border-[#2B7853]/20">
                                <CheckCircle2 className="h-3 w-3" /> Valid
                              </span>
                            )}
                            {isInvalid && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#9B3D4A]/10 text-[#9B3D4A] border border-[#9B3D4A]/20">
                                <XCircle className="h-3 w-3" /> Error
                              </span>
                            )}
                            {isDuplicate && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20">
                                <Copy className="h-3 w-3" /> Duplicate
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* STEP 3: COMPLETION SUMMARY */}
          {step === 3 && importResult && (
            <div className="py-8 text-center space-y-4 max-w-md mx-auto">
              <div className="h-16 w-16 bg-[#2B7853]/10 text-[#2B7853] rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-[#1C1C1F]">
                Import Process Complete
              </h3>
              <p className="text-xs text-[#6B6B76]">
                {importResult.message}
              </p>

              <div className="p-4 bg-[#FAF7F9] border border-[#EAE6DF] rounded-xl grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-[#6B6B76] block">Imported</span>
                  <span className="text-lg font-bold text-[#2B7853]">
                    {importResult.imported_count}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B6B76] block">Skipped Invalid</span>
                  <span className="text-lg font-bold text-[#9B3D4A]">
                    {importResult.skipped_invalid_count}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B6B76] block">Skipped Dupes</span>
                  <span className="text-lg font-bold text-[#D97706]">
                    {importResult.skipped_duplicate_count}
                  </span>
                </div>
              </div>

              <Button variant="primary" onClick={handleClose} className="w-full text-xs py-2.5">
                Done & Refresh Question Bank
              </Button>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#EAE6DF] bg-[#FAF7F9]">
          {step === 1 && (
            <>
              <Button variant="outline" onClick={handleClose} className="text-xs">
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleParseAndPreview}
                disabled={!file || isParsing}
                className="text-xs gap-1.5"
              >
                {isParsing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Parsing File...
                  </>
                ) : (
                  <>
                    Parse & Preview Questions <ChevronRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="text-xs gap-1.5"
                disabled={isImporting}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back / Change File
              </Button>

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleClose} className="text-xs" disabled={isImporting}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmImport}
                  disabled={payableCount === 0 || isImporting}
                  className="text-xs gap-1.5"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Committing to Database...
                    </>
                  ) : (
                    <>
                      Confirm & Import ({payableCount} Questions)
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="w-full flex justify-end">
              <Button variant="outline" onClick={handleClose} className="text-xs">
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
