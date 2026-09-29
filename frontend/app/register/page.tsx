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
    <div className="max-w-2xl mx-auto py-6 sm:py-10 animate-fade-in-up">
      <Card className="p-6 sm:p-10 space-y-6 border-slate-800 bg-[#0D1322] shadow-2xl rounded-3xl">
        {/* Header */}
        <div className="text-center space-y-2 pb-4 border-b border-slate-800">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/25 border border-indigo-400/30">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{t("student_registration_title")}</h1>
          <div className="flex justify-center">
            <Badge variant="emerald">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Candidate Portal Exclusively
            </Badge>
          </div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {t("student_registration_subtitle")}
          </p>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {successData ? (
          <div className="space-y-6 text-center py-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="mx-auto w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white">Registration Confirmed!</h2>
              <p className="text-xs text-slate-300">
                Welcome to IntelliExamAI, <strong>{successData.name}</strong>. Your profile has been recorded in the institutional database.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-left space-y-2">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-indigo-400" /> Permanent Registration Number
              </span>
              <div className="text-2xl font-mono font-black text-indigo-300 tracking-wide">
                {successData.registration_number}
              </div>
              <p className="text-xs text-slate-400">
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
            <div className="flex border-b border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("personal")}
                className={
                  "flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 " +
                  (activeTab === "personal"
                    ? "border-indigo-500 text-indigo-400 font-bold"
                    : "border-transparent text-slate-400 hover:text-white")
                }
              >
                <UserIcon className="h-3.5 w-3.5" />
                {t("tab_personal")}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("academic")}
                className={
                  "flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 " +
                  (activeTab === "academic"
                    ? "border-indigo-500 text-indigo-400 font-bold"
                    : "border-transparent text-slate-400 hover:text-white")
                }
              >
                <Building2 className="h-3.5 w-3.5" />
                {t("tab_academic")}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("address")}
                className={
                  "flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 " +
                  (activeTab === "address"
                    ? "border-indigo-500 text-indigo-400 font-bold"
                    : "border-transparent text-slate-400 hover:text-white")
                }
              >
                <MapPin className="h-3.5 w-3.5" />
                {t("tab_address")}
              </button>
            </div>

            {/* TAB 1: Personal & Account */}
            {activeTab === "personal" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {t("full_name")} <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Alexander Walker"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {t("email_address")} <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="student@university.edu"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {t("password")} <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {t("confirm_password")} <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t("date_of_birth")}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2 text-xs border rounded-xl border-slate-800 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t("gender")}</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-950/60 text-slate-100 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                    >
                      <option value="" className="bg-[#0D1322]">Select Gender</option>
                      <option value="Male" className="bg-[#0D1322]">Male</option>
                      <option value="Female" className="bg-[#0D1322]">Female</option>
                      <option value="Other" className="bg-[#0D1322]">Other / Prefer not to say</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t("mobile_number")}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="h-4 w-4" />
                      </div>
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("academic")}
                    className="text-xs py-2 px-4 gap-1.5 border-slate-700 hover:text-indigo-400"
                  >
                    {t("next_academic")}
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
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t("college_institution")}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        value={college}
                        onChange={(e) => setCollege(e.target.value)}
                        placeholder="e.g. National Institute of Technology"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t("university")}</label>
                    <input
                      type="text"
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      placeholder="e.g. Central University of Technology"
                      className="w-full px-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t("course_degree")}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        placeholder="e.g. B.Tech / BCA / B.Sc"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t("specialization_dept")}</label>
                    <input
                      type="text"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      placeholder="e.g. Computer Science & Engineering"
                      className="w-full px-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t("year_semester")}</label>
                    <input
                      type="text"
                      value={yearSemester}
                      onChange={(e) => setYearSemester(e.target.value)}
                      placeholder="e.g. 3rd Year / 6th Semester"
                      className="w-full px-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t("enrollment_number")}</label>
                    <input
                      type="text"
                      value={enrollmentNumber}
                      onChange={(e) => setEnrollmentNumber(e.target.value)}
                      placeholder="e.g. ENR-2023-4589"
                      className="w-full px-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t("graduation_year")}</label>
                    <input
                      type="number"
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(e.target.value ? Number(e.target.value) : "")}
                      placeholder="e.g. 2026"
                      min={2000}
                      max={2040}
                      className="w-full px-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("personal")}
                    className="border-slate-700 text-slate-400 hover:text-white"
                  >
                    {t("previous_step")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("address")}
                    className="gap-1.5 border-slate-700 hover:text-indigo-400"
                  >
                    {t("next_address")}
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
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t("address_line")}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="House / Flat No., Street, Landmark"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t("city")}</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Mumbai"
                        className="w-full px-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t("state")}</label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="e.g. Maharashtra"
                        className="w-full px-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t("country")}</label>
                      <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="e.g. India"
                        className="w-full px-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t("pin_code")}</label>
                      <input
                        type="text"
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value)}
                        placeholder="e.g. 400001"
                        className="w-full px-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
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
                    className="border-slate-700 text-slate-400 hover:text-white"
                  >
                    {t("previous_step")}
                  </Button>
                </div>
              </div>
            )}

            {/* Submission Button */}
            <div className="pt-3 border-t border-slate-800">
              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 font-bold text-xs shadow-lg shadow-indigo-600/25"
                isLoading={isLoading}
              >
                {t("create_account")}
              </Button>
            </div>
          </form>
        )}

        <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
          {t("already_have_account")}{" "}
          <Link href="/login" className="text-indigo-400 font-bold hover:text-indigo-300 hover:underline">
            {t("login")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
