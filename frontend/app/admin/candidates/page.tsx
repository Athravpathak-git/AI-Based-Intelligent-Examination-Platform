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

export default function AdminCandidatesPage() {
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAE6DF]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-[#1C1C1F] tracking-tight">Candidate Registrations & Rosters</h1>
            <Badge variant="saffron">Admin Governance</Badge>
          </div>
          <p className="text-xs sm:text-sm text-[#6B6B76] mt-1">
            Platform-wide student registrations, exam participation records, and 17-field candidate profiles.
          </p>
        </div>
        <Button
          variant="terracotta"
          size="sm"
          onClick={handleExportCsv}
          disabled={isExporting || candidates.length === 0}
          className="gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" />
          {isExporting ? "Exporting CSV..." : "Export Full Roster CSV"}
        </Button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Analytics Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registrations"
          value={totalRegistered}
          subtitle="Across all scheduled exams"
          icon={Users}
          variant="saffron"
        />
        <StatCard
          title="Evaluated - Passed"
          value={passedCount}
          subtitle="Meets >= 50% passing threshold"
          icon={CheckCircle2}
          variant="emerald"
        />
        <StatCard
          title="Evaluated - Failed"
          value={failedCount}
          subtitle="Score under 50%"
          icon={XCircle}
          variant="rose"
        />
        <StatCard
          title="Pending / Active"
          value={pendingCount}
          subtitle="Awaiting submission or review"
          icon={Calendar}
          variant="amber"
        />
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search candidate by name, email, reg no, college..."
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6B6B76]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white border border-[#EAE6DF] rounded-xl px-3 py-2 text-[#1C1C1F] focus:outline-none focus:ring-2 focus:ring-[#E06A26]/30 font-medium"
            >
              <option value="ALL">All Candidates ({candidates.length})</option>
              <option value="PASSED">Passed ({passedCount})</option>
              <option value="FAILED">Failed ({failedCount})</option>
              <option value="PENDING">Pending / In Progress ({pendingCount})</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Candidates Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#6B6B76]">Loading candidate records from database...</div>
        ) : filteredCandidates.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="h-8 w-8 mx-auto text-[#D97706]" />
            <p className="text-sm font-bold text-[#1C1C1F]">No candidates match the specified criteria</p>
            <p className="text-xs text-[#6B6B76]">Try adjusting the search keywords or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#EAE6DF] text-[#6B6B76] font-bold">
                  <th className="py-3.5 px-4">Candidate / Reg No</th>
                  <th className="py-3.5 px-4">Institution / Program</th>
                  <th className="py-3.5 px-4">Examination</th>
                  <th className="py-3.5 px-4">Attempt Status</th>
                  <th className="py-3.5 px-4 text-center">Score / %</th>
                  <th className="py-3.5 px-4 text-center">Outcome</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE6DF]">
                {filteredCandidates.map((c) => {
                  const isPassed = c.result_status === "PASSED";
                  const isFailed = c.result_status === "FAILED";
                  return (
                    <tr key={c.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#1C1C1F]">{c.name}</div>
                        <div className="text-[11px] text-[#6B6B76] font-mono">
                          {c.registration_number || "REG-PENDING"} &bull; {c.email}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#1C1C1F]">{c.college || "N/A"}</div>
                        <div className="text-[11px] text-[#6B6B76]">
                          {c.course || "General"} {c.specialization ? `(${c.specialization})` : ""}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#1C1C1F]">{c.exam_name}</div>
                        <div className="text-[11px] text-[#6B6B76]">{c.exam_subject}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            c.attempt_status === "COMPLETED"
                              ? "emerald"
                              : c.attempt_status === "IN_PROGRESS"
                              ? "amber"
                              : "slate"
                          }
                        >
                          {c.attempt_status || "NOT_STARTED"}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">
                        {c.score !== null && c.score !== undefined ? (
                          <span className="font-bold text-[#1C1C1F]">
                            {c.score} / {c.maximum_marks} ({c.percentage}%)
                          </span>
                        ) : (
                          <span className="text-[#6B6B76]">--</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={isPassed ? "emerald" : isFailed ? "rose" : "amber"}>
                          {c.result_status || "PENDING"}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCandidate(c)}
                          className="gap-1 px-2.5 py-1 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" /> Details
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
          title={`Candidate Profile: ${selectedCandidate.name}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[#6B6B76]">Platform Registration No:</span>
                <span className="ml-2 font-mono font-bold text-[#E06A26]">
                  {selectedCandidate.registration_number || "STU-PENDING"}
                </span>
              </div>
              <Badge variant={selectedCandidate.is_active ? "emerald" : "rose"}>
                {selectedCandidate.is_active ? "Active Account" : "Inactive Account"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 border border-[#EAE6DF] rounded-xl space-y-1">
                <span className="font-bold text-[#1C1C1F] flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-[#D97706]" /> Email Address
                </span>
                <p className="text-[#6B6B76] font-mono">{selectedCandidate.email}</p>
              </div>

              <div className="p-3 border border-[#EAE6DF] rounded-xl space-y-1">
                <span className="font-bold text-[#1C1C1F] flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-[#D97706]" /> Mobile Number
                </span>
                <p className="text-[#6B6B76] font-mono">{selectedCandidate.mobile_number || "Not specified"}</p>
              </div>

              <div className="p-3 border border-[#EAE6DF] rounded-xl space-y-1">
                <span className="font-bold text-[#1C1C1F] flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#D97706]" /> Date of Birth & Gender
                </span>
                <p className="text-[#6B6B76]">
                  {selectedCandidate.date_of_birth || "N/A"} &bull; {selectedCandidate.gender || "N/A"}
                </p>
              </div>

              <div className="p-3 border border-[#EAE6DF] rounded-xl space-y-1">
                <span className="font-bold text-[#1C1C1F] flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-[#D97706]" /> College / Institute
                </span>
                <p className="text-[#6B6B76]">{selectedCandidate.college || "N/A"}</p>
              </div>

              <div className="p-3 border border-[#EAE6DF] rounded-xl space-y-1">
                <span className="font-bold text-[#1C1C1F] flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-[#D97706]" /> University
                </span>
                <p className="text-[#6B6B76]">{selectedCandidate.university || "N/A"}</p>
              </div>

              <div className="p-3 border border-[#EAE6DF] rounded-xl space-y-1">
                <span className="font-bold text-[#1C1C1F]">Course & Specialization</span>
                <p className="text-[#6B6B76]">
                  {selectedCandidate.course || "N/A"} - {selectedCandidate.specialization || "General"}
                </p>
              </div>

              <div className="p-3 border border-[#EAE6DF] rounded-xl space-y-1">
                <span className="font-bold text-[#1C1C1F]">Enrollment & Year</span>
                <p className="text-[#6B6B76] font-mono">
                  Enrollment: {selectedCandidate.enrollment_number || "N/A"} &bull; Sem:{" "}
                  {selectedCandidate.year_semester || "N/A"} &bull; Grad: {selectedCandidate.graduation_year || "N/A"}
                </p>
              </div>

              <div className="p-3 border border-[#EAE6DF] rounded-xl space-y-1">
                <span className="font-bold text-[#1C1C1F] flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#D97706]" /> Location
                </span>
                <p className="text-[#6B6B76]">
                  {[selectedCandidate.city, selectedCandidate.state, selectedCandidate.country, selectedCandidate.pin_code]
                    .filter(Boolean)
                    .join(", ") || "N/A"}
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-[#1C1C1F]">Proctoring Security Record:</span>
                <span className="ml-2 text-[#6B6B76]">
                  {selectedCandidate.proctoring_violations_count || 0} event(s) flagged during session
                </span>
              </div>
              <Badge variant={selectedCandidate.proctoring_violations_count ? "amber" : "emerald"}>
                {selectedCandidate.proctoring_violations_count ? "Flagged Events" : "Clean Integrity"}
              </Badge>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedCandidate(null)}>
                Close Details
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
