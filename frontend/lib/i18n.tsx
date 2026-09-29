"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Globe, Check } from "lucide-react";

import { en } from "./translations/en";
import { mr } from "./translations/mr";
import { hi } from "./translations/hi";
import { te } from "./translations/te";
import { ta } from "./translations/ta";
import { ml } from "./translations/ml";
import { kn } from "./translations/kn";

export type Language = "en" | "mr" | "hi" | "te" | "ta" | "ml" | "kn";

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
];

export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en,
  mr,
  hi,
  te,
  ta,
  ml,
  kn,
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isHydrated: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
  isHydrated: false,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    try {
      const saved = localStorage.getItem("intelliexam_preferred_lang") as Language;
      if (saved && TRANSLATIONS[saved]) {
        setLanguageState(saved);
      }
    } catch (e) {}
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("intelliexam_preferred_lang", lang);
    } catch (e) {}
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    // Both SSR and initial client render must strictly evaluate in English to prevent hydration mismatch
    const effectiveLang = isHydrated ? language : "en";
    const langDict = TRANSLATIONS[effectiveLang];
    let text = (langDict && langDict[key]) || TRANSLATIONS.en[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isHydrated }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { language, setLanguage, isHydrated, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentOption =
    (isHydrated ? SUPPORTED_LANGUAGES.find((l) => l.code === language) : null) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("#language-switcher-container")) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div id="language-switcher-container" className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#202020] hover:bg-[#2A2A2A] text-[#F4F1E8] border border-[#333333] shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-[#C5A04A]/40"
        title="Change Platform Language"
      >
        <Globe className="h-3.5 w-3.5 text-[#C5A04A]" />
        <span className="font-medium">{currentOption.nativeName}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white border border-[#DED8CA] shadow-xl py-1 z-50 animate-fade-in text-[#181818]">
          <div className="px-3 py-1.5 text-[11px] font-bold text-[#6B6861] uppercase tracking-wider border-b border-[#DED8CA] bg-[#F4F1E8]">
            {t("select_language")}
          </div>
          <div className="py-1 max-h-64 overflow-y-auto">
            {SUPPORTED_LANGUAGES.map((opt) => (
              <button
                key={opt.code}
                onClick={() => {
                  setLanguage(opt.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-[#F4F1E8] transition-colors ${
                  language === opt.code ? "font-bold text-[#A6822E] bg-[#FBF8EF]" : "text-[#181818]"
                }`}
              >
                <div>
                  <div className="text-xs">{opt.nativeName}</div>
                  <div className="text-[10px] text-[#6B6861] font-normal">{opt.name}</div>
                </div>
                {language === opt.code && <Check className="h-3.5 w-3.5 text-[#C5A04A]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
