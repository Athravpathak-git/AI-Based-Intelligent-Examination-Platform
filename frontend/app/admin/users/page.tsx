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

export default function AdminUsersPage() {
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
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAE6DF]">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F9EFF2] border border-[#EEDCE1] flex items-center justify-center text-[#E06A26] shrink-0 mt-0.5 shadow-sm">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/admin"
                className="text-xs font-semibold text-[#6B6B76] hover:text-[#E06A26] flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-[#D97706]" /> Admin Console
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1C1C1F] tracking-tight">
              User Identity & Access Governance
            </h1>
            <p className="text-xs sm:text-sm text-[#6B6B76] mt-0.5">
              Manage system users, view student registration numbers, toggle account active status, and provision examiner accounts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Provision Account
          </Button>
          <Link href="/admin">
            <Button variant="outline" size="sm" className="gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
          </Link>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Filter & Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-80">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by name, email, or Reg #..."
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-[#6B6B76]">Role Filter:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3.5 py-2 text-xs border border-[#EAE6DF] rounded-xl focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none bg-white text-[#1C1C1F] font-medium"
            >
              <option value="">All Roles ({users.length})</option>
              <option value="STUDENT">STUDENT</option>
              <option value="EXAMINER">EXAMINER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      {isLoading ? (
        <div className="flex justify-center p-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E06A26]"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-[#EAE6DF] p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#F9EFF2] flex items-center justify-center text-[#E06A26] mx-auto mb-4">
            <Users className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-[#1C1C1F] mb-1">No Users Found</h3>
          <p className="text-xs text-[#6B6B76]">No accounts match your current filter criteria.</p>
        </div>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3.5 bg-[#FAF8F5] border-b border-[#EAE6DF] flex items-center justify-between text-xs text-[#6B6B76]">
            <span>Showing <strong>{filteredUsers.length}</strong> total registered accounts</span>
            <span>Role: <strong className="text-[#1C1C1F]">{roleFilter || "All Roles"}</strong></span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF8F5]/60 border-b border-[#EAE6DF] uppercase text-[#6B6B76] font-semibold tracking-wider text-[11px]">
                  <th className="py-3.5 px-5">User</th>
                  <th className="py-3.5 px-5">Role</th>
                  <th className="py-3.5 px-5">Registration #</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5">Created</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE6DF]">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-bold text-[#1C1C1F] text-sm">{u.name}</div>
                      <div className="text-[11px] text-[#6B6B76] font-mono">{u.email}</div>
                    </td>
                    <td className="py-4 px-5">
                      <Badge
                        variant={
                          u.role === "ADMIN" ? "burgundy" : u.role === "EXAMINER" ? "champagne" : "emerald"
                        }
                      >
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-4 px-5">
                      {u.registration_number ? (
                        <span className="inline-block font-mono font-bold text-[10px] text-[#E06A26] bg-[#F9EFF2] px-2.5 py-1 rounded-md border border-[#EEDCE1]">
                          {u.registration_number}
                        </span>
                      ) : (
                        <span className="text-[#6B6B76] italic text-[11px]">N/A</span>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      {u.is_active ? (
                        <Badge variant="emerald">
                          <CheckCircle2 className="h-3 w-3 mr-1 inline" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="rose">
                          <XCircle className="h-3 w-3 mr-1 inline" /> Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="py-4 px-5 text-xs text-[#6B6B76]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(u)}
                          className={`text-xs py-1 px-2.5 ${
                            u.is_active
                              ? "text-[#C85332] hover:bg-[#FEF3EC] border-[#F8DDD5]"
                              : "text-[#2B7853] hover:bg-[#EFF7F2] border-[#C4DFD3]"
                          }`}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(u)}
                          className="text-xs py-1 px-2 text-[#6B6B76] hover:text-[#C85332] hover:bg-[#FEF3EC] border-[#EAE6DF]"
                          title="Safe Deactivation / Revoke"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Provision User Modal */}
      {isModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          title="Provision Privileged Account"
          description="Create an Examiner or Admin user account"
          maxWidth="max-w-md"
        >
          {modalError && <Alert type="error">{modalError}</Alert>}

          <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-[#1C1C1F]">Full Name</label>
              <input
                type="text"
                required
                value={modalName}
                onChange={(e) => setModalName(e.target.value)}
                placeholder="e.g. Dr. Alex Morgan"
                className="w-full px-3.5 py-2 text-xs border border-[#EAE6DF] rounded-xl focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none text-[#1C1C1F]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[#1C1C1F]">Email Address</label>
              <input
                type="email"
                required
                value={modalEmail}
                onChange={(e) => setModalEmail(e.target.value)}
                placeholder="alex.morgan@university.edu"
                className="w-full px-3.5 py-2 text-xs border border-[#EAE6DF] rounded-xl focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none text-[#1C1C1F]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[#1C1C1F]">Initial Password</label>
              <input
                type="password"
                required
                value={modalPassword}
                onChange={(e) => setModalPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2 text-xs border border-[#EAE6DF] rounded-xl focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none text-[#1C1C1F]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[#1C1C1F]">Role Privilege</label>
              <select
                value={modalRole}
                onChange={(e) => setModalRole(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-[#EAE6DF] rounded-xl focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none bg-white font-medium text-[#1C1C1F]"
              >
                <option value="EXAMINER">EXAMINER (Faculty / Question Author)</option>
                <option value="ADMIN">ADMIN (System Administrator)</option>
                <option value="STUDENT">STUDENT (Generates Student ID)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EAE6DF]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
              >
                Create Account
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
