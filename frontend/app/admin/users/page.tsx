"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api, getErrorMessage } from "@/lib/api";
import { User, UserRole } from "@/types";
import { Card, Button, Badge, Alert, Modal, SearchInput } from "@/components/UIComponents";
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  ArrowLeft,
  Filter,
  UserCheck,
  UserX,
  X,
  Trash2,
  Lock,
  Mail,
  Calendar
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function AdminUsersPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Create User Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalName, setModalName] = useState<string>("");
  const [modalEmail, setModalEmail] = useState<string>("");
  const [modalPassword, setModalPassword] = useState<string>("");
  const [modalRole, setModalRole] = useState<string>("EXAMINER");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.append("role", roleFilter);
      const res = await api.get<User[]>(`/auth/admin/users?${params.toString()}`);
      setUsers(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  // Toggle user active status
  const handleToggleStatus = async (user: User) => {
    const newStatus = !user.is_active;
    const confirmMsg = newStatus
      ? `Activate account for ${user.name}?`
      : `Deactivate account for ${user.name}? They will be blocked from logging in.`;

    if (!confirm(confirmMsg)) return;

    try {
      await api.put(`/auth/admin/users/${user.id}/status?is_active=${newStatus}`);
      fetchUsers();
    } catch (err) {
      alert("Failed to update status: " + getErrorMessage(err));
    }
  };

  // Safe delete / deactivation handler
  const handleDeleteUser = async (u: User) => {
    if (!confirm(`Are you sure you want to deactivate and revoke access for ${u.name}?`)) return;
    try {
      await api.delete(`/auth/admin/users/${u.id}`);
      fetchUsers();
    } catch (err) {
      alert("Action prevented: " + getErrorMessage(err));
    }
  };

  // Create user handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);

    try {
      await api.post("/auth/admin/users", {
        name: modalName,
        email: modalEmail,
        password: modalPassword,
        role: modalRole,
      });
      setIsModalOpen(false);
      setModalName("");
      setModalEmail("");
      setModalPassword("");
      fetchUsers();
    } catch (err: any) {
      setModalError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter by search query
  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.registration_number && u.registration_number.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5 shadow-sm">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/admin"
                className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="h-3 w-3" /> Dashboard
              </Link>
              <span className="text-slate-700">&bull;</span>
              <span className="text-xs font-semibold text-indigo-400">Governance</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{t("user_directory")}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage accounts, assign roles, and administer active platform credentials.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-2 shadow-md shadow-indigo-500/20"
        >
          <Plus className="h-4 w-4" /> {t("create_account")}
        </Button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0D1322]/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Accounts</span>
          <div className="text-2xl font-black text-white font-mono">{users.length}</div>
          <p className="text-[10px] text-slate-500">Active Directory Size</p>
        </div>

        <div className="bg-[#0D1322]/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Students</span>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {users.filter((u) => u.role === "STUDENT").length}
          </div>
          <p className="text-[10px] text-slate-500">Candidates with Exam Access</p>
        </div>

        <div className="bg-[#0D1322]/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Examiners</span>
          <div className="text-2xl font-black text-cyan-400 font-mono">
            {users.filter((u) => u.role === "EXAMINER").length}
          </div>
          <p className="text-[10px] text-slate-500">Curators & Evaluators</p>
        </div>

        <div className="bg-[#0D1322]/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Administrators</span>
          <div className="text-2xl font-black text-indigo-400 font-mono">
            {users.filter((u) => u.role === "ADMIN").length}
          </div>
          <p className="text-[10px] text-slate-500">Tier 1 Governance Authority</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-[#0D1322]/80 backdrop-blur-md border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user by name, email, or registration number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Roles</option>
              <option value="STUDENT">Students</option>
              <option value="EXAMINER">Examiners</option>
              <option value="ADMIN">Administrators</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      {isLoading ? (
        <div className="flex justify-center p-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card className="text-center py-16 space-y-3 bg-[#0D1322]/50 border-slate-800">
          <Users className="h-10 w-10 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-white">No users match your search criteria</p>
        </Card>
      ) : (
        <div className="bg-[#0D1322]/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#080C14]/80 border-b border-slate-800 text-[11px] uppercase text-slate-400 font-bold tracking-wider">
                  <th className="py-3 px-5">User</th>
                  <th className="py-3 px-5">Role</th>
                  <th className="py-3 px-5">Registration ID</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Created At</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-white">{u.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === "ADMIN"
                            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                            : u.role === "EXAMINER"
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-slate-300">
                      {u.registration_number || <span className="text-slate-500 text-[11px]">—</span>}
                    </td>
                    <td className="py-3.5 px-5">
                      {u.is_active ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-slate-400 font-mono text-[11px]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                            u.is_active
                              ? "border-slate-800 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                              : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                          }`}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                          title="Revoke Account"
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
        </div>
      )}

      {/* Create Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0D1322] rounded-2xl shadow-2xl max-w-md w-full border border-slate-800 text-slate-100 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Plus className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-white">Create Platform Account</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && <Alert type="error">{modalError}</Alert>}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  placeholder="Dr. Alan Turing"
                  className="w-full px-3 py-2 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={modalEmail}
                  onChange={(e) => setModalEmail(e.target.value)}
                  placeholder="faculty@institution.edu"
                  className="w-full px-3 py-2 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={modalPassword}
                  onChange={(e) => setModalPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Platform Role *</label>
                <select
                  value={modalRole}
                  onChange={(e) => setModalRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="EXAMINER">Examiner (Course Creator / Evaluator)</option>
                  <option value="STUDENT">Student (Examinee)</option>
                  <option value="ADMIN">Administrator (Full Access)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs py-2 border-slate-800 text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  className="text-xs py-2 shadow-md shadow-indigo-500/20"
                >
                  Create Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
