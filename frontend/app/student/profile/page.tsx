"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { api, getErrorMessage } from "@/lib/api";
import { Card, Badge, Button, Alert } from "@/components/UIComponents";
import {
  User,
  Mail,
  Shield,
  Calendar,
  Hash,
  CheckCircle2,
  Lock,
  GraduationCap,
  Building2,
  BookOpen,
  MapPin,
  Phone,
  Award,
  Globe,
  Edit3,
  X,
  Save,
} from "lucide-react";
import ToastContainer, { ToastMessage } from "@/components/Toast";

interface ProfileFormData {
  name: string;
  mobile_number: string;
  date_of_birth: string;
  gender: string;
  college: string;
  university: string;
  course: string;
  specialization: string;
  year_semester: string;
  enrollment_number: string;
  graduation_year: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pin_code: string;
}

export default function StudentProfilePage() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileFormData>({
    name: user?.name || "",
    mobile_number: "",
    date_of_birth: "",
    gender: "",
    college: "",
    university: "",
    course: "",
    specialization: "",
    year_semester: "",
    enrollment_number: "",
    graduation_year: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    pin_code: "",
  });

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const fetchFullProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const res = await api.get("/auth/me");
      const u = res.data;
      const sp = u.student_profile || {};
      setProfileData({
        name: u.name || "",
        mobile_number: sp.mobile_number || "",
        date_of_birth: sp.date_of_birth || "",
        gender: sp.gender || "",
        college: sp.college || "",
        university: sp.university || "",
        course: sp.course || "",
        specialization: sp.specialization || "",
        year_semester: sp.year_semester || "",
        enrollment_number: sp.enrollment_number || "",
        graduation_year: sp.graduation_year ? String(sp.graduation_year) : "",
        address: sp.address || "",
        city: sp.city || "",
        state: sp.state || "",
        country: sp.country || "India",
        pin_code: sp.pin_code || "",
      });
    } catch (err) {
      console.error("Failed to load full student profile:", err);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchFullProfile();
  }, []);

  const handleChange = (field: keyof ProfileFormData, val: string) => {
    setProfileData((prev) => ({ ...prev, [field]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.name.trim()) {
      addToast("error", "Full name is required.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        name: profileData.name.trim(),
        mobile_number: profileData.mobile_number.trim() || null,
        date_of_birth: profileData.date_of_birth.trim() || null,
        gender: profileData.gender.trim() || null,
        college: profileData.college.trim() || null,
        university: profileData.university.trim() || null,
        course: profileData.course.trim() || null,
        specialization: profileData.specialization.trim() || null,
        year_semester: profileData.year_semester.trim() || null,
        enrollment_number: profileData.enrollment_number.trim() || null,
        graduation_year: profileData.graduation_year ? parseInt(profileData.graduation_year, 10) : null,
        address: profileData.address.trim() || null,
        city: profileData.city.trim() || null,
        state: profileData.state.trim() || null,
        country: profileData.country.trim() || "India",
        pin_code: profileData.pin_code.trim() || null,
      };

      const res = await api.put("/auth/profile", payload);
      const updatedUser = res.data;
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setIsEditing(false);
      addToast("success", "Student profile updated successfully!");
      fetchFullProfile();
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      addToast("error", msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6">
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1C1F]">Student Profile & Academic Records</h1>
          <p className="text-sm text-[#6B6B76]">
            Institutional credentials, enrollment records, and account security
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button
              variant="primary"
              onClick={() => setIsEditing(true)}
              className="text-xs py-2 px-3.5 gap-1.5 shadow-sm"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit Profile Records
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                fetchFullProfile();
              }}
              className="text-xs py-2 px-3.5 gap-1.5 text-[#6B6B76]"
            >
              <X className="h-3.5 w-3.5" /> Cancel Edits
            </Button>
          )}
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: ID Badge Card & Governance */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="flex flex-col items-center text-center p-6 space-y-4 bg-white border-[#EAE6DF] shadow-sm">
            <div className="h-24 w-24 rounded-2xl bg-[#E06A26] text-white flex items-center justify-center text-3xl font-extrabold shadow-sm border border-[#C95716]">
              {profileData.name?.charAt(0).toUpperCase() || "S"}
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#1C1C1F]">{profileData.name || user?.name}</h2>
              <p className="text-xs text-[#6B6B76] font-mono">{user?.email}</p>
            </div>

            <div className="w-full pt-4 border-t border-[#EAE6DF] space-y-3 text-left">
              <div className="bg-[#FEF3EC] p-3.5 rounded-xl border border-[#EAE6DF] space-y-1">
                <div className="text-[10px] uppercase font-bold tracking-wider text-[#E06A26] flex items-center gap-1">
                  <Hash className="h-3 w-3" /> Official Registration Number
                </div>
                <div className="text-sm font-mono font-bold text-[#1C1C1F]">
                  {user?.registration_number || "STU-PENDING"}
                </div>
                <span className="text-[10px] text-[#6B6B76] block">
                  Immutable Institutional ID
                </span>
              </div>

              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-[#6B6B76]">Platform Role</span>
                <Badge variant="emerald">{user?.role || "STUDENT"}</Badge>
              </div>

              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-[#6B6B76]">Account Status</span>
                <span className="inline-flex items-center gap-1 text-[#2B7853] font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Active & Verified
                </span>
              </div>

              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-[#6B6B76]">Registered On</span>
                <span className="text-[#1C1C1F] font-medium">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Active"}
                </span>
              </div>
            </div>
          </Card>

          {/* Quick Academic Summary Box */}
          <Card className="p-5 space-y-3 bg-[#FAF8F5]/70 border-[#EAE6DF]">
            <h3 className="text-xs font-bold text-[#1C1C1F] uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-[#E06A26]" />
              Academic Status
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-[#EAE6DF] pb-1.5">
                <span className="text-[#6B6B76]">Course:</span>
                <span className="font-semibold text-[#1C1C1F]">{profileData.course || "Not Configured"}</span>
              </div>
              <div className="flex justify-between border-b border-[#EAE6DF] pb-1.5">
                <span className="text-[#6B6B76]">Semester/Year:</span>
                <span className="font-semibold text-[#1C1C1F]">{profileData.year_semester || "Not Configured"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B6B76]">Graduation Year:</span>
                <span className="font-semibold text-[#1C1C1F]">{profileData.graduation_year || "Pending"}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Col: Academic, Personal & Security Sections */}
        <div className="space-y-6 lg:col-span-2">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Section 1: Academic & Institutional Information */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#EAE6DF] pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#FEF3EC] text-[#E06A26]">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1C1C1F] text-sm">Academic & Institutional Records</h3>
                    <p className="text-xs text-[#6B6B76]">College, University, Degree, and Semester details</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1F] mb-1">College / Institute</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={profileData.college}
                    onChange={(e) => handleChange("college", e.target.value)}
                    placeholder="e.g. National Institute of Technology"
                    className={`w-full px-3 py-2 text-xs border rounded-lg transition-colors ${
                      isEditing
                        ? "border-[#EAE6DF] bg-white focus:ring-2 focus:ring-[#E06A26] focus:outline-none"
                        : "border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] cursor-default"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1F] mb-1">University / Board</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={profileData.university}
                    onChange={(e) => handleChange("university", e.target.value)}
                    placeholder="e.g. State Technological University"
                    className={`w-full px-3 py-2 text-xs border rounded-lg transition-colors ${
                      isEditing
                        ? "border-[#EAE6DF] bg-white focus:ring-2 focus:ring-[#E06A26] focus:outline-none"
                        : "border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] cursor-default"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1F] mb-1">Degree / Course</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={profileData.course}
                    onChange={(e) => handleChange("course", e.target.value)}
                    placeholder="e.g. Bachelor of Technology (B.Tech)"
                    className={`w-full px-3 py-2 text-xs border rounded-lg transition-colors ${
                      isEditing
                        ? "border-[#EAE6DF] bg-white focus:ring-2 focus:ring-[#E06A26] focus:outline-none"
                        : "border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] cursor-default"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1F] mb-1">Specialization / Branch</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={profileData.specialization}
                    onChange={(e) => handleChange("specialization", e.target.value)}
                    placeholder="e.g. Computer Science and Engineering"
                    className={`w-full px-3 py-2 text-xs border rounded-lg transition-colors ${
                      isEditing
                        ? "border-[#EAE6DF] bg-white focus:ring-2 focus:ring-[#E06A26] focus:outline-none"
                        : "border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] cursor-default"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1F] mb-1">Year / Semester</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={profileData.year_semester}
                    onChange={(e) => handleChange("year_semester", e.target.value)}
                    placeholder="e.g. Year 4, Semester 8"
                    className={`w-full px-3 py-2 text-xs border rounded-lg transition-colors ${
                      isEditing
                        ? "border-[#EAE6DF] bg-white focus:ring-2 focus:ring-[#E06A26] focus:outline-none"
                        : "border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] cursor-default"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1F] mb-1">Enrollment / Roll Number</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={profileData.enrollment_number}
                    onChange={(e) => handleChange("enrollment_number", e.target.value)}
                    placeholder="e.g. 2022-CSE-0482"
                    className={`w-full px-3 py-2 text-xs border rounded-lg transition-colors ${
                      isEditing
                        ? "border-[#EAE6DF] bg-white focus:ring-2 focus:ring-[#E06A26] focus:outline-none"
                        : "border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] cursor-default"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1F] mb-1">Graduation Year</label>
                  <input
                    type="number"
                    disabled={!isEditing}
                    value={profileData.graduation_year}
                    onChange={(e) => handleChange("graduation_year", e.target.value)}
                    placeholder="e.g. 2026"
                    className={`w-full px-3 py-2 text-xs border rounded-lg transition-colors ${
                      isEditing
                        ? "border-[#EAE6DF] bg-white focus:ring-2 focus:ring-[#E06A26] focus:outline-none"
                        : "border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] cursor-default"
                    }`}
                  />
                </div>
              </div>
            </Card>

            {/* Section 2: Personal & Contact Information */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#EAE6DF] pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-[#2B7853]">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1C1C1F] text-sm">Personal & Contact Details</h3>
                    <p className="text-xs text-[#6B6B76]">Contact information, location, and communication details</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1F] mb-1">Full Name</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    required
                    value={profileData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className={`w-full px-3 py-2 text-xs border rounded-lg transition-colors ${
                      isEditing
                        ? "border-[#EAE6DF] bg-white focus:ring-2 focus:ring-[#E06A26] focus:outline-none"
                        : "border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] cursor-default"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1F] mb-1">Mobile / Phone Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#6B6B76]">
                      <Phone className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type="tel"
                      disabled={!isEditing}
                      value={profileData.mobile_number}
                      onChange={(e) => handleChange("mobile_number", e.target.value)}
                      placeholder="+91 98765 43210"
                      className={`w-full pl-8 pr-3 py-2 text-xs border rounded-lg transition-colors ${
                        isEditing
                          ? "border-[#EAE6DF] bg-white focus:ring-2 focus:ring-[#E06A26] focus:outline-none"
                          : "border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] cursor-default"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1F] mb-1">Date of Birth</label>
                  <input
                    type="date"
                    disabled={!isEditing}
                    value={profileData.date_of_birth}
                    onChange={(e) => handleChange("date_of_birth", e.target.value)}
                    className={`w-full px-3 py-2 text-xs border rounded-lg transition-colors ${
                      isEditing
                        ? "border-[#EAE6DF] bg-white focus:ring-2 focus:ring-[#E06A26] focus:outline-none"
                        : "border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] cursor-default"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1F] mb-1">Gender</label>
                  <select
                    disabled={!isEditing}
                    value={profileData.gender}
                    onChange={(e) => handleChange("gender", e.target.value)}
                    className={`w-full px-3 py-2 text-xs border rounded-lg transition-colors bg-white ${
                      isEditing
                        ? "border-[#EAE6DF] focus:ring-2 focus:ring-[#E06A26] focus:outline-none"
                        : "border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] cursor-default"
                    }`}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#1C1C1F] mb-1">Street Address</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={profileData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="Residential address / hostel address"
                    className={`w-full px-3 py-2 text-xs border rounded-lg transition-colors ${
                      isEditing
                        ? "border-[#EAE6DF] bg-white focus:ring-2 focus:ring-[#E06A26] focus:outline-none"
                        : "border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] cursor-default"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1F] mb-1">City</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={profileData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    placeholder="e.g. Bengaluru"
                    className={`w-full px-3 py-2 text-xs border rounded-lg transition-colors ${
                      isEditing
                        ? "border-[#EAE6DF] bg-white focus:ring-2 focus:ring-[#E06A26] focus:outline-none"
                        : "border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] cursor-default"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1F] mb-1">State / Province</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={profileData.state}
                    onChange={(e) => handleChange("state", e.target.value)}
                    placeholder="e.g. Karnataka"
                    className={`w-full px-3 py-2 text-xs border rounded-lg transition-colors ${
                      isEditing
                        ? "border-[#EAE6DF] bg-white focus:ring-2 focus:ring-[#E06A26] focus:outline-none"
                        : "border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] cursor-default"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1F] mb-1">PIN / Postal Code</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={profileData.pin_code}
                    onChange={(e) => handleChange("pin_code", e.target.value)}
                    placeholder="e.g. 560001"
                    className={`w-full px-3 py-2 text-xs border rounded-lg transition-colors ${
                      isEditing
                        ? "border-[#EAE6DF] bg-white focus:ring-2 focus:ring-[#E06A26] focus:outline-none"
                        : "border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] cursor-default"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1F] mb-1">Country</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={profileData.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                    placeholder="e.g. India"
                    className={`w-full px-3 py-2 text-xs border rounded-lg transition-colors ${
                      isEditing
                        ? "border-[#EAE6DF] bg-white focus:ring-2 focus:ring-[#E06A26] focus:outline-none"
                        : "border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] cursor-default"
                    }`}
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end gap-3 pt-4 border-t border-[#EAE6DF]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      fetchFullProfile();
                    }}
                    className="text-xs py-2 px-4"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSaving}
                    className="text-xs py-2 px-5 gap-1.5 shadow-sm"
                  >
                    <Save className="h-3.5 w-3.5" /> Save Profile Changes
                  </Button>
                </div>
              )}
            </Card>
          </form>

          {/* Section 3: Security & Password Management */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#EAE6DF] pb-3">
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-[#1C1C1F] text-sm">Security & Password Management</h4>
                <p className="text-xs text-[#6B6B76]">Update your account authentication credentials</p>
              </div>
            </div>

            <PasswordChangeForm addToast={addToast} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function PasswordChangeForm({
  addToast,
}: {
  addToast: (type: "success" | "error" | "info", msg: string) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (newPassword.length < 6) {
      setFormError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("New passwords do not match.");
      return;
    }

    setIsChanging(true);
    try {
      await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      addToast("success", "Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg = getErrorMessage(err);
      setFormError(msg);
      addToast("error", msg);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <form onSubmit={handleChangePassword} className="space-y-3.5 bg-[#FAF8F5]/75 p-4 rounded-xl border border-[#EAE6DF]">
      {formError && <Alert type="error">{formError}</Alert>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-[#1C1C1F] uppercase tracking-wider mb-1">
            Current Password
          </label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 text-xs border rounded-lg border-[#EAE6DF] focus:ring-2 focus:ring-[#E06A26] focus:outline-none bg-white"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#1C1C1F] uppercase tracking-wider mb-1">
            New Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min. 6 chars"
            className="w-full px-3 py-2 text-xs border rounded-lg border-[#EAE6DF] focus:ring-2 focus:ring-[#E06A26] focus:outline-none bg-white"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#1C1C1F] uppercase tracking-wider mb-1">
            Confirm Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            className="w-full px-3 py-2 text-xs border rounded-lg border-[#EAE6DF] focus:ring-2 focus:ring-[#E06A26] focus:outline-none bg-white"
          />
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <Button
          type="submit"
          variant="primary"
          isLoading={isChanging}
          className="text-xs py-2 px-4 shadow-sm"
        >
          Update Password
        </Button>
      </div>
    </form>
  );
}
