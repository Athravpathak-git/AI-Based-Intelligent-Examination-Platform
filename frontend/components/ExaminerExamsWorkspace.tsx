"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api, getErrorMessage } from "@/lib/api";
import { Exam, Candidate } from "@/types";
import { Card, Button, Badge, Alert } from "@/components/UIComponents";
import ExamModal from "@/components/ExamModal";
import {
  Plus,
  Trash2,
  Edit2,
  Clock,
  Calendar,
  CheckCircle2,
  Users,
  Eye,
  Award,
  X,
  FileSpreadsheet,
  Layers,
  ShieldCheck
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function ExaminerExamsWorkspace() {
  const { t } = useLanguage();
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  // Candidate Modal State
  const [selectedExamForCandidates, setSelectedExamForCandidates] = useState<Exam | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);

  const fetchExams = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<Exam[]>("/exams");
      setExams(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleCreateNew = () => {
    setEditingExam(null);
    setIsModalOpen(true);
  };

  const handleEditExam = (exam: Exam) => {
    setEditingExam(exam);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this exam configuration?")) return;
    try {
      await api.delete(`/exams/${id}`);
      fetchExams();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // View Candidates for Exam
  const handleViewCandidates = async (exam: Exam) => {
    setSelectedExamForCandidates(exam);
    setIsLoadingCandidates(true);
    try {
      const res = await api.get<Candidate[]>(`/exams/${exam.id}/candidates`);
      setCandidates(res.data);
    } catch (err) {
      alert("Failed to load registered candidates: " + getErrorMessage(err));
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  const handleExportCandidateCsv = async (examId: number, examName: string) => {
    try {
      const response = await api.get(`/exams/${examId}/candidates/export/csv`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `candidates_exam_${examId}_${examName.replace(/\s+/g, "_")}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to export candidates CSV: " + getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
            <Layers className="h-4 w-4" />
            <span>Assessment Management</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{t("configure_exam")}</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {t("examiner_hero_desc")}
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleCreateNew}
          className="gap-2 shadow-lg shadow-indigo-500/20"
        >
          <Plus className="h-4 w-4" /> {t("create_new_exam")}
        </Button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {isLoading ? (
        <div className="flex justify-center p-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : exams.length === 0 ? (
        <Card className="text-center py-16 space-y-4 border-dashed border-slate-800 bg-[#0D1322]/50">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
            <Layers className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">{t("no_exams_available")}</p>
            <p className="text-xs text-slate-400">Get started by creating your first standardized examination blueprint.</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateNew}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> {t("create_new_exam")}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map((exam) => (
            <Card
              key={exam.id}
              className="space-y-4 flex flex-col justify-between p-6 bg-[#0D1322]/80 backdrop-blur-md border-slate-800/80 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5 transition-all"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3.5">
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg text-white leading-snug">{exam.name}</h3>
                    <span className="text-xs font-semibold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-lg border border-cyan-500/20 inline-block font-mono">
                      {exam.subject}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEditExam(exam)}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800/60 transition-colors"
                      title={t("edit")}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(exam.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                      title={t("delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-[#080C14]/60 p-3 rounded-xl text-center text-xs border border-slate-800/80">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">{t("duration")}</span>
                    <span className="font-bold text-slate-100 font-mono text-sm">{exam.duration_minutes}m</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">{t("questions")}</span>
                    <span className="font-bold text-slate-100 font-mono text-sm">{exam.total_questions}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">{t("total_marks")}</span>
                    <span className="font-bold text-indigo-400 font-mono text-sm">{exam.maximum_marks}</span>
                  </div>
                </div>

                {/* Timing Window */}
                <div className="space-y-1.5 text-xs text-slate-400 bg-[#080C14]/30 p-2.5 rounded-xl border border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    <span><strong className="text-slate-200">{t("start_time")}:</strong> {new Date(exam.start_time).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <span><strong className="text-slate-200">{t("end_time")}:</strong> {new Date(exam.end_time).toLocaleString()}</span>
                  </div>
                </div>

                {/* Rules & Features Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {exam.randomize_questions && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Randomized Questions
                    </span>
                  )}
                  {exam.randomize_options && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Randomized Options
                    </span>
                  )}
                  {exam.per_student_unique_paper && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Unique Per-Student Seed
                    </span>
                  )}
                  {exam.negative_marking_enabled && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      Negative Marking
                    </span>
                  )}
                  {exam.webcam_monitoring_enabled && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Proctored Gaze ({exam.gaze_sensitivity})
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800/80 text-slate-300 border border-slate-700/80">
                    Max Warnings: {exam.maximum_tab_switch_warnings}
                  </span>
                </div>
              </div>

              {/* Action Bar for Candidates and Results */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewCandidates(exam)}
                  className="w-1/2 text-xs border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60"
                >
                  <Users className="h-3.5 w-3.5 mr-1.5 text-cyan-400" />
                  {t("candidates")}
                </Button>

                <Link href={`/examiner/results?exam_id=${exam.id}`} className="w-1/2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full text-xs shadow-md shadow-indigo-500/10"
                  >
                    <Award className="h-3.5 w-3.5 mr-1.5 text-white" />
                    {t("results")}
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Create / Edit Exam */}
      <ExamModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingExam(null);
        }}
        onSaved={fetchExams}
        initialData={editingExam}
      />

      {/* Modal: Registered Candidates Viewer */}
      {selectedExamForCandidates && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-3xl w-full bg-[#0D1322] rounded-2xl p-6 space-y-4 shadow-2xl border border-slate-800 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{t("candidate_rosters")}</h3>
                <p className="text-xs text-slate-400">
                  {t("exams")}: <strong className="text-slate-200">{selectedExamForCandidates.name}</strong> ({selectedExamForCandidates.subject})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleExportCandidateCsv(selectedExamForCandidates.id, selectedExamForCandidates.name)}
                  className="text-xs py-1.5 gap-1.5 text-indigo-400 border-slate-800 hover:bg-slate-800/60 hover:border-indigo-500/40"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> {t("export_csv")}
                </Button>
                <button
                  onClick={() => setSelectedExamForCandidates(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {isLoadingCandidates ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : candidates.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Users className="h-8 w-8 text-slate-600 mx-auto" />
                <p className="text-sm font-medium text-slate-400">{t("no_results_desc")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>{t("candidates")}: <strong className="text-slate-200">{candidates.length}</strong></span>
                  <span className="text-[11px] text-slate-400">{t("server_authoritative_calc")}</span>
                </div>

                <div className="max-h-96 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800/80 bg-[#080C14]/40">
                  {candidates.map((c, idx) => (
                    <div key={c.student_id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 text-xs transition-colors">
                      <div className="flex items-start gap-3">
                        <span className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 border border-indigo-500/20 font-mono">
                          {idx + 1}
                        </span>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{c.name}</span>
                            <span className="font-mono text-[11px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                              {c.registration_number || "REG-PENDING"}
                            </span>
                          </div>
                          <div className="text-slate-400 font-mono text-[11px]">{c.email}</div>
                          {(c.college || c.course) && (
                            <div className="text-[11px] text-slate-400">
                              {c.college || c.university} {c.course && `• ${c.course}`}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              c.attempt_status === "SUBMITTED"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : c.attempt_status === "ACTIVE"
                                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse"
                                : c.attempt_status?.includes("VIOLATION")
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            {c.attempt_status || "NOT_STARTED"}
                          </span>
                          {c.score !== null && c.score !== undefined && (
                            <span className="font-bold text-white text-xs font-mono">
                              {c.score.toFixed(1)} pts ({c.percentage?.toFixed(0)}%)
                            </span>
                          )}
                        </div>

                        {c.proctoring_violations_count && c.proctoring_violations_count > 0 ? (
                          <div className="text-[10px] font-semibold text-rose-400">
                            ⚠ {c.proctoring_violations_count} violation(s) logged
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400">
                            Registered {new Date(c.registered_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <Button
                variant="outline"
                onClick={() => setSelectedExamForCandidates(null)}
                className="text-xs py-2 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60"
              >
                {t("close")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
