"use client";

import React, { useState, useEffect } from "react";
import { Question, Option, QuestionType, DifficultyLevel } from "@/types";
import { api, getErrorMessage } from "@/lib/api";
import { Button, Alert } from "./UIComponents";
import { X, Plus, Trash2 } from "lucide-react";

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData?: Question | null;
}

export default function QuestionModal({ isOpen, onClose, onSaved, initialData }: QuestionModalProps) {
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#171719]/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-[#EAE6DF]">
        <div className="flex items-center justify-between p-6 border-b border-[#EAE6DF] bg-[#FFFFFF] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FEF3EC] border border-[#EAE6DF] flex items-center justify-center text-[#C85332]">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1C1C1F]">
                {initialData ? "Edit Authoritative Question" : "Create Authoritative Question"}
              </h2>
              <p className="text-xs text-[#6B6B76]">Define question prompt, answers, marking scheme, and taxonomy.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#FAF8F5] text-[#6B6B76] hover:text-[#1C1C1F] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
          {error && <Alert type="error">{error}</Alert>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Mathematics, Physics"
                className="w-full px-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C85332] focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="w-full px-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C85332] focus:outline-none"
              >
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">Question Type</label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as QuestionType)}
              className="w-full px-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C85332] focus:outline-none"
            >
              <option value="MCQ">MCQ (Single Choice)</option>
              <option value="MULTI_SELECT">MULTI_SELECT (Multiple Choice)</option>
              <option value="SHORT_ANSWER">SHORT_ANSWER (Text / Keywords)</option>
              <option value="LONG_ANSWER">LONG_ANSWER (Descriptive Essay)</option>
              <option value="IMAGE_UPLOAD">IMAGE_UPLOAD (Diagram / Handwritten)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">Question Prompt Text *</label>
            <textarea
              required
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Enter the complete question prompt..."
              className="w-full px-3.5 py-2.5 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C85332] focus:outline-none transition-all leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">Marks Awarded</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                value={marks}
                onChange={(e) => setMarks(parseFloat(e.target.value))}
                className="w-full px-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C85332] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">Negative Deduction Marks</label>
              <input
                type="number"
                step="0.25"
                min="0"
                required
                value={negativeMarks}
                onChange={(e) => setNegativeMarks(parseFloat(e.target.value))}
                className="w-full px-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C85332] focus:outline-none"
              />
            </div>
          </div>

          {/* Options for MCQ / MULTI_SELECT */}
          {["MCQ", "MULTI_SELECT"].includes(questionType) && (
            <div className="border-t border-[#EAE6DF] pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#C85332] uppercase tracking-wider">
                  Options & Correct Answer
                </span>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-xs font-semibold text-[#C85332] hover:text-[#171719] flex items-center gap-1 bg-[#FEF3EC] px-2.5 py-1 rounded-lg border border-[#EAE6DF] transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Option
                </button>
              </div>

              <p className="text-[11px] text-[#6B6B76]">
                {questionType === "MCQ"
                  ? "Select the single correct option using the radio button."
                  : "Check all options that are correct (at least 2 required)."}
              </p>

              <div className="space-y-2.5">
                {options.map((opt, index) => (
                  <div key={index} className="flex items-center gap-2.5 p-2 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF]">
                    <input
                      type={questionType === "MCQ" ? "radio" : "checkbox"}
                      name="correct-option-group"
                      checked={opt.is_correct}
                      onChange={() => handleCorrectToggle(index)}
                      className="h-4 w-4 text-[#C85332] focus:ring-[#C85332] rounded"
                    />
                    <input
                      type="text"
                      required
                      value={opt.option_text}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-3 py-1.5 text-xs border rounded-lg border-[#EAE6DF] bg-[#FFFFFF] text-[#1C1C1F] focus:ring-2 focus:ring-[#C85332] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="p-1.5 text-[#6B6B76] hover:text-[#9B3D4A] rounded-lg transition-colors"
                      title="Remove option"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subjective / Expected answers */}
          {!["MCQ", "MULTI_SELECT"].includes(questionType) && (
            <div className="border-t border-[#EAE6DF] pt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">Expected Answer / Keywords</label>
                <textarea
                  rows={2}
                  value={expectedAnswer}
                  onChange={(e) => setExpectedAnswer(e.target.value)}
                  placeholder="Key terms or concepts required for marks..."
                  className="w-full px-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C85332] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1C1F] mb-1.5">Model Answer</label>
                <textarea
                  rows={3}
                  value={modelAnswer}
                  onChange={(e) => setModelAnswer(e.target.value)}
                  placeholder="Complete benchmark evaluation answer..."
                  className="w-full px-3.5 py-2 text-xs border rounded-xl border-[#EAE6DF] bg-[#FAF8F5] text-[#1C1C1F] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C85332] focus:outline-none transition-all"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EAE6DF]">
            <Button type="button" variant="outline" onClick={onClose} className="text-xs py-2 px-4">
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} className="text-xs py-2 px-5 shadow-xs">
              {initialData ? "Update Question" : "Save Question"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
