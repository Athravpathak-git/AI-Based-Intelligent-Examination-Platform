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
  FileSpreadsheet
} from "lucide-react";

export default function ExaminerExamsPage() {
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
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAE6DF]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1C1C1F] tracking-tight">Exam Architecture & Configurations</h1>
          <p className="text-xs sm:text-sm text-[#6B6B76] mt-1">
            Configure examination schedules, deterministic paper seeds, and view registered candidates.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleCreateNew} className="gap-2">
          <Plus className="h-4 w-4" /> Create Exam
        </Button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C85332]"></div>
        </div>
      ) : exams.length === 0 ? (
        <Card className="text-center py-12 space-y-3 border-dashed border-[#EAE6DF]">
          <p className="text-sm text-[#6B6B76]">No exams configured yet.</p>
          <Button variant="outline" size="sm" onClick={handleCreateNew}>
            Create Your First Exam
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map((exam) => (
            <Card key={exam.id} className="space-y-4 flex flex-col justify-between p-6 hover:shadow-md transition-shadow border-[#EAE6DF]">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-[#EAE6DF] pb-3">
                  <div>
                    <h3 className="font-bold text-lg text-[#1C1C1F]">{exam.name}</h3>
                    <span className="text-xs font-bold text-[#C85332] uppercase tracking-wider bg-[#FEF3EC] px-2 py-0.5 rounded-md border border-[#E8DCE6] inline-block mt-1">
                      {exam.subject}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditExam(exam)}
                      className="p-1.5 text-[#A8A29E] hover:text-[#C85332] rounded-lg hover:bg-[#FEF3EC] transition-colors"
                      title="Edit Exam Configuration"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(exam.id)}
                      className="p-1.5 text-[#A8A29E] hover:text-[#9B3D4A] rounded-lg hover:bg-[#FDF2F4] transition-colors"
                      title="Delete Exam"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-[#FAF8F5] p-3 rounded-xl text-center text-xs border border-[#EAE6DF]">
                  <div>
                    <span className="text-[#A8A29E] block text-[10px] font-semibold">Duration</span>
                    <span className="font-bold text-[#1C1C1F] font-mono">{exam.duration_minutes}m</span>
                  </div>
                  <div>
                    <span className="text-[#A8A29E] block text-[10px] font-semibold">Questions</span>
                    <span className="font-bold text-[#1C1C1F] font-mono">{exam.total_questions}</span>
                  </div>
                  <div>
                    <span className="text-[#A8A29E] block text-[10px] font-semibold">Max Marks</span>
                    <span className="font-bold text-[#C85332] font-mono">{exam.maximum_marks}</span>
                  </div>
                </div>

                {/* Timing Window */}
                <div className="space-y-1 text-xs text-[#6B6B76]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[#A8A29E]" />
                    <span><strong className="text-[#1C1C1F]">Starts:</strong> {new Date(exam.start_time).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#A8A29E]" />
                    <span><strong className="text-[#1C1C1F]">Ends:</strong> {new Date(exam.end_time).toLocaleString()}</span>
                  </div>
                </div>

                {/* Rules & Features Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {exam.randomize_questions && <Badge variant="emerald">Randomized Questions</Badge>}
                  {exam.randomize_options && <Badge variant="emerald">Randomized Options</Badge>}
                  {exam.per_student_unique_paper && <Badge variant="plum">Unique Per-Student Seed</Badge>}
                  {exam.negative_marking_enabled && <Badge variant="rose">Negative Marking</Badge>}
                  {exam.webcam_monitoring_enabled && (
                    <Badge variant="amber">Proctored Gaze: {exam.gaze_sensitivity}</Badge>
                  )}
                  <Badge variant="slate">Max Warnings: {exam.maximum_tab_switch_warnings}</Badge>
                </div>
              </div>

              {/* Action Bar for Candidates and Results */}
              <div className="pt-3 border-t border-[#EAE6DF] flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewCandidates(exam)}
                  className="w-1/2 text-xs"
                >
                  <Users className="h-3.5 w-3.5 mr-1 text-[#C85332]" />
                  View Candidates
                </Button>

                <Link href={`/examiner/results?exam_id=${exam.id}`} className="w-1/2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full text-xs"
                  >
                    <Award className="h-3.5 w-3.5 mr-1" />
                    Results & Scores
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-3xl w-full bg-white rounded-2xl p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Registered Candidates Roster</h3>
                <p className="text-xs text-slate-500">
                  Exam: <strong className="text-slate-800">{selectedExamForCandidates.name}</strong> ({selectedExamForCandidates.subject})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleExportCandidateCsv(selectedExamForCandidates.id, selectedExamForCandidates.name)}
                  className="text-xs py-1.5 gap-1.5 text-[#E06A26] border-[#FAD9C5] hover:bg-[#FEF3EC]"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Export Roster CSV
                </Button>
                <button
                  onClick={() => setSelectedExamForCandidates(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {isLoadingCandidates ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E06A26]"></div>
              </div>
            ) : candidates.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Users className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-sm font-medium text-slate-600">No candidates registered for this exam yet.</p>
                <p className="text-xs text-slate-400">Students can enroll from their Student Examination Portal.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span>Total Enrolled: <strong className="text-slate-900">{candidates.length}</strong> candidates</span>
                  <span className="text-[11px] text-slate-400">Live authoritative registry</span>
                </div>

                <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {candidates.map((c, idx) => (
                    <div key={c.student_id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 text-xs transition-colors">
                      <div className="flex items-start gap-3">
                        <span className="h-8 w-8 rounded-full bg-[#FEF3EC] text-[#E06A26] font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                            <span className="font-mono text-[11px] font-bold text-[#E06A26] bg-[#FEF3EC] px-1.5 py-0.5 rounded border border-[#FAD9C5]">
                              {c.registration_number || "REG-PENDING"}
                            </span>
                          </div>
                          <div className="text-slate-500">{c.email}</div>
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
                                ? "bg-emerald-100 text-emerald-700"
                                : c.attempt_status === "ACTIVE"
                                ? "bg-[#FEF3EC] text-[#E06A26] animate-pulse"
                                : c.attempt_status?.includes("VIOLATION")
                                ? "bg-rose-100 text-rose-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {c.attempt_status || "NOT_STARTED"}
                          </span>
                          {c.score !== null && c.score !== undefined && (
                            <span className="font-bold text-slate-800 text-xs">
                              {c.score.toFixed(1)} pts ({c.percentage?.toFixed(0)}%)
                            </span>
                          )}
                        </div>

                        {c.proctoring_violations_count && c.proctoring_violations_count > 0 ? (
                          <div className="text-[10px] font-semibold text-rose-600">
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

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setSelectedExamForCandidates(null)}
                className="text-xs py-2"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
