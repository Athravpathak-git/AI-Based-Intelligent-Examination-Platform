"use client";

import React, { useState, useEffect } from "react";
import { Question, Option, QuestionType, DifficultyLevel } from "@/types";
import { api, getErrorMessage } from "@/lib/api";
import { Button, Alert } from "./UIComponents";
import { useLanguage } from "@/lib/i18n";
import { X, Plus, Trash2, HelpCircle } from "lucide-react";

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData?: Question | null;
}

export default function QuestionModal({ isOpen, onClose, onSaved, initialData }: QuestionModalProps) {
  const { t } = useLanguage();
  const [subject, setSubject] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>("MCQ");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("MEDIUM");
  const [marks, setMarks] = useState(1);
  const [negativeMarks, setNegativeMarks] = useState(0);
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [modelAnswer, setModelAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [options, setOptions] = useState<Option[]>([
    { option_text: "", is_correct: true, option_order: 0 },
    { option_text: "", is_correct: false, option_order: 1 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setSubject(initialData.subject);
      setQuestionText(initialData.question_text);
      setQuestionType(initialData.question_type);
      setDifficulty(initialData.difficulty);
      setMarks(initialData.marks);
      setNegativeMarks(initialData.negative_marks);
      setExpectedAnswer(initialData.expected_answer || "");
      setModelAnswer(initialData.model_answer || "");
      setExplanation(initialData.explanation || "");
      setOptions(
        initialData.options?.length > 0
          ? initialData.options
          : [
              { option_text: "", is_correct: true, option_order: 0 },
              { option_text: "", is_correct: false, option_order: 1 },
            ]
      );
    } else {
      setSubject("");
      setQuestionText("");
      setQuestionType("MCQ");
      setDifficulty("MEDIUM");
      setMarks(1);
      setNegativeMarks(0);
      setExpectedAnswer("");
      setModelAnswer("");
      setExplanation("");
      setOptions([
        { option_text: "", is_correct: true, option_order: 0 },
        { option_text: "", is_correct: false, option_order: 1 },
      ]);
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleAddOption = () => {
    setOptions([...options, { option_text: "", is_correct: false, option_order: options.length }]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      setError("MCQ and Multi-Select questions require at least 2 options.");
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, text: string) => {
    const updated = [...options];
    updated[index].option_text = text;
    setOptions(updated);
  };

  const handleCorrectToggle = (index: number) => {
    const updated = [...options];
    if (questionType === "MCQ") {
      // Exactly one correct
      updated.forEach((opt, i) => {
        opt.is_correct = i === index;
      });
    } else if (questionType === "MULTI_SELECT") {
      updated[index].is_correct = !updated[index].is_correct;
    }
    setOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client validation
    if (questionType === "MCQ") {
      const correctCount = options.filter((o) => o.is_correct).length;
      if (correctCount !== 1) {
        setError("MCQ questions must have exactly 1 correct option.");
        return;
      }
    } else if (questionType === "MULTI_SELECT") {
      const correctCount = options.filter((o) => o.is_correct).length;
      if (correctCount < 2) {
        setError("Multi-Select questions must have at least 2 correct options.");
        return;
      }
    }

    setIsSubmitting(true);
    const payload = {
      subject,
      question_text: questionText,
      question_type: questionType,
      difficulty,
      marks: Number(marks),
      negative_marks: Number(negativeMarks),
      expected_answer: expectedAnswer || null,
      model_answer: modelAnswer || null,
      explanation: explanation || null,
      options: ["MCQ", "MULTI_SELECT"].includes(questionType) ? options : [],
    };

    try {
      if (initialData?.id) {
        await api.put(`/questions/${initialData.id}`, payload);
      } else {
        await api.post("/questions", payload);
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0D1322] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-800 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-[#0D1322] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-sm">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {initialData ? t("edit_question_title") : t("create_question_title")}
              </h2>
              <p className="text-xs text-slate-400">{t("exam_config_subtitle")}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
          {error && <Alert type="error">{error}</Alert>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">{t("subject")} *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("subject_placeholder")}
                className="w-full px-3.5 py-2 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white focus:bg-[#0D1322] focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">{t("difficulty_level")}</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="w-full px-3.5 py-2 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white focus:bg-[#0D1322] focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none"
              >
                <option value="EASY">{t("easy")}</option>
                <option value="MEDIUM">{t("medium")}</option>
                <option value="HARD">{t("hard")}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">{t("question_type")}</label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as QuestionType)}
              className="w-full px-3.5 py-2 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white focus:bg-[#0D1322] focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none"
            >
              <option value="MCQ">{t("multiple_choice")} (Single Choice)</option>
              <option value="MULTI_SELECT">{t("multi_select")} (Multiple Choice)</option>
              <option value="SHORT_ANSWER">{t("short_answer")}</option>
              <option value="LONG_ANSWER">{t("long_answer")}</option>
              <option value="IMAGE_UPLOAD">{t("image_solution")}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">{t("question_prompt_statement")} *</label>
            <textarea
              required
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder={t("enter_question_prompt")}
              className="w-full px-3.5 py-2.5 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white focus:bg-[#0D1322] focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-all leading-relaxed placeholder:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">{t("marks")}</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                value={marks}
                onChange={(e) => setMarks(parseFloat(e.target.value))}
                className="w-full px-3.5 py-2 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white focus:bg-[#0D1322] focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">{t("negative_marking")}</label>
              <input
                type="number"
                step="0.25"
                min="0"
                required
                value={negativeMarks}
                onChange={(e) => setNegativeMarks(parseFloat(e.target.value))}
                className="w-full px-3.5 py-2 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white focus:bg-[#0D1322] focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Options for MCQ / MULTI_SELECT */}
          {["MCQ", "MULTI_SELECT"].includes(questionType) && (
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{t("options")}</label>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> {t("add_option")}
                </button>
              </div>

              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCorrectToggle(idx)}
                      className={`h-7 px-3 rounded-lg text-xs font-bold transition-all shrink-0 border ${
                        opt.is_correct
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-[#080C14] text-slate-500 border-slate-800 hover:text-slate-300"
                      }`}
                    >
                      {opt.is_correct ? "CORRECT" : "INCORRECT"}
                    </button>
                    <input
                      type="text"
                      required
                      value={opt.option_text}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      className="flex-1 px-3 py-1.5 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white focus:bg-[#0D1322] focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Model Answer & Explanation for Subjective */}
          {["SHORT_ANSWER", "LONG_ANSWER", "IMAGE_UPLOAD"].includes(questionType) && (
            <div className="border-t border-slate-800 pt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  {t("expected_answer_keywords")}
                </label>
                <input
                  type="text"
                  value={expectedAnswer}
                  onChange={(e) => setExpectedAnswer(e.target.value)}
                  placeholder={t("keywords_comma_separated")}
                  className="w-full px-3.5 py-2 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white focus:bg-[#0D1322] focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  {t("reference_model_answer_rubric")}
                </label>
                <textarea
                  rows={2}
                  value={modelAnswer}
                  onChange={(e) => setModelAnswer(e.target.value)}
                  placeholder={t("model_solution_placeholder")}
                  className="w-full px-3.5 py-2 text-xs border rounded-xl border-slate-800 bg-[#080C14] text-white focus:bg-[#0D1322] focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none placeholder:text-slate-500"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} className="text-xs py-2 px-4 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60">
              {t("cancel")}
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} className="text-xs py-2 px-5 shadow-md shadow-indigo-500/20">
              {initialData ? t("save_changes") : t("create_question")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
