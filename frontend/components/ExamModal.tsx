"use client";

import React, { useState, useEffect } from "react";
import { Exam, QuestionSelectionRule, Subject } from "@/types";
import { api, getErrorMessage } from "@/lib/api";
import { Button, Alert, Badge } from "./UIComponents";
import { useLanguage } from "@/lib/i18n";
import { X, Plus, Trash2, Clock, Sparkles, Sliders, Layers, CheckCircle2, AlertTriangle, BookOpen, ShieldCheck, HelpCircle } from "lucide-react";

interface ExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData?: Exam | null;
}

export default function ExamModal({ isOpen, onClose, onSaved, initialData }: ExamModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [totalQuestions, setTotalQuestions] = useState(25);
  const [maximumMarks, setMaximumMarks] = useState(50);
  const [negativeMarkingEnabled, setNegativeMarkingEnabled] = useState(false);
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [randomizeOptions, setRandomizeOptions] = useState(true);
  const [perStudentUniquePaper, setPerStudentUniquePaper] = useState(true);
  const [maxTabSwitchWarnings, setMaxTabSwitchWarnings] = useState(3);
  const [webcamMonitoringEnabled, setWebcamMonitoringEnabled] = useState(true);
  const [gazeSensitivity, setGazeSensitivity] = useState(0.5);

  // Mode Selection: Single Subject vs Mixed Blueprint
  const [isMixedBlueprint, setIsMixedBlueprint] = useState(false);
  const [rules, setRules] = useState<QuestionSelectionRule[]>([
    { subject: "Mathematics", difficulty: "EASY", question_type: "MCQ", count: 10 },
    { subject: "Computer Science", difficulty: "MEDIUM", question_type: "MCQ", count: 15 },
  ]);

  // Master Subjects & Question Stats
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [subjectStats, setSubjectStats] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format Date for datetime-local input (YYYY-MM-DDTHH:mm)
  const formatForInput = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const mins = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${mins}`;
  };

  useEffect(() => {
    if (!isOpen) return;

    // Load available subjects & summary stats
    api.get<Subject[]>("/subjects")
      .then(res => setAvailableSubjects(res.data))
      .catch(() => {});

    api.get<{ by_subject: Record<string, number> }>("/questions/stats/summary")
      .then(res => setSubjectStats(res.data.by_subject || {}))
      .catch(() => {});

    setError(null);
    if (initialData) {
      setName(initialData.name);
      setSubject(initialData.subject);
      setDurationMinutes(initialData.duration_minutes);
      setStartTime(formatForInput(new Date(initialData.start_time)));
      setEndTime(formatForInput(new Date(initialData.end_time)));
      setTotalQuestions(initialData.total_questions);
      setMaximumMarks(initialData.maximum_marks);
      setNegativeMarkingEnabled(initialData.negative_marking_enabled ?? false);
      setRandomizeQuestions(initialData.randomize_questions ?? true);
      setRandomizeOptions(initialData.randomize_options ?? true);
      setPerStudentUniquePaper(initialData.per_student_unique_paper ?? true);
      setMaxTabSwitchWarnings(initialData.maximum_tab_switch_warnings ?? 3);
      setWebcamMonitoringEnabled(initialData.webcam_monitoring_enabled ?? true);
      setGazeSensitivity(initialData.gaze_sensitivity ?? 0.5);

      if (initialData.question_selection_rules && initialData.question_selection_rules.length > 0) {
        setIsMixedBlueprint(true);
        setRules(initialData.question_selection_rules);
      } else {
        setIsMixedBlueprint(false);
        setRules([
          { subject: initialData.subject || "Mathematics", difficulty: "EASY", question_type: "MCQ", count: 10 },
          { subject: "Computer Science", difficulty: "MEDIUM", question_type: "MCQ", count: 15 },
        ]);
      }
    } else {
      const now = new Date();
      const start = new Date(now.getTime() - 2 * 60 * 1000);
      const end = new Date(now.getTime() + 4 * 60 * 60 * 1000);

      setName("");
      setSubject("Mathematics");
      setDurationMinutes(60);
      setStartTime(formatForInput(start));
      setEndTime(formatForInput(end));
      setTotalQuestions(25);
      setMaximumMarks(50);
      setNegativeMarkingEnabled(true);
      setRandomizeQuestions(true);
      setRandomizeOptions(true);
      setPerStudentUniquePaper(true);
      setMaxTabSwitchWarnings(3);
      setWebcamMonitoringEnabled(true);
      setGazeSensitivity(0.5);
      setIsMixedBlueprint(false);
      setRules([
        { subject: "Mathematics", difficulty: "EASY", question_type: "MCQ", count: 10 },
        { subject: "Computer Science", difficulty: "MEDIUM", question_type: "MCQ", count: 15 },
      ]);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // Presets
  const applyLiveNowPreset = () => {
    const now = new Date();
    const start = new Date(now.getTime() - 2 * 60 * 1000);
    const end = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    setStartTime(formatForInput(start));
    setEndTime(formatForInput(end));
  };

  const applyTomorrowPreset = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const end = new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000);
    setStartTime(formatForInput(tomorrow));
    setEndTime(formatForInput(end));
  };

  // Rule management
  const handleAddRule = () => {
    const defaultSub = availableSubjects.length > 0 ? availableSubjects[0].name : "Mathematics";
    setRules([...rules, { subject: defaultSub, difficulty: "MEDIUM", question_type: "MCQ", count: 5 }]);
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, idx) => idx !== index));
  };

  const handleRuleChange = (index: number, field: keyof QuestionSelectionRule, value: any) => {
    const updated = [...rules];
    updated[index] = { ...updated[index], [field]: value };
    setRules(updated);
  };

  // Compute validation
  const configuredRulesCount = rules.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
  const remainingCount = totalQuestions - configuredRulesCount;

  // Check single subject capacity
  const singleSubjectAvailable = subjectStats[subject] || 0;
  const singleSubjectShortage = !isMixedBlueprint && Number(totalQuestions) > singleSubjectAvailable;

  // Check mixed rules capacity
  const ruleShortages = rules.map((r) => {
    const sub = r.subject || subject;
    const avail = subjectStats[sub] || 0;
    const req = Number(r.count) || 0;
    return {
      subject: sub,
      required: req,
      available: avail,
      isShort: req > avail,
    };
  });
  const hasMixedShortage = isMixedBlueprint && ruleShortages.some((s) => s.isShort);

  const canPublish = !singleSubjectShortage && (!isMixedBlueprint || (!hasMixedShortage && remainingCount === 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (new Date(endTime) <= new Date(startTime)) {
      setError("Exam window end time must be after the start time.");
      return;
    }

    if (!isMixedBlueprint && singleSubjectShortage) {
      setError(`Insufficient valid ${subject} questions in PostgreSQL. Required: ${totalQuestions}, Available: ${singleSubjectAvailable}.`);
      return;
    }

    if (isMixedBlueprint) {
      if (configuredRulesCount !== Number(totalQuestions)) {
        setError(`Blueprint total must equal exam question count (${totalQuestions}). Currently configured: ${configuredRulesCount}.`);
        return;
      }
      for (const rs of ruleShortages) {
        if (rs.isShort) {
          setError(`Insufficient valid ${rs.subject} questions. Required: ${rs.required}, Available in PostgreSQL: ${rs.available}.`);
          return;
        }
      }
    }

    setIsSubmitting(true);

    const payload = {
      name,
      subject: isMixedBlueprint ? (rules[0]?.subject || subject) : subject,
      duration_minutes: Number(durationMinutes),
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      total_questions: Number(totalQuestions),
      maximum_marks: Number(maximumMarks),
      negative_marking_enabled: negativeMarkingEnabled,
      randomize_questions: randomizeQuestions,
      randomize_options: randomizeOptions,
      per_student_unique_paper: perStudentUniquePaper,
      maximum_tab_switch_warnings: Number(maxTabSwitchWarnings),
      webcam_monitoring_enabled: webcamMonitoringEnabled,
      gaze_sensitivity: Number(gazeSensitivity),
      question_selection_rules: isMixedBlueprint ? rules : null,
    };

    try {
      if (initialData) {
        await api.put(`/exams/${initialData.id}`, payload);
      } else {
        await api.post("/exams", payload);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("exam_platform_notification_sync"));
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0D1322] rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-800 text-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 sticky top-0 bg-[#0D1322]/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-sm">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {initialData ? t("edit_exam_title") : t("create_exam_title")}
              </h2>
              <p className="text-xs text-slate-400">
                {t("exam_config_subtitle")}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/60 transition-colors border border-transparent hover:border-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1">
          {error && <Alert type="error">{error}</Alert>}

          {/* Timing Presets Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[#080C14]/60 p-3.5 rounded-xl border border-slate-800/80 text-xs gap-3">
            <span className="font-semibold text-slate-200 flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-400" /> {t("quick_testing_windows")}:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={applyLiveNowPreset}
                className="px-3 py-1.5 bg-[#0D1322] hover:bg-slate-800 rounded-lg border border-slate-700 text-indigo-300 font-semibold text-xs transition-all hover:border-indigo-500/40"
              >
                {t("immediate_live_window")}
              </button>
              <button
                type="button"
                onClick={applyTomorrowPreset}
                className="px-3 py-1.5 bg-[#0D1322] hover:bg-slate-800 rounded-lg border border-slate-700 text-cyan-300 font-semibold text-xs transition-all hover:border-cyan-500/40"
              >
                {t("tomorrow_10am")}
              </button>
            </div>
          </div>

          {/* Basic Exam Information */}
          <div className="bg-[#080C14]/40 p-5 rounded-2xl border border-slate-800/80 space-y-4">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-400" />
              {t("basic_parameters")}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-200">{t("exam_title")} *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. National Level Computer Science & Mathematics Examination 2026"
                  className="w-full px-3.5 py-2.5 text-xs bg-[#080C14] border rounded-xl border-slate-800 text-white placeholder-slate-500 focus:bg-[#0D1322] focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">{t("duration")} ({t("minutes")}) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#080C14] border rounded-xl border-slate-800 text-white focus:bg-[#0D1322] focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">{t("total_marks")} *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={maximumMarks}
                  onChange={(e) => setMaximumMarks(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#080C14] border rounded-xl border-slate-800 text-white focus:bg-[#0D1322] focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">{t("start_time")} ({t("server_authoritative")}) *</label>
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#080C14] border rounded-xl border-slate-800 text-white focus:bg-[#0D1322] focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">{t("end_time")} ({t("server_authoritative")}) *</label>
                <input
                  type="datetime-local"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#080C14] border rounded-xl border-slate-800 text-white focus:bg-[#0D1322] focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Question Count Selection */}
          <div className="p-5 bg-[#080C14]/40 rounded-2xl border border-slate-800/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-indigo-400 uppercase tracking-wide">
                  {t("total_questions")}
                </label>
                <p className="text-[11px] text-slate-400">
                  Select a standardized quota or enter a custom integer (never fixed to 100).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Math.max(1, Number(e.target.value)))}
                  className="w-24 px-3 py-2 text-center font-bold text-sm border-2 rounded-xl border-indigo-500 text-indigo-300 bg-[#080C14] shadow-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[10, 25, 50, 75, 100, 150, 200].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setTotalQuestions(count)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    totalQuestions === count
                      ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                      : "bg-[#080C14] text-slate-300 border border-slate-800 hover:bg-slate-800/60 hover:border-slate-700"
                  }`}
                >
                  {count} {t("questions")}
                </button>
              ))}
            </div>
          </div>

          {/* Blueprint Mode: Mode A (Single) vs Mode B (Mixed) */}
          <div className="space-y-4 p-5 rounded-2xl border border-slate-800/80 bg-[#080C14]/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-400" />
                  {t("blueprint_mode")}
                </span>
                <p className="text-[11px] text-slate-400">Choose between single subject allocation or multi-subject blueprint distribution.</p>
              </div>
              <div className="flex items-center gap-1 bg-[#080C14] p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMixedBlueprint(false)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    !isMixedBlueprint 
                      ? "bg-indigo-600 text-white shadow-sm" 
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t("single_subject")}
                </button>
                <button
                  type="button"
                  onClick={() => setIsMixedBlueprint(true)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    isMixedBlueprint 
                      ? "bg-indigo-600 text-white shadow-sm" 
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t("mixed_blueprint")}
                </button>
              </div>
            </div>

            {/* Mode A: Single Subject */}
            {!isMixedBlueprint && (
              <div className="p-4 bg-[#080C14]/70 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200">Select Subject *</label>
                  <span className="text-xs font-medium text-slate-400">
                    Available in Bank: <strong className="text-indigo-400 font-bold">{singleSubjectAvailable}</strong>
                  </span>
                </div>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border rounded-xl border-slate-800 text-white bg-[#0D1322] focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none"
                >
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.code}) — {subjectStats[s.name] || 0} questions available
                    </option>
                  ))}
                </select>

                {singleSubjectShortage && (
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      Insufficient valid {subject} questions in PostgreSQL. Required: {totalQuestions}, Available: {singleSubjectAvailable}.
                    </span>
                  </div>
                )}
                {!singleSubjectShortage && (
                  <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Exact {totalQuestions} questions will be randomly sampled from {subject} without cross-subject contamination.
                  </p>
                )}
              </div>
            )}

            {/* Mode B: Mixed Subject / Blueprint */}
            {isMixedBlueprint && (
              <div className="p-4 bg-[#080C14]/70 rounded-xl border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#0D1322] p-3.5 rounded-xl border border-slate-800 gap-3">
                  <div className="text-xs flex items-center flex-wrap gap-2">
                    <span className="font-semibold text-slate-400">Required:</span>
                    <strong className="text-white font-bold">{totalQuestions}</strong>
                    <span className="text-slate-700">|</span>
                    <span className="font-semibold text-slate-400">Configured:</span>
                    <strong className={configuredRulesCount === totalQuestions ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                      {configuredRulesCount}
                    </strong>
                    <span className="text-slate-700">|</span>
                    <span className="font-semibold text-slate-400">Remaining:</span>
                    <strong className={remainingCount === 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                      {remainingCount}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="px-3 py-1.5 bg-[#080C14] hover:bg-slate-800 text-indigo-400 font-semibold text-xs rounded-xl border border-slate-800 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Blueprint Rule
                  </button>
                </div>

                {remainingCount !== 0 && (
                  <div className="text-xs font-semibold text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Blueprint total rules count must equal exam question count (Remaining to allocate: {remainingCount}).
                  </div>
                )}

                {hasMixedShortage && (
                  <div className="text-xs font-semibold text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    One or more blueprint rules exceed the available questions in PostgreSQL database.
                  </div>
                )}

                <div className="space-y-2.5">
                  {rules.map((rule, idx) => {
                    const ruleSub = rule.subject || subject;
                    const avail = subjectStats[ruleSub] || 0;
                    const isShort = (Number(rule.count) || 0) > avail;

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex flex-wrap items-center gap-2.5 text-xs transition-colors ${
                          isShort ? "bg-rose-500/10 border-rose-500/30" : "bg-[#0D1322] border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        {/* Subject */}
                        <div className="flex-1 min-w-[140px]">
                          <select
                            value={rule.subject || ""}
                            onChange={(e) => handleRuleChange(idx, "subject", e.target.value)}
                            className="w-full px-2.5 py-1.5 border rounded-lg border-slate-800 text-slate-100 font-medium bg-[#080C14] focus:bg-[#0D1322] focus:ring-1 focus:ring-indigo-500"
                          >
                            {availableSubjects.map((s) => (
                              <option key={s.id} value={s.name}>
                                {s.name} ({subjectStats[s.name] || 0} Avail)
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Difficulty */}
                        <div className="w-28">
                          <select
                            value={rule.difficulty || "MEDIUM"}
                            onChange={(e) => handleRuleChange(idx, "difficulty", e.target.value)}
                            className="w-full px-2.5 py-1.5 border rounded-lg border-slate-800 text-slate-100 bg-[#080C14] focus:bg-[#0D1322] focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="EASY">Easy</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HARD">Hard</option>
                          </select>
                        </div>

                        {/* Question Type */}
                        <div className="w-32">
                          <select
                            value={rule.question_type || "MCQ"}
                            onChange={(e) => handleRuleChange(idx, "question_type", e.target.value)}
                            className="w-full px-2.5 py-1.5 border rounded-lg border-slate-800 text-slate-100 bg-[#080C14] focus:bg-[#0D1322] focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="MCQ">MCQ (Single)</option>
                            <option value="MULTI_SELECT">Multi Select</option>
                            <option value="SHORT_ANSWER">Short Answer</option>
                            <option value="LONG_ANSWER">Long Answer</option>
                          </select>
                        </div>

                        {/* Count */}
                        <div className="w-24">
                          <input
                            type="number"
                            min={1}
                            value={rule.count}
                            onChange={(e) => handleRuleChange(idx, "count", Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 border rounded-lg border-slate-800 text-white font-bold text-center bg-[#080C14] focus:bg-[#0D1322] focus:ring-1 focus:ring-indigo-500"
                            placeholder="Count"
                          />
                        </div>

                        {/* Available & Delete */}
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-lg text-[11px] font-semibold ${isShort ? "bg-rose-500/10 text-rose-400" : "bg-indigo-500/10 text-indigo-300"}`}>
                            Avail: {avail}
                          </span>
                          {rules.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRule(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Scoring & Proctoring Rules */}
          <div className="space-y-4 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
              {t("proctoring_constraints")}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 hover:bg-[#080C14]/60 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={negativeMarkingEnabled}
                  onChange={(e) => setNegativeMarkingEnabled(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 mt-0.5 bg-[#080C14] border-slate-700"
                />
                <div>
                  <span className="font-semibold text-slate-200">{t("negative_marking")}</span>
                  <span className="block text-[11px] text-slate-400">Deduct penalty marks for incorrect selections</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 hover:bg-[#080C14]/60 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={webcamMonitoringEnabled}
                  onChange={(e) => setWebcamMonitoringEnabled(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 mt-0.5 bg-[#080C14] border-slate-700"
                />
                <div>
                  <span className="font-semibold text-slate-200">{t("webcam_monitoring")}</span>
                  <span className="block text-[11px] text-slate-400">Real-time AI face presence and gaze verification</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 hover:bg-[#080C14]/60 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={randomizeQuestions}
                  onChange={(e) => setRandomizeQuestions(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 mt-0.5 bg-[#080C14] border-slate-700"
                />
                <div>
                  <span className="font-semibold text-slate-200">{t("randomize_questions")}</span>
                  <span className="block text-[11px] text-slate-400">Unique deterministic sequence per candidate</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 hover:bg-[#080C14]/60 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={randomizeOptions}
                  onChange={(e) => setRandomizeOptions(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 mt-0.5 bg-[#080C14] border-slate-700"
                />
                <div>
                  <span className="font-semibold text-slate-200">{t("randomize_options")}</span>
                  <span className="block text-[11px] text-slate-400">Dynamic option shuffling with answer integrity</span>
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">{t("max_tab_warnings")}</label>
              <input
                type="number"
                min={0}
                max={10}
                value={maxTabSwitchWarnings}
                onChange={(e) => setMaxTabSwitchWarnings(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-xs bg-[#080C14] border rounded-xl border-slate-800 text-white focus:bg-[#0D1322] focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition-all"
              />
              <span className="text-[10px] text-slate-400">0 = immediate auto-submit on 1st window departure</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">Gaze Sensitivity Threshold (0.1 - 1.0)</label>
              <input
                type="number"
                step="0.1"
                min={0.1}
                max={1.0}
                value={gazeSensitivity}
                onChange={(e) => setGazeSensitivity(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-xs bg-[#080C14] border rounded-xl border-slate-800 text-white focus:bg-[#0D1322] focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition-all"
              />
              <span className="text-[10px] text-slate-400">Head turn and gaze divergence detection tolerance</span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} className="text-xs py-2.5 px-5 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60">
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!canPublish || isSubmitting}
              isLoading={isSubmitting}
              className="text-xs py-2.5 px-6 shadow-md shadow-indigo-500/20"
            >
              {initialData ? t("save_changes") : t("publish_exam")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
