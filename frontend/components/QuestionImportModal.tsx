"use client";

import React, { useState, useRef } from "react";
import { api, getErrorMessage } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
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
  const { t } = useLanguage();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0D1322] rounded-2xl shadow-2xl border border-slate-800 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#080C14] text-white">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                <FileUp className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-white">
                {t("import_questions_title")}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {t("import_questions_desc")}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
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
              <div className="bg-[#080C14]/60 border border-slate-800 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      {t("blueprint_title")}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t("blueprint_desc")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleDownloadTemplate("csv")}
                      className="px-2.5 py-1.5 text-xs font-semibold text-emerald-400 bg-[#0D1322] border border-slate-800 rounded-lg hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
                    </button>
                    <button
                      onClick={() => handleDownloadTemplate("excel")}
                      className="px-2.5 py-1.5 text-xs font-semibold text-emerald-400 bg-[#0D1322] border border-slate-800 rounded-lg hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" /> Excel (.xlsx)
                    </button>
                    <button
                      onClick={() => handleDownloadTemplate("json")}
                      className="px-2.5 py-1.5 text-xs font-semibold text-amber-400 bg-[#0D1322] border border-slate-800 rounded-lg hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
                    >
                      <Code className="h-3.5 w-3.5" /> JSON
                    </button>
                    <button
                      onClick={() => handleDownloadTemplate("docx")}
                      className="px-2.5 py-1.5 text-xs font-semibold text-indigo-400 bg-[#0D1322] border border-slate-800 rounded-lg hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
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
                    ? "border-indigo-500 bg-indigo-500/10"
                    : file
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-slate-800 hover:border-indigo-500/50 bg-[#080C14]/40"
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
                  <div className={`p-4 rounded-full ${file ? "bg-emerald-500/10 text-emerald-400" : "bg-indigo-500/10 text-indigo-400"}`}>
                    <Upload className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {file ? file.name : t("drop_file_here")}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {file
                        ? `${(file.size / 1024).toFixed(1)} KB • ${t("ready_for_validation") || t("ready_immediate_import")}`
                        : t("import_questions_desc")}
                    </p>
                  </div>

                  {file && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                        {t("file_selected")}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="text-xs text-rose-400 hover:underline"
                      >
                        {t("back_change_file")}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Supported Format Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center text-[11px]">
                <div className="p-2 border border-slate-800 rounded-lg bg-[#080C14]">
                  <span className="font-bold text-emerald-400 block">CSV</span>
                  <span className="text-slate-500 text-[10px]">Comma-separated</span>
                </div>
                <div className="p-2 border border-slate-800 rounded-lg bg-[#080C14]">
                  <span className="font-bold text-emerald-400 block">Excel</span>
                  <span className="text-slate-500 text-[10px]">.xlsx / .xls</span>
                </div>
                <div className="p-2 border border-slate-800 rounded-lg bg-[#080C14]">
                  <span className="font-bold text-amber-400 block">JSON</span>
                  <span className="text-slate-500 text-[10px]">Structured Array</span>
                </div>
                <div className="p-2 border border-slate-800 rounded-lg bg-[#080C14]">
                  <span className="font-bold text-indigo-400 block">DOCX</span>
                  <span className="text-slate-500 text-[10px]">Word Tables/Text</span>
                </div>
                <div className="p-2 border border-slate-800 rounded-lg bg-[#080C14]">
                  <span className="font-bold text-rose-400 block">PDF</span>
                  <span className="text-slate-500 text-[10px]">Document Text</span>
                </div>
                <div className="p-2 border border-slate-800 rounded-lg bg-[#080C14]">
                  <span className="font-bold text-cyan-400 block">OCR Image</span>
                  <span className="text-slate-500 text-[10px]">PNG / JPG OCR</span>
                </div>
              </div>

              {parseError && (
                <Alert type="error">
                  <div className="font-semibold">{t("parsing_error")}</div>
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
                <div className="p-3 bg-[#080C14] border border-slate-800 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    {t("total_detected")}
                  </span>
                  <div className="text-xl font-bold text-white mt-0.5 font-mono">
                    {previewData.total_detected}
                  </div>
                  <span className="text-[10px] text-slate-500 truncate block">
                    {previewData.filename} ({previewData.file_type})
                  </span>
                </div>

                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
                    {t("valid_records")}
                  </span>
                  <div className="text-xl font-bold text-emerald-400 mt-0.5 font-mono">
                    {previewData.valid_count}
                  </div>
                  <span className="text-[10px] text-emerald-400/80">
                    {t("ready_immediate_import")}
                  </span>
                </div>

                <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                  <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block">
                    {t("validation_errors")}
                  </span>
                  <div className="text-xl font-bold text-rose-400 mt-0.5 font-mono">
                    {previewData.invalid_count}
                  </div>
                  <span className="text-[10px] text-rose-400/80">
                    {t("import_summary_errors")}
                  </span>
                </div>

                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                    {t("duplicates")}
                  </span>
                  <div className="text-xl font-bold text-amber-400 mt-0.5 font-mono">
                    {previewData.duplicate_count}
                  </div>
                  <span className="text-[10px] text-amber-400/80">
                    {t("already_in_db")}
                  </span>
                </div>
              </div>

              {/* Filter Tabs & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setActiveTab("ALL")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "ALL"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-[#080C14] text-slate-400 border border-slate-800 hover:text-white"
                    }`}
                  >
                    {t("all_filter") || "All"} ({previewData.total_detected})
                  </button>
                  <button
                    onClick={() => setActiveTab("VALID")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "VALID"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-[#080C14] text-slate-400 border border-slate-800 hover:text-white"
                    }`}
                  >
                    {t("valid_filter") || "Valid"} ({previewData.valid_count})
                  </button>
                  <button
                    onClick={() => setActiveTab("INVALID")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "INVALID"
                        ? "bg-rose-600 text-white shadow-sm"
                        : "bg-[#080C14] text-slate-400 border border-slate-800 hover:text-white"
                    }`}
                  >
                    {t("validation_errors")} ({previewData.invalid_count})
                  </button>
                  <button
                    onClick={() => setActiveTab("DUPLICATE")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "DUPLICATE"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "bg-[#080C14] text-slate-400 border border-slate-800 hover:text-white"
                    }`}
                  >
                    {t("duplicates")} ({previewData.duplicate_count})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    placeholder={`${t("search")}...`}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#080C14] border border-slate-800 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Import Options Checkboxes */}
              <div className="flex flex-wrap items-center gap-6 p-3 bg-[#080C14]/60 border border-slate-800 rounded-xl text-xs text-slate-200">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={skipInvalid}
                    onChange={(e) => setSkipInvalid(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-[#0D1322]"
                  />
                  <span>
                    <strong className="text-white">{t("skip_invalid_records")}</strong> {t("skip_invalid_desc")}
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allowDuplicates}
                    onChange={(e) => setAllowDuplicates(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-[#0D1322]"
                  />
                  <span>
                    <strong className="text-white">{t("allow_duplicate_records")}</strong> {t("allow_duplicate_desc")}
                  </span>
                </label>
              </div>

              {/* Questions List / Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800 max-h-[46vh] overflow-y-auto bg-[#080C14]/40">
                {filteredQuestions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    {t("no_results_desc")}
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
                            ? "bg-rose-500/5 hover:bg-rose-500/10"
                            : isDuplicate
                            ? "bg-amber-500/5 hover:bg-amber-500/10"
                            : "bg-[#0D1322]/40 hover:bg-[#0D1322]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1.5 flex-1">
                            {/* Meta pill badges */}
                            <div className="flex flex-wrap items-center gap-2 text-[10px]">
                              <span className="font-bold px-1.5 py-0.5 bg-[#080C14] border border-slate-800 rounded text-slate-400 font-mono">
                                #{q.row_index}
                              </span>
                              <span className="font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                {q.subject || "No Subject"}
                              </span>
                              {q.topic && (
                                <span className="text-slate-400 bg-[#080C14] px-2 py-0.5 rounded border border-slate-800">
                                  {q.topic}
                                </span>
                              )}
                              <span className="font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                                {q.question_type}
                              </span>
                              <span className="font-medium text-slate-300 bg-[#080C14] px-2 py-0.5 rounded border border-slate-800">
                                {q.difficulty}
                              </span>
                              <span className="font-semibold text-emerald-400">
                                {q.marks} Marks
                              </span>
                              {q.negative_marks > 0 && (
                                <span className="font-semibold text-rose-400">
                                  (-{q.negative_marks})
                                </span>
                              )}
                            </div>

                            {/* Question text */}
                            <div className="text-xs font-semibold text-white leading-relaxed">
                              {q.question_text || <span className="text-rose-400 italic">[Missing Question Text]</span>}
                            </div>

                            {/* Options if present */}
                            {q.options && q.options.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
                                {q.options.map((opt, oIdx) => (
                                  <div
                                    key={oIdx}
                                    className={`px-2 py-1 rounded text-[11px] flex items-center gap-1.5 ${
                                      opt.is_correct
                                        ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold"
                                        : "bg-[#080C14] border border-slate-800 text-slate-400"
                                    }`}
                                  >
                                    <span className="w-3.5 text-center font-mono text-[10px]">
                                      {String.fromCharCode(65 + oIdx)}.
                                    </span>
                                    <span className="truncate">{opt.option_text}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Model / Expected Answer */}
                            {(q.expected_answer || q.model_answer) && (
                              <div className="text-[11px] text-slate-400 bg-[#080C14] p-2 rounded-lg border border-slate-800 mt-2">
                                {q.expected_answer && <div><strong>Keywords:</strong> {q.expected_answer}</div>}
                                {q.model_answer && <div><strong>Model Rubric:</strong> {q.model_answer}</div>}
                              </div>
                            )}

                            {/* Error reasons */}
                            {((q.validation_errors && q.validation_errors.length > 0) || (q.errors && q.errors.length > 0)) && (
                              <div className="space-y-1 pt-1">
                                {(q.validation_errors || q.errors || []).map((err: string, eIdx: number) => (
                                  <div key={eIdx} className="text-[11px] text-rose-400 flex items-center gap-1.5">
                                    <AlertTriangle className="h-3 w-3 shrink-0" />
                                    <span>{err}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Status Pill */}
                          <div className="shrink-0">
                            {isValid && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Valid
                              </span>
                            )}
                            {isInvalid && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                                <XCircle className="h-3 w-3" /> Error
                              </span>
                            )}
                            {isDuplicate && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
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

          {/* STEP 3: CONFIRMATION & AUDIT RESULT */}
          {step === 3 && importResult && (
            <div className="space-y-6 max-w-md mx-auto text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">
                  {t("import_successful_title")}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t("import_successful_desc")}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 p-4 bg-[#080C14] border border-slate-800 rounded-xl text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block">{t("persisted_count")}</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    {importResult.imported_count}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{t("skipped_invalid")}</span>
                  <span className="text-lg font-bold text-rose-400 font-mono">
                    {importResult.skipped_invalid_count}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{t("skipped_dupes")}</span>
                  <span className="text-lg font-bold text-amber-400 font-mono">
                    {importResult.skipped_duplicate_count}
                  </span>
                </div>
              </div>

              <Button variant="primary" onClick={handleClose} className="w-full text-xs py-2.5 shadow-md shadow-indigo-500/20">
                {t("done_refresh_bank")}
              </Button>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-[#080C14]">
          {step === 1 && (
            <>
              <Button variant="outline" onClick={handleClose} className="text-xs border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60">
                {t("cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={handleParseAndPreview}
                disabled={!file || isParsing}
                className="text-xs gap-1.5 shadow-md shadow-indigo-500/20"
              >
                {isParsing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> {t("parsing_file")}
                  </>
                ) : (
                  <>
                    {t("parse_and_preview")} <ChevronRight className="h-3.5 w-3.5" />
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
                className="text-xs gap-1.5 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60"
                disabled={isImporting}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> {t("back_change_file")}
              </Button>

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleClose} className="text-xs border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60" disabled={isImporting}>
                  {t("cancel")}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmImport}
                  disabled={payableCount === 0 || isImporting}
                  className="text-xs gap-1.5 shadow-md shadow-indigo-500/20"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> {t("committing_to_db")}
                    </>
                  ) : (
                    <>
                      {t("confirm_and_import")} ({payableCount})
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="w-full flex justify-end">
              <Button variant="outline" onClick={handleClose} className="text-xs border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60">
                {t("close")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
