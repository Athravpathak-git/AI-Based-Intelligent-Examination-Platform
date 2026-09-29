/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Master AI SaaS Deep Obsidian & Midnight Slate Palette
        obsidian: {
          DEFAULT: "#080C14", // Canvas background
          deep: "#05080E",
          card: "#0D1322",   // Secondary panel
          surface: "#131B2E", // Elevated card surface
          elevated: "#182238",
          border: "#1E293B",  // Hairline border
          muted: "#334155",
        },
        electric: {
          indigo: "#6366F1",
          violet: "#8B5CF6",
          cyan: "#06B6D4",
          emerald: "#10B981",
          amber: "#F59E0B",
          rose: "#EF4444",
        },
        // Premium Graphite + Metallic Gold (Enhanced for Dark Mode)
        gold: {
          DEFAULT: "#EAB308", // Luminous Gold
          dark: "#CA8A04",
          light: "#FDE047",
          subtle: "rgba(234, 179, 8, 0.1)",
          border: "rgba(234, 179, 8, 0.25)",
        },
        graphite: {
          DEFAULT: "#090D16", // Primary Surface
          dark: "#05080E",
          surface: "#0F172A", // Dark Surface / Console Panel
          panel: "#131B2E",
          hover: "#1E293B",
          active: "#334155",
          border: "#1E293B",
          muted: "#64748B",
        },
        ivory: {
          DEFAULT: "#080C14", // Re-mapped for dark SaaS consistency
          dark: "#05080E",
          card: "#0F172A",    // Card surface
          subtle: "#131B2E",
          border: "#1E293B",  // Thin hairline border
        },
        charcoal: {
          DEFAULT: "#F8FAFC", // Primary Text in Dark Mode
          dark: "#0B0F19",
          surface: "#0F172A",
          muted: "#94A3B8",   // Secondary Text
          border: "#1E293B",
        },
        // System Statuses
        status: {
          success: "#10B981",
          "success-bg": "rgba(16, 185, 129, 0.1)",
          "success-border": "rgba(16, 185, 129, 0.3)",
          warning: "#F59E0B",
          "warning-bg": "rgba(245, 158, 11, 0.1)",
          "warning-border": "rgba(245, 158, 11, 0.3)",
          danger: "#EF4444",
          "danger-bg": "rgba(239, 68, 68, 0.1)",
          "danger-border": "rgba(239, 68, 68, 0.3)",
        },
        // Seamless aliases to prevent breaking legacy references
        saffron: {
          DEFAULT: "#F59E0B",
          dark: "#D97706",
          light: "#FCD34D",
          subtle: "rgba(245, 158, 11, 0.1)",
        },
        terracotta: {
          DEFAULT: "#0F172A",
          dark: "#080C14",
          light: "#1E293B",
        },
        burgundy: {
          DEFAULT: "#6366F1",
          deep: "#4F46E5",
          rose: "#818CF8",
          subtle: "rgba(99, 102, 241, 0.1)",
          border: "rgba(99, 102, 241, 0.3)",
          hover: "#4F46E5",
          active: "#080C14",
        },
        champagne: {
          DEFAULT: "#EAB308",
          light: "#FEF08A",
          dark: "#CA8A04",
          subtle: "rgba(234, 179, 8, 0.1)",
          border: "rgba(234, 179, 8, 0.25)",
          hover: "#CA8A04",
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.2)",
        "card-hover": "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)",
        dropdown: "0 20px 35px -10px rgba(0, 0, 0, 0.7), 0 8px 16px -4px rgba(0, 0, 0, 0.5)",
        gold: "0 0 25px -5px rgba(234, 179, 8, 0.25)",
        indigo: "0 0 25px -5px rgba(99, 102, 241, 0.3)",
        cyan: "0 0 25px -5px rgba(6, 182, 212, 0.3)",
        emerald: "0 0 25px -5px rgba(16, 185, 129, 0.25)",
        rose: "0 0 25px -5px rgba(239, 68, 68, 0.25)",
        glow: "0 0 40px -10px rgba(99, 102, 241, 0.3)",
        graphite: "0 4px 14px 0 rgba(0, 0, 0, 0.5)",
        saffron: "0 0 25px -5px rgba(245, 158, 11, 0.25)",
        burgundy: "0 0 25px -5px rgba(99, 102, 241, 0.3)",
        champagne: "0 0 25px -5px rgba(234, 179, 8, 0.2)",
      },
      animation: {
        "fade-in-up": "fadeInUp 0.35s ease-out forwards",
        "fade-in": "fadeIn 0.25s ease-out forwards",
        "pulse-subtle": "pulseSubtle 2.5s ease-in-out infinite",
        "shimmer": "shimmer 2.5s infinite linear",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.75" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
}
