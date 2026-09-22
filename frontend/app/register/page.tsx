"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, getErrorMessage } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { Button, Card, Alert, Badge } from "@/components/UIComponents";
import {
  User as UserIcon,
  Mail,
  Lock,
  GraduationCap,
  CheckCircle2,
  Hash,
  ArrowRight,
  Phone,
  Calendar,
  Building2,
  BookOpen,
  MapPin,
  ShieldCheck,
  Award
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();

  // Basic Account State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Personal Info
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");

  // Academic Info
  const [college, setCollege] = useState("");
  const [university, setUniversity] = useState("");
  const [course, setCourse] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [yearSemester, setYearSemester] = useState("");
  const [enrollmentNumber, setEnrollmentNumber] = useState("");
  const [graduationYear, setGraduationYear] = useState<number | "">("");

  // Address Info
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("India");
  const [pinCode, setPinCode] = useState("");

  // UI Flow State
  const [activeTab, setActiveTab] = useState<"personal" | "academic" | "address">("personal");
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ name: string; registration_number: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter identical passwords.");
      setActiveTab("personal");
      return;
    }

    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all mandatory account credentials.");
      setActiveTab("personal");
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.post("/auth/register", {
        name: name.trim(),
        email: email.trim(),
        password,
        role: "STUDENT",
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
        mobile_number: mobileNumber.trim() || null,
        college: college.trim() || null,
        university: university.trim() || null,
        course: course.trim() || null,
        specialization: specialization.trim() || null,
        year_semester: yearSemester.trim() || null,
        enrollment_number: enrollmentNumber.trim() || null,
        graduation_year: graduationYear ? Number(graduationYear) : null,
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        country: country.trim() || "India",
        pin_code: pinCode.trim() || null,
      });

      setSuccessData({
        name: res.data.name,
        registration_number: res.data.registration_number,
      });
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-12 animate-fade-in-up">
      <Card className="p-6 sm:p-10 space-y-6 border-[#EAE6DF] bg-white shadow-card rounded-3xl">
        {/* Header */}
        <div className="text-center space-y-2 pb-4 border-b border-[#EAE6DF]">
          <div className="w-14 h-14 bg-[#FEF3EC] text-[#E06A26] rounded-2xl flex items-center justify-center mx-auto border border-[#FAD9C5]">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#1C1C1F] tracking-tight">{t("student_registration_title")}</h1>
          <div className="flex justify-center">
            <Badge variant="emerald">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Candidate Portal Exclusively
            </Badge>
          </div>
          <p className="text-xs text-[#6B6B76] max-w-md mx-auto">
            {t("student_registration_subtitle")}
          </p>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {successData ? (
          <div className="space-y-6 text-center py-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="mx-auto w-16 h-16 bg-[#EFF7F2] text-[#2B7853] rounded-full flex items-center justify-center border border-[#C4DFD3]">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-[#1C1C1F]">Registration Confirmed!</h2>
              <p className="text-xs text-[#6B6B76]">
                Welcome to IntelliExamAI, <strong>{successData.name}</strong>. Your profile has been recorded in the institutional database.
              </p>
            </div>

            <div className="bg-[#FAF8F5] border border-[#EAE6DF] p-5 rounded-2xl text-left space-y-2">
              <span className="text-[11px] font-bold text-[#E06A26] uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-[#E06A26]" /> Permanent Registration Number
              </span>
              <div className="text-2xl font-mono font-black text-[#E06A26] tracking-wide">
                {successData.registration_number}
              </div>
              <p className="text-xs text-[#6B6B76]">
                Please save this registration number securely. It uniquely authenticates your examination seat, attempts, and official scorecards.
              </p>
            </div>

            <Button
              variant="primary"
              className="w-full py-3 text-xs font-bold gap-2"
              onClick={() => router.push("/login")}
            >
              Sign In to Student Portal
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step Navigation Tabs */}
            <div className="flex border-b border-[#EAE6DF] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("personal")}
                className={
                  "flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 " +
                  (activeTab === "personal"
                    ? "border-[#E06A26] text-[#E06A26] font-bold"
                    : "border-transparent text-[#6B6B76] hover:text-[#1C1C1F]")
                }
              >
                <UserIcon className="h-3.5 w-3.5" />
                1. Personal & Account
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("academic")}
                className={
                  "flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 " +
                  (activeTab === "academic"
                    ? "border-[#E06A26] text-[#E06A26] font-bold"
                    : "border-transparent text-[#6B6B76] hover:text-[#1C1C1F]")
                }
              >
                <Building2 className="h-3.5 w-3.5" />
                2. Academic Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("address")}
                className={
                  "flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 " +
                  (activeTab === "address"
                    ? "border-[#E06A26] text-[#E06A26] font-bold"
                    : "border-transparent text-[#6B6B76] hover:text-[#1C1C1F]")
                }
              >
                <MapPin className="h-3.5 w-3.5" />
                3. Address & Contact
              </button>
            </div>

            {/* TAB 1: Personal & Account */}
            {activeTab === "personal" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">
                      Full Legal Name <span className="text-[#C85332]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#E06A26]">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Alexander Walker"
                        className="w-full pl-10 pr-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-white focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">
                      Email Address <span className="text-[#C85332]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#E06A26]">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="student@university.edu"
                        className="w-full pl-10 pr-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-white focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">
                      Password <span className="text-[#C85332]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#E06A26]">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full pl-10 pr-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-white focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">
                      Confirm Password <span className="text-[#C85332]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#E06A26]">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full pl-10 pr-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-white focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">Date of Birth</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#E06A26]">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-white focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-white focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none transition-all"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other / Prefer not to say</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">Mobile / WhatsApp Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#E06A26]">
                        <Phone className="h-4 w-4" />
                      </div>
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-10 pr-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-white focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("academic")}
                    className="text-xs py-2 px-4 gap-1.5 text-[#E06A26] border-[#EAE6DF] hover:bg-[#FEF3EC]"
                  >
                    Next: Academic Details
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 2: Academic Details */}
            {activeTab === "academic" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">College / Institution</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#E06A26]">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        value={college}
                        onChange={(e) => setCollege(e.target.value)}
                        placeholder="e.g. National Institute of Technology"
                        className="w-full pl-10 pr-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-white focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">Affiliated University</label>
                    <input
                      type="text"
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      placeholder="e.g. Central University of Technology"
                      className="w-full px-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-white focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">Course / Degree</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#E06A26]">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        placeholder="e.g. B.Tech / BCA / B.Sc"
                        className="w-full pl-10 pr-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-white focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">Branch / Specialization</label>
                    <input
                      type="text"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      placeholder="e.g. Computer Science & Engineering"
                      className="w-full px-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-white focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">Year / Current Semester</label>
                    <input
                      type="text"
                      value={yearSemester}
                      onChange={(e) => setYearSemester(e.target.value)}
                      placeholder="e.g. 3rd Year / 6th Semester"
                      className="w-full px-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-white focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">Enrollment / Roll Number</label>
                    <input
                      type="text"
                      value={enrollmentNumber}
                      onChange={(e) => setEnrollmentNumber(e.target.value)}
                      placeholder="e.g. ENR-2023-4589"
                      className="w-full px-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-white focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">Graduation Year</label>
                    <input
                      type="number"
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(e.target.value ? Number(e.target.value) : "")}
                      placeholder="e.g. 2026"
                      min={2000}
                      max={2040}
                      className="w-full px-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-white focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("personal")}
                  >
                    Back: Personal
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("address")}
                    className="gap-1.5 text-[#E06A26] border-[#EAE6DF] hover:bg-[#FEF3EC]"
                  >
                    Next: Address & Contact
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 3: Address & Contact */}
            {activeTab === "address" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">Residential Street Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#E06A26]">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="House / Flat No., Street, Landmark"
                        className="w-full pl-10 pr-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-white focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">City / District</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Mumbai"
                        className="w-full px-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-white focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">State / Province</label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="e.g. Maharashtra"
                        className="w-full px-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-white focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">Country</label>
                      <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="e.g. India"
                        className="w-full px-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-white focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">PIN / Postal Code</label>
                      <input
                        type="text"
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value)}
                        placeholder="e.g. 400001"
                        className="w-full px-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-white focus:ring-2 focus:ring-[#E06A26]/20 focus:border-[#E06A26] focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("academic")}
                  >
                    Back: Academic
                  </Button>
                </div>
              </div>
            )}

            {/* Submission Button */}
            <div className="pt-3 border-t border-[#EAE6DF]">
              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 font-bold text-xs shadow-saffron/20"
                isLoading={isLoading}
              >
                {t("create_account")}
              </Button>
            </div>
          </form>
        )}

        <div className="text-center text-xs text-[#6B6B76] pt-2 border-t border-[#EAE6DF]">
          {t("no_account") === "New student candidate?" ? "Already registered?" : "आधीच नोंदणी केली आहे?"}{" "}
          <Link href="/login" className="text-[#E06A26] font-bold hover:underline">
            {t("login")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
