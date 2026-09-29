"use client";

import React, { useEffect, useState } from "react";
import { api, getErrorMessage } from "@/lib/api";
import { Candidate } from "@/types";
import { Card, Button, Badge, Alert, StatCard, SearchInput, Modal } from "@/components/UIComponents";
import {
  Users,
  Download,
  Search,
  Filter,
  Eye,
  GraduationCap,
  Calendar,
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Building,
  Mail,
  Phone,
  MapPin
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function AdminCandidatesPage() {
  const { t } = useLanguage();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const fetchCandidates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<Candidate[]>("/exams/admin/candidates");
      setCandidates(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const response = await api.get("/exams/admin/candidates/export/csv", {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `platform_candidates_roster_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to export candidates CSV: " + getErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.registration_number && c.registration_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.exam_name && c.exam_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.college && c.college.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "PASSED" && c.result_status === "PASSED") ||
      (statusFilter === "FAILED" && c.result_status === "FAILED") ||
      (statusFilter === "PENDING" && (!c.result_status || c.result_status === "PENDING"));

    return matchesSearch && matchesStatus;
  });

  const totalRegistered = candidates.length;
  const passedCount = candidates.filter((c) => c.result_status === "PASSED").length;
  const failedCount = candidates.filter((c) => c.result_status === "FAILED").length;
  const pendingCount = candidates.filter((c) => !c.result_status || c.result_status === "PENDING").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">{t("candidate_rosters")}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {t("admin")}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {t("candidates")}
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleExportCsv}
          disabled={isExporting || candidates.length === 0}
          className="gap-2 shadow-md shadow-indigo-500/20"
        >
          <FileSpreadsheet className="h-4 w-4" />
          {isExporting ? t("exporting_csv") : t("export_roster_csv")}
        </Button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Analytics Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t("candidate_label")}
          value={totalRegistered}
          subtitle={t("all_exams")}
          icon={Users}
          variant="cyan"
        />
        <StatCard
          title={t("status_passed")}
          value={passedCount}
          subtitle=">= 50%"
          icon={CheckCircle2}
          variant="emerald"
        />
        <StatCard
          title={t("status_failed")}
          value={failedCount}
          subtitle="< 50%"
          icon={XCircle}
          variant="rose"
        />
        <StatCard
          title={t("status_pending")}
          value={pendingCount}
          subtitle={t("in_progress")}
          icon={Calendar}
          variant="amber"
        />
      </div>

      {/* Search & Filter Bar */}
      <Card className="p-4 bg-[#0D1322]/80 backdrop-blur-md border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidate name, email, reg no, college, or exam..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center p-0.5 bg-[#080C14] rounded-xl border border-slate-800 text-xs font-semibold">
            {[
              { id: "ALL", label: t("all_candidates") },
              { id: "PASSED", label: t("status_passed") },
              { id: "FAILED", label: t("status_failed") },
              { id: "PENDING", label: t("status_pending") },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === tab.id
                    ? "bg-indigo-600 text-white shadow-sm font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Candidates Table */}
      <Card className="p-0 overflow-hidden border-slate-800 bg-[#0D1322]/80 backdrop-blur-md shadow-sm">
        {isLoading ? (
          <div className="flex justify-center p-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Users className="h-10 w-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-white">{t("no_candidates_found")}</p>
            <p className="text-xs text-slate-400">{t("no_results_desc")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#080C14]/80 border-b border-slate-800 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4">{t("candidate_label")} / {t("registration_number")}</th>
                  <th className="py-3.5 px-4">{t("college_institution")} / {t("course_degree")}</th>
                  <th className="py-3.5 px-4">{t("exams")}</th>
                  <th className="py-3.5 px-4">{t("user_status")}</th>
                  <th className="py-3.5 px-4 text-center">{t("total_marks")}</th>
                  <th className="py-3.5 px-4 text-center">{t("results")}</th>
                  <th className="py-3.5 px-4 text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredCandidates.map((c) => {
                  const isPassed = c.result_status === "PASSED";
                  const isFailed = c.result_status === "FAILED";
                  return (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{c.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {c.registration_number || "REG-PENDING"} &bull; {c.email}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">{c.college || "N/A"}</div>
                        <div className="text-[11px] text-slate-400">
                          {c.course || "General"} {c.specialization ? `(${c.specialization})` : ""}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{c.exam_name}</div>
                        <div className="text-[11px] text-indigo-400 font-mono">{c.exam_subject}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            c.attempt_status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : c.attempt_status === "IN_PROGRESS"
                              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {c.attempt_status || "NOT_STARTED"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">
                        {c.score !== null && c.score !== undefined ? (
                          <span className="font-bold text-white">
                            {c.score} / {c.maximum_marks} ({c.percentage}%)
                          </span>
                        ) : (
                          <span className="text-slate-500">--</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isPassed
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : isFailed
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {c.result_status || "PENDING"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCandidate(c)}
                          className="gap-1 px-2.5 py-1 text-xs border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60"
                        >
                          <Eye className="h-3.5 w-3.5 text-indigo-400" /> {t("details") || "Details"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Candidate 17-Field Profile Review Modal */}
      {selectedCandidate && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedCandidate(null)}
          title={`${t("profile")}: ${selectedCandidate.name}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs text-slate-200">
            <div className="p-3 bg-[#080C14] border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-slate-400">{t("platform_reg_no")}</span>
                <span className="ml-2 font-mono font-bold text-cyan-400">
                  {selectedCandidate.registration_number || "STU-PENDING"}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  selectedCandidate.is_active
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {selectedCandidate.is_active ? t("active_account") : t("inactive_account")}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 border border-slate-800 rounded-xl space-y-1 bg-[#080C14]">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-indigo-400" /> {t("email_address")}
                </span>
                <p className="text-slate-300 font-mono">{selectedCandidate.email}</p>
              </div>

              <div className="p-3 border border-slate-800 rounded-xl space-y-1 bg-[#080C14]">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-indigo-400" /> {t("mobile_number")}
                </span>
                <p className="text-slate-300 font-mono">{selectedCandidate.mobile_number || "Not specified"}</p>
              </div>

              <div className="p-3 border border-slate-800 rounded-xl space-y-1 bg-[#080C14]">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-indigo-400" /> {t("dob_gender")}
                </span>
                <p className="text-slate-300">
                  {selectedCandidate.date_of_birth || "N/A"} &bull; {selectedCandidate.gender || "N/A"}
                </p>
              </div>

              <div className="p-3 border border-slate-800 rounded-xl space-y-1 bg-[#080C14]">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-indigo-400" /> {t("college_institution")}
                </span>
                <p className="text-slate-300">{selectedCandidate.college || "N/A"}</p>
              </div>

              <div className="p-3 border border-slate-800 rounded-xl space-y-1 bg-[#080C14]">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-indigo-400" /> {t("university")}
                </span>
                <p className="text-slate-300">{selectedCandidate.university || "N/A"}</p>
              </div>

              <div className="p-3 border border-slate-800 rounded-xl space-y-1 bg-[#080C14]">
                <span className="font-bold text-white">{t("course_specialization")}</span>
                <p className="text-slate-300">
                  {selectedCandidate.course || "N/A"} - {selectedCandidate.specialization || "General"}
                </p>
              </div>

              <div className="p-3 border border-slate-800 rounded-xl space-y-1 bg-[#080C14]">
                <span className="font-bold text-white">{t("enrollment_year")}</span>
                <p className="text-slate-300 font-mono">
                  Enrollment: {selectedCandidate.enrollment_number || "N/A"} &bull; Sem:{" "}
                  {selectedCandidate.year_semester || "N/A"} &bull; Grad: {selectedCandidate.graduation_year || "N/A"}
                </p>
              </div>

              <div className="p-3 border border-slate-800 rounded-xl space-y-1 bg-[#080C14]">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-indigo-400" /> {t("location")}
                </span>
                <p className="text-slate-300">
                  {[selectedCandidate.city, selectedCandidate.state, selectedCandidate.country, selectedCandidate.pin_code]
                    .filter(Boolean)
                    .join(", ") || "N/A"}
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#080C14] border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-white">{t("proctoring_record")}:</span>
                <span className="ml-2 text-slate-400">
                  {selectedCandidate.proctoring_violations_count || 0} event(s) flagged during session
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  selectedCandidate.proctoring_violations_count
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                }`}
              >
                {selectedCandidate.proctoring_violations_count ? t("flagged_events") : t("clean_integrity")}
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCandidate(null)}
                className="border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60"
              >
                {t("close_details")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
