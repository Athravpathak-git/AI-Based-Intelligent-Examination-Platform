"use client";

import React, { useEffect, useState, useRef } from "react";
import { api, getErrorMessage } from "@/lib/api";
import { Question, QuestionType, DifficultyLevel } from "@/types";
import { Card, Button, Badge, Alert, StatCard } from "@/components/UIComponents";
import QuestionModal from "@/components/QuestionModal";
import QuestionImportModal from "@/components/QuestionImportModal";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Filter,
  RotateCcw,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  XCircle,
  X,
  HelpCircle,
  BookOpen,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Printer,
  Code
} from "lucide-react";

export default function QuestionsPage() {
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
  const [difficultyFilter, setDifficultyFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [isActiveFilter, setIsActiveFilter] = useState<string>("");

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
      if (difficultyFilter) params.append("difficulty", difficultyFilter);
      if (typeFilter) params.append("question_type", typeFilter);
      if (isActiveFilter) params.append("is_active", isActiveFilter);
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
    setDifficultyFilter("");
    setTypeFilter("");
    setIsActiveFilter("");
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
      if (difficultyFilter) params.append("difficulty", difficultyFilter);
      if (typeFilter) params.append("question_type", typeFilter);

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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Bulk Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#A8A29E] mb-1">
            <Layers className="h-3.5 w-3.5" />
            Curriculum Repository
          </div>
          <h1 className="text-2xl font-bold text-[#1C1C1F] tracking-tight">Question Bank Management</h1>
          <p className="text-xs text-[#6B6B76] mt-0.5">
            Maintain, filter, and import/export the authoritative multi-subject question database.
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
              className="text-xs py-2 text-[#C85332] border-[#EAE6DF] hover:bg-[#FEF3EC] gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-[#C85332]" />
              <span>Export As</span>
              <ChevronDown className="h-3 w-3 text-[#6B6B76]" />
            </Button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-52 bg-white border border-[#EAE6DF] rounded-xl shadow-xl z-30 py-1.5 text-xs animate-in fade-in slide-in-from-top-1">
                <button
                  onClick={() => handleExport("csv")}
                  className="w-full text-left px-3 py-2 hover:bg-[#FAF7F9] flex items-center gap-2 text-[#1C1C1F]"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-[#2B7853]" /> Export as CSV
                </button>
                <button
                  onClick={() => handleExport("excel")}
                  className="w-full text-left px-3 py-2 hover:bg-[#FAF7F9] flex items-center gap-2 text-[#1C1C1F]"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-[#16A34A]" /> Export as Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  className="w-full text-left px-3 py-2 hover:bg-[#FAF7F9] flex items-center gap-2 text-[#1C1C1F]"
                >
                  <FileText className="h-3.5 w-3.5 text-[#9B3D4A]" /> Export as PDF Catalog
                </button>
                <button
                  onClick={() => handleExport("docx")}
                  className="w-full text-left px-3 py-2 hover:bg-[#FAF7F9] flex items-center gap-2 text-[#1C1C1F]"
                >
                  <FileText className="h-3.5 w-3.5 text-[#2563EB]" /> Export as Word (.docx)
                </button>
                <button
                  onClick={() => handleExport("json")}
                  className="w-full text-left px-3 py-2 hover:bg-[#FAF7F9] flex items-center gap-2 text-[#1C1C1F]"
                >
                  <Code className="h-3.5 w-3.5 text-[#D97706]" /> Export as JSON
                </button>
                <div className="border-t border-[#EAE6DF] my-1"></div>
                <button
                  onClick={handlePrint}
                  className="w-full text-left px-3 py-2 hover:bg-[#FAF7F9] flex items-center gap-2 text-[#1C1C1F]"
                >
                  <Printer className="h-3.5 w-3.5 text-[#C85332]" /> Print Question Bank
                </button>
              </div>
            )}
          </div>

          {/* Import Questions Button (Placed next to Export As) */}
          <Button
            variant="secondary"
            onClick={() => {
              setIsExportMenuOpen(false);
              setIsTemplateMenuOpen(false);
              setIsImportModalOpen(true);
            }}
            className="text-xs py-2 gap-1.5 bg-[#C85332]/10 text-[#C85332] border-[#EAE6DF] hover:bg-[#C85332]/20 font-semibold"
          >
            <Upload className="h-3.5 w-3.5 text-[#C85332]" />
            <span>Import Questions</span>
          </Button>

          {/* Templates Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => {
                setIsTemplateMenuOpen(!isTemplateMenuOpen);
                setIsExportMenuOpen(false);
              }}
              className="text-xs py-2 text-[#6B6B76] border-[#EAE6DF] hover:bg-[#FEF3EC] gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#6B6B76]" />
              <span>Templates</span>
              <ChevronDown className="h-3 w-3 text-[#6B6B76]" />
            </Button>

            {isTemplateMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white border border-[#EAE6DF] rounded-xl shadow-xl z-30 py-1.5 text-xs animate-in fade-in slide-in-from-top-1">
                <button
                  onClick={() => {
                    setIsTemplateMenuOpen(false);
                    handleDownloadTemplate("csv");
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#FAF7F9] flex items-center gap-2 text-[#1C1C1F]"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-[#2B7853]" /> CSV Template
                </button>
                <button
                  onClick={() => {
                    setIsTemplateMenuOpen(false);
                    handleDownloadTemplate("excel");
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#FAF7F9] flex items-center gap-2 text-[#1C1C1F]"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-[#16A34A]" /> Excel Template
                </button>
                <button
                  onClick={() => {
                    setIsTemplateMenuOpen(false);
                    handleDownloadTemplate("json");
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#FAF7F9] flex items-center gap-2 text-[#1C1C1F]"
                >
                  <Code className="h-3.5 w-3.5 text-[#D97706]" /> JSON Template
                </button>
                <button
                  onClick={() => {
                    setIsTemplateMenuOpen(false);
                    handleDownloadTemplate("docx");
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#FAF7F9] flex items-center gap-2 text-[#1C1C1F]"
                >
                  <FileText className="h-3.5 w-3.5 text-[#2563EB]" /> Word Template
                </button>
              </div>
            )}
          </div>

          <Button variant="primary" onClick={handleAddNew} className="gap-1.5 text-xs py-2 shadow-xs">
            <Plus className="h-4 w-4" /> Add Question
          </Button>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block mb-6 border-b border-gray-300 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">IntelliExamAI — Question Bank Catalog</h1>
        <p className="text-xs text-gray-600 mt-1">
          Authoritative Question Bank &bull; Printed on {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Question Bank Aggregated Metrics */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
          <Card className="p-4 bg-gradient-to-br from-[#C85332] to-[#171719] text-white border-transparent shadow-xs">
            <span className="text-[11px] font-semibold text-[#EAE6DF] uppercase tracking-wider block">Total Questions</span>
            <div className="text-2xl font-extrabold text-[#FFFFFF] mt-1.5">{stats.total_questions.toLocaleString()}</div>
            <span className="text-[10px] text-[#FEF3EC] font-medium block mt-0.5">Authoritative in Bank</span>
          </Card>

          <Card className="p-4 bg-[#FFFFFF] border-[#EAE6DF] shadow-xs">
            <span className="text-[11px] font-semibold text-[#6B6B76] uppercase tracking-wider block">Active</span>
            <div className="text-2xl font-extrabold text-[#1C1C1F] mt-1.5">{stats.active_questions.toLocaleString()}</div>
            <span className="text-[10px] text-[#2B7853] font-semibold block mt-0.5">Ready for Blueprints</span>
          </Card>

          <Card className="p-4 bg-[#FFFFFF] border-[#EAE6DF] shadow-xs">
            <span className="text-[11px] font-semibold text-[#6B6B76] uppercase tracking-wider block">MCQ</span>
            <div className="text-2xl font-extrabold text-[#1C1C1F] mt-1.5">{stats.mcq_count.toLocaleString()}</div>
            <span className="text-[10px] text-[#6B6B76] font-medium block mt-0.5">Single Choice</span>
          </Card>

          <Card className="p-4 bg-[#FFFFFF] border-[#EAE6DF] shadow-xs">
            <span className="text-[11px] font-semibold text-[#6B6B76] uppercase tracking-wider block">Multi-Select</span>
            <div className="text-2xl font-extrabold text-[#1C1C1F] mt-1.5">{stats.multi_select_count.toLocaleString()}</div>
            <span className="text-[10px] text-[#6B6B76] font-medium block mt-0.5">Multiple Choices</span>
          </Card>

          <Card className="p-4 bg-[#FFFFFF] border-[#EAE6DF] shadow-xs">
            <span className="text-[11px] font-semibold text-[#6B6B76] uppercase tracking-wider block">Short Answer</span>
            <div className="text-2xl font-extrabold text-[#1C1C1F] mt-1.5">{stats.short_answer_count.toLocaleString()}</div>
            <span className="text-[10px] text-[#6B6B76] font-medium block mt-0.5">Keyword Match</span>
          </Card>

          <Card className="p-4 bg-[#FFFFFF] border-[#EAE6DF] shadow-xs">
            <span className="text-[11px] font-semibold text-[#6B6B76] uppercase tracking-wider block">Long Answer</span>
            <div className="text-2xl font-extrabold text-[#1C1C1F] mt-1.5">{stats.long_answer_count.toLocaleString()}</div>
            <span className="text-[10px] text-[#6B6B76] font-medium block mt-0.5">Descriptive</span>
          </Card>
        </div>
      )}

      {error && <Alert type="error">{error}</Alert>}

      {/* Filter Bar */}
      <Card className="p-4 space-y-3 bg-[#FFFFFF] border-[#EAE6DF] shadow-xs print:hidden">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          {/* Row 1: Search, Subject, Topic */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search question text or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C85332] focus:outline-none transition-all"
              />
              <Search className="h-3.5 w-3.5 text-[#A8A29E] absolute left-3 top-2.5" />
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Filter by subject (e.g. Mathematics)..."
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full pl-3 pr-3 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C85332] focus:outline-none transition-all"
              />
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Filter by topic / subtopic..."
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                className="w-full pl-3 pr-3 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C85332] focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Row 2: Difficulty, Question Type, Active Status, Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-center">
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="px-3 py-2 text-xs border rounded-xl border-[#EAE6DF] focus:ring-2 focus:ring-[#C85332] focus:outline-none bg-[#FAF8F5] text-[#1C1C1F]"
            >
              <option value="">All Difficulties</option>
              <option value="EASY">EASY</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HARD">HARD</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-xs border rounded-xl border-[#EAE6DF] focus:ring-2 focus:ring-[#C85332] focus:outline-none bg-[#FAF8F5] text-[#1C1C1F]"
            >
              <option value="">All Question Types</option>
              <option value="MCQ">MCQ</option>
              <option value="MULTI_SELECT">MULTI_SELECT</option>
              <option value="SHORT_ANSWER">SHORT_ANSWER</option>
              <option value="LONG_ANSWER">LONG_ANSWER</option>
              <option value="IMAGE_UPLOAD">IMAGE_UPLOAD</option>
            </select>

            <select
              value={isActiveFilter}
              onChange={(e) => setIsActiveFilter(e.target.value)}
              className="px-3 py-2 text-xs border rounded-xl border-[#EAE6DF] focus:ring-2 focus:ring-[#C85332] focus:outline-none bg-[#FAF8F5] text-[#1C1C1F]"
            >
              <option value="">All Statuses</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>

            <div className="flex items-center gap-2 col-span-2 sm:col-span-2">
              <Button type="submit" variant="primary" className="py-2 px-4 text-xs w-full shadow-xs">
                Apply Filters
              </Button>
              <button
                type="button"
                onClick={handleResetFilters}
                title="Reset Filters"
                className="p-2 text-[#6B6B76] hover:text-[#1C1C1F] rounded-xl border border-[#EAE6DF] hover:bg-[#FEF3EC] transition-colors"
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C85332]"></div>
        </div>
      ) : questions.length === 0 ? (
        <Card className="text-center py-16 space-y-3 bg-[#FFFFFF] border-[#EAE6DF]">
          <div className="w-12 h-12 rounded-2xl bg-[#FEF3EC] text-[#C85332] flex items-center justify-center mx-auto">
            <HelpCircle className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-[#1C1C1F]">No questions match your criteria</p>
          <p className="text-xs text-[#6B6B76]">Try clearing active filters or create a new question.</p>
          <Button variant="outline" onClick={handleAddNew} className="text-xs mt-2">
            Create First Question
          </Button>
        </Card>
      ) : (
        <div className="bg-[#FFFFFF] rounded-2xl shadow-sm border border-[#EAE6DF] overflow-hidden">
          <div className="px-5 py-3.5 bg-[#FAF8F5] border-b border-[#EAE6DF] flex flex-wrap items-center justify-between gap-3 text-xs text-[#6B6B76]">
            <div className="flex items-center gap-2 font-medium">
              <span>Showing <strong className="text-[#1C1C1F]">{questions.length}</strong> questions on Page {page}</span>
              <span className="text-[#EAE6DF]">|</span>
              <span>Subject: <strong className="text-[#C85332]">{subjectFilter || "All Subjects"}</strong></span>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <span className="font-medium text-[#6B6B76]">Page Size:</span>
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
                      ? "bg-[#C85332] text-[#FFFFFF] shadow-xs"
                      : "bg-[#FFFFFF] text-[#6B6B76] border border-[#EAE6DF] hover:bg-[#FEF3EC] hover:text-[#1C1C1F]"
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
                <tr className="bg-[#FAF8F5]/50 border-b border-[#EAE6DF] text-[11px] uppercase text-[#6B6B76] font-bold tracking-wider">
                  <th className="py-3 px-5">Subject / Topic</th>
                  <th className="py-3 px-5">Question Text</th>
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5">Difficulty</th>
                  <th className="py-3 px-5">Marks</th>
                  <th className="py-3 px-5 text-right print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE6DF]">
                {questions.map((q) => (
                  <tr key={q.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-[#1C1C1F] align-top min-w-[160px]">
                      <div className="text-xs font-bold text-[#C85332]">{q.subject}</div>
                      {q.topic && (
                        <div className="text-[11px] font-normal text-[#6B6B76] flex items-center gap-1 mt-1">
                          <span className="bg-[#FEF3EC] text-[#C85332] px-2 py-0.5 rounded-md border border-[#EAE6DF] font-medium text-[10px]">
                            {q.topic}
                          </span>
                          {q.subtopic && (
                            <span className="text-[#A8A29E]">&rsaquo; {q.subtopic}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-5 max-w-md align-top">
                      <div className="text-[#1C1C1F] font-medium line-clamp-2 leading-relaxed">{q.question_text}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {q.options?.length > 0 && (
                          <span className="text-[11px] text-[#6B6B76] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#EAE6DF]">
                            {q.options.length} options
                          </span>
                        )}
                        {q.is_active === false && (
                          <span className="text-[10px] bg-[#9B3D4A]/10 text-[#9B3D4A] border border-[#9B3D4A]/20 px-2 py-0.5 rounded font-bold">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 align-top">
                      <span className="text-[11px] font-mono font-medium text-[#C85332] bg-[#FEF3EC] px-2.5 py-1 rounded-lg border border-[#EAE6DF]">
                        {q.question_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 align-top">
                      <Badge variant={q.difficulty === "HARD" ? "danger" : q.difficulty === "MEDIUM" ? "warning" : "success"}>
                        {q.difficulty}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-5 text-xs font-semibold text-[#1C1C1F] align-top whitespace-nowrap">
                      {q.marks} pts
                      {q.negative_marks > 0 && (
                        <span className="text-[#9B3D4A] ml-1.5 text-[11px]">(-{q.negative_marks})</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right align-top whitespace-nowrap print:hidden">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(q)}
                          className="p-1.5 text-[#6B6B76] hover:text-[#C85332] rounded-lg hover:bg-[#FEF3EC] border border-transparent hover:border-[#EAE6DF] transition-colors"
                          title="Edit question"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="p-1.5 text-[#6B6B76] hover:text-[#9B3D4A] rounded-lg hover:bg-[#9B3D4A]/10 border border-transparent hover:border-[#9B3D4A]/20 transition-colors"
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
          <div className="px-5 py-3.5 bg-[#FAF8F5] border-t border-[#EAE6DF] flex items-center justify-between text-xs print:hidden">
            <span className="text-[#6B6B76]">
              Page <strong className="text-[#1C1C1F]">{page}</strong> (Showing up to {limit} questions)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="py-1 px-3 text-xs gap-1"
              >
                <ChevronLeft className="h-3 w-3" /> Previous
              </Button>
              <Button
                variant="outline"
                disabled={questions.length < limit}
                onClick={() => setPage((p) => p + 1)}
                className="py-1 px-3 text-xs gap-1"
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

