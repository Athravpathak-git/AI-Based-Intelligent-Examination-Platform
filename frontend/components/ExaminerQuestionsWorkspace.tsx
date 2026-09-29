"use client";

import React, { useEffect, useState } from "react";
import { api, getErrorMessage } from "@/lib/api";
import { Question, QuestionType, DifficultyLevel } from "@/types";
import { Card, Button, Badge, Alert } from "@/components/UIComponents";
import QuestionModal from "@/components/QuestionModal";
import QuestionImportModal from "@/components/QuestionImportModal";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  RotateCcw,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Printer,
  Code
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function ExaminerQuestionsWorkspace() {
  const { t } = useLanguage();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Scale
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [stats, setStats] = useState<{
    total_questions: number;
    active_questions: number;
    mcq_count: number;
    multi_select_count: number;
    short_answer_count: number;
    long_answer_count: number;
    by_subject: Record<string, number>;
  } | null>(null);

  // Filters
  const [subjectFilter, setSubjectFilter] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [subtopicFilter, setSubtopicFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [isActiveFilter, setIsActiveFilter] = useState<string>("ALL");

  // Question Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Import & Export Modal / Menu States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await api.get("/questions/stats/summary");
      setStats(res.data);
    } catch {}
  };

  const fetchQuestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (subjectFilter.trim()) params.append("subject", subjectFilter.trim());
      if (topicFilter.trim()) params.append("topic", topicFilter.trim());
      if (subtopicFilter.trim()) params.append("subtopic", subtopicFilter.trim());
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (difficultyFilter && difficultyFilter !== "ALL") params.append("difficulty", difficultyFilter);
      if (typeFilter && typeFilter !== "ALL") params.append("question_type", typeFilter);
      if (isActiveFilter && isActiveFilter !== "ALL") params.append("is_active", isActiveFilter);
      params.append("page", String(page));
      params.append("limit", String(limit));

      const res = await api.get<Question[]>(`/questions?${params.toString()}`);
      setQuestions(res.data);
      fetchStats();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [difficultyFilter, typeFilter, isActiveFilter, page, limit]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchQuestions();
  };

  const handleResetFilters = () => {
    setSubjectFilter("");
    setTopicFilter("");
    setSubtopicFilter("");
    setSearchQuery("");
    setDifficultyFilter("ALL");
    setTypeFilter("ALL");
    setIsActiveFilter("ALL");
    setPage(1);
    setTimeout(fetchQuestions, 0);
  };

  const handleEdit = (q: Question) => {
    setEditingQuestion(q);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      await api.delete(`/questions/${id}`);
      fetchQuestions();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleAddNew = () => {
    setEditingQuestion(null);
    setIsModalOpen(true);
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
        csv: "questions_template.csv",
        excel: "questions_template.xlsx",
        json: "questions_template.json",
        docx: "questions_template.docx",
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

  // Export handlers
  const handleExport = async (format: "csv" | "excel" | "pdf" | "docx" | "json") => {
    setIsExportMenuOpen(false);
    try {
      const params = new URLSearchParams();
      if (subjectFilter.trim()) params.append("subject", subjectFilter.trim());
      if (difficultyFilter && difficultyFilter !== "ALL") params.append("difficulty", difficultyFilter);
      if (typeFilter && typeFilter !== "ALL") params.append("question_type", typeFilter);

      const mimeTypes: Record<string, string> = {
        csv: "text/csv",
        excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        pdf: "application/pdf",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        json: "application/json",
      };
      const extensions: Record<string, string> = {
        csv: "question_bank_export.csv",
        excel: "question_bank_export.xlsx",
        pdf: "question_catalog.pdf",
        docx: "question_bank_catalog.docx",
        json: "question_bank_export.json",
      };

      const res = await api.get(`/questions/export/${format}?${params.toString()}`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: mimeTypes[format] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", extensions[format]);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Failed to export questions ${format.toUpperCase()}: ` + getErrorMessage(err));
    }
  };

  const handlePrint = () => {
    setIsExportMenuOpen(false);
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Top Header & Bulk Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
            <Layers className="h-3.5 w-3.5" />
            <span>{t("question_bank")}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{t("question_bank")}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {t("examiner_hero_desc")}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export As Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => {
                setIsExportMenuOpen(!isExportMenuOpen);
                setIsTemplateMenuOpen(false);
              }}
              className="text-xs py-2 text-indigo-300 border-slate-800 hover:bg-slate-800/60 hover:border-indigo-500/40 gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-indigo-400" />
              <span>{t("export_as")}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </Button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-52 bg-[#0D1322] border border-slate-800 rounded-xl shadow-2xl z-30 py-1.5 text-xs text-slate-200 animate-in fade-in slide-in-from-top-1">
                <button
                  onClick={() => handleExport("csv")}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800/80 flex items-center gap-2 text-slate-200 transition-colors"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Export as CSV
                </button>
                <button
                  onClick={() => handleExport("excel")}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800/80 flex items-center gap-2 text-slate-200 transition-colors"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Export as Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleExport("json")}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800/80 flex items-center gap-2 text-slate-200 transition-colors"
                >
                  <Code className="h-3.5 w-3.5 text-cyan-400" /> Export as JSON
                </button>
                <button
                  onClick={() => handleExport("docx")}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800/80 flex items-center gap-2 text-slate-200 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5 text-indigo-400" /> Export as Word (.docx)
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800/80 flex items-center gap-2 text-slate-200 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5 text-rose-400" /> Export Catalog PDF
                </button>
                <div className="border-t border-slate-800 my-1" />
                <button
                  onClick={handlePrint}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800/80 flex items-center gap-2 text-slate-200 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-400" /> Print Question Catalog
                </button>
              </div>
            )}
          </div>

          {/* Import Questions Button */}
          <Button
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
            className="text-xs py-2 text-cyan-300 border-slate-800 hover:bg-slate-800/60 hover:border-cyan-500/40 gap-1.5"
          >
            <Upload className="h-3.5 w-3.5 text-cyan-400" />
            <span>{t("import_questions_title")}</span>
          </Button>

          {/* Templates Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => {
                setIsTemplateMenuOpen(!isTemplateMenuOpen);
                setIsExportMenuOpen(false);
              }}
              className="text-xs py-2 text-slate-300 border-slate-800 hover:bg-slate-800/60 hover:text-white gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-slate-400" />
              <span>{t("sample_templates")}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </Button>

            {isTemplateMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-[#0D1322] border border-slate-800 rounded-xl shadow-2xl z-30 py-1.5 text-xs text-slate-200 animate-in fade-in slide-in-from-top-1">
                <button
                  onClick={() => {
                    setIsTemplateMenuOpen(false);
                    handleDownloadTemplate("csv");
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800/80 flex items-center gap-2 text-slate-200 transition-colors"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> CSV Template
                </button>
                <button
                  onClick={() => {
                    setIsTemplateMenuOpen(false);
                    handleDownloadTemplate("excel");
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800/80 flex items-center gap-2 text-slate-200 transition-colors"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Excel Template
                </button>
                <button
                  onClick={() => {
                    setIsTemplateMenuOpen(false);
                    handleDownloadTemplate("json");
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800/80 flex items-center gap-2 text-slate-200 transition-colors"
                >
                  <Code className="h-3.5 w-3.5 text-amber-400" /> JSON Template
                </button>
                <button
                  onClick={() => {
                    setIsTemplateMenuOpen(false);
                    handleDownloadTemplate("docx");
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800/80 flex items-center gap-2 text-slate-200 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5 text-indigo-400" /> Word Template
                </button>
              </div>
            )}
          </div>

          <Button
            variant="primary"
            onClick={handleAddNew}
            className="gap-1.5 text-xs py-2 shadow-lg shadow-indigo-500/20"
          >
            <Plus className="h-4 w-4" /> {t("create_question")}
          </Button>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block mb-6 border-b border-gray-300 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">{t("question_bank")}</h1>
        <p className="text-xs text-gray-600 mt-1">
          {t("question_bank")} &bull; Printed on {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Question Bank Aggregated Metrics */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
          <Card className="p-4 bg-[#0D1322] border-slate-800 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">{t("total_questions_count") || "Total Questions"}</span>
            <div className="text-2xl font-extrabold text-indigo-400 mt-1.5 font-mono">{stats.total_questions.toLocaleString()}</div>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">{t("server_authoritative_calc")}</span>
          </Card>

          <Card className="p-4 bg-[#0D1322] border-slate-800 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">{t("active_status")}</span>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1.5 font-mono">{stats.active_questions.toLocaleString()}</div>
            <span className="text-[10px] text-emerald-400/80 font-semibold block mt-0.5">{t("active_status")}</span>
          </Card>

          <Card className="p-4 bg-[#0D1322] border-slate-800 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">MCQ</span>
            <div className="text-2xl font-extrabold text-slate-100 mt-1.5 font-mono">{stats.mcq_count.toLocaleString()}</div>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">{t("question")}</span>
          </Card>

          <Card className="p-4 bg-[#0D1322] border-slate-800 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Multi-Select</span>
            <div className="text-2xl font-extrabold text-slate-100 mt-1.5 font-mono">{stats.multi_select_count.toLocaleString()}</div>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">{t("question")}</span>
          </Card>

          <Card className="p-4 bg-[#0D1322] border-slate-800 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Short Answer</span>
            <div className="text-2xl font-extrabold text-slate-100 mt-1.5 font-mono">{stats.short_answer_count.toLocaleString()}</div>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">{t("question")}</span>
          </Card>

          <Card className="p-4 bg-[#0D1322] border-slate-800 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Long Answer</span>
            <div className="text-2xl font-extrabold text-slate-100 mt-1.5 font-mono">{stats.long_answer_count.toLocaleString()}</div>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">{t("question")}</span>
          </Card>
        </div>
      )}

      {error && <Alert type="error">{error}</Alert>}

      {/* Filter Bar */}
      <Card className="p-4 space-y-3 bg-[#0D1322]/80 backdrop-blur-md border-slate-800 shadow-sm print:hidden">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          {/* Row 1: Search, Subject, Topic */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search question text or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white focus:bg-[#0D1322] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-500"
              />
              <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-2.5" />
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Filter by subject (e.g. Mathematics)..."
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full pl-3 pr-3 py-2 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white focus:bg-[#0D1322] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-500"
              />
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Filter by topic / subtopic..."
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                className="w-full pl-3 pr-3 py-2 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white focus:bg-[#0D1322] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Row 2: Type, Difficulty, Active & Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white focus:bg-[#0D1322] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all"
              >
                <option value="ALL">All Types</option>
                <option value="MCQ">MCQ (Single)</option>
                <option value="MULTI_SELECT">Multi Select</option>
                <option value="SHORT_ANSWER">Short Answer</option>
                <option value="LONG_ANSWER">Long Answer</option>
                <option value="IMAGE_UPLOAD">Image Solution</option>
              </select>
            </div>

            <div>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white focus:bg-[#0D1322] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all"
              >
                <option value="ALL">All Difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>

            <div>
              <select
                value={isActiveFilter}
                onChange={(e) => setIsActiveFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white focus:bg-[#0D1322] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all"
              >
                <option value="ALL">Active & Inactive</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full text-xs py-2 shadow-sm"
              >
                Apply Filters
              </Button>
              <button
                type="button"
                onClick={handleResetFilters}
                title="Reset Filters"
                className="p-2 text-slate-400 hover:text-white rounded-xl border border-slate-800 hover:bg-slate-800/60 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </form>
      </Card>

      {/* Questions Table */}
      {isLoading ? (
        <div className="flex justify-center p-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : questions.length === 0 ? (
        <Card className="text-center py-16 space-y-3 bg-[#0D1322]/50 border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
            <HelpCircle className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-white">No questions match your criteria</p>
          <p className="text-xs text-slate-400">Try clearing active filters or create a new question.</p>
          <Button
            variant="outline"
            onClick={handleAddNew}
            className="text-xs mt-2 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60"
          >
            Create First Question
          </Button>
        </Card>
      ) : (
        <div className="bg-[#0D1322]/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
          <div className="px-5 py-3.5 bg-[#080C14]/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2 font-medium">
              <span>Showing <strong className="text-white">{questions.length}</strong> questions on Page {page}</span>
              <span className="text-slate-700">|</span>
              <span>Subject: <strong className="text-indigo-400">{subjectFilter || "All Subjects"}</strong></span>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <span className="font-medium text-slate-400">Page Size:</span>
              {[25, 50, 100, 250].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setLimit(s);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    limit === s
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-[#080C14] text-slate-400 border border-slate-800 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#080C14]/80 border-b border-slate-800 text-[11px] uppercase text-slate-400 font-bold tracking-wider">
                  <th className="py-3 px-5">Subject / Topic</th>
                  <th className="py-3 px-5">Question Text</th>
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5">Difficulty</th>
                  <th className="py-3 px-5">Marks</th>
                  <th className="py-3 px-5 text-right print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {questions.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-white align-top min-w-[160px]">
                      <div className="text-xs font-bold text-indigo-400">{q.subject}</div>
                      {q.topic && (
                        <div className="text-[11px] font-normal text-slate-400 flex items-center gap-1 mt-1">
                          <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-md border border-indigo-500/20 font-medium text-[10px]">
                            {q.topic}
                          </span>
                          {q.subtopic && (
                            <span className="text-slate-500">&rsaquo; {q.subtopic}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-5 max-w-md align-top">
                      <div className="text-slate-200 font-medium line-clamp-2 leading-relaxed">{q.question_text}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {q.options?.length > 0 && (
                          <span className="text-[11px] text-slate-400 bg-[#080C14] px-2 py-0.5 rounded border border-slate-800">
                            {q.options.length} options
                          </span>
                        )}
                        {q.is_active === false && (
                          <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded font-bold">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 align-top">
                      <span className="text-[11px] font-mono font-medium text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                        {q.question_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 align-top">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          q.difficulty === "HARD"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                            : q.difficulty === "MEDIUM"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-xs font-semibold text-white align-top whitespace-nowrap font-mono">
                      {q.marks} pts
                      {q.negative_marks > 0 && (
                        <span className="text-rose-400 ml-1.5 text-[11px]">(-{q.negative_marks})</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right align-top whitespace-nowrap print:hidden">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(q)}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-indigo-500/10 transition-colors"
                          title="Edit question"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                          title="Delete question"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer Pagination */}
          <div className="px-5 py-3.5 bg-[#080C14]/60 border-t border-slate-800 flex items-center justify-between text-xs print:hidden">
            <span className="text-slate-400">
              Page <strong className="text-white">{page}</strong> (Showing up to {limit} questions)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="py-1 px-3 text-xs gap-1 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60"
              >
                <ChevronLeft className="h-3 w-3" /> Previous
              </Button>
              <Button
                variant="outline"
                disabled={questions.length < limit}
                onClick={() => setPage((p) => p + 1)}
                className="py-1 px-3 text-xs gap-1 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60"
              >
                Next <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Question Modal (Create / Edit) */}
      <QuestionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchQuestions}
        initialData={editingQuestion}
      />

      {/* Multi-Format Question Import Modal */}
      <QuestionImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={fetchQuestions}
      />
    </div>
  );
}
