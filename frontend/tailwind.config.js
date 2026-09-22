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
        // Modern AI + EdTech Palette
        saffron: {
          DEFAULT: "#E06A26", // Warm Orange / Saffron
          dark: "#C95716",
          light: "#FAD9C5",
          subtle: "#FEF3EC",
        },
        terracotta: {
          DEFAULT: "#C85332", // Secondary Accent Terracotta
          dark: "#B04426",
          light: "#F8DDD5",
        },
        charcoal: {
          DEFAULT: "#1C1C1F", // Deep Charcoal
          dark: "#171719",
          surface: "#242428",
          muted: "#6B6B76",
          border: "#EAE6DF",
        },
        graphite: {
          DEFAULT: "#171719", // Graphite Surfaces & Sidebar
          dark: "#111112",
          surface: "#1E1E22",
          hover: "#25252A",
          active: "#2C2C32",
          border: "#2F2F36",
        },
        ivory: {
          DEFAULT: "#FAF8F5", // Warm Ivory Background
          dark: "#F0ECE3",
          card: "#FFFFFF",
          subtle: "#F5F1E8",
          border: "#DFD9CF",
        },
        // System Statuses (Muted Green, Soft Amber, Rose)
        status: {
          success: "#2B7853",
          "success-bg": "#EFF7F2",
          "success-border": "#C4DFD3",
          warning: "#D97706",
          "warning-bg": "#FEF7EC",
          "warning-border": "#FDE68A",
          danger: "#A6404D",
          "danger-bg": "#FAEFF1",
          "danger-border": "#ECCFD4",
        },
        // Legacy Aliases Redirected to Saffron/Terracotta to Prevent Any Old Burgundy
        burgundy: {
          DEFAULT: "#E06A26",
          deep: "#C95716",
          rose: "#C85332",
          subtle: "#FEF3EC",
          border: "#FAD9C5",
          hover: "#C95716",
          active: "#B04426",
        },
        champagne: {
          DEFAULT: "#E06A26",
          light: "#FEF3EC",
          dark: "#C95716",
          subtle: "#FAF8F5",
          border: "#EAE6DF",
          hover: "#C95716",
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(28, 28, 31, 0.05), 0 1px 2px -1px rgba(28, 28, 31, 0.03)",
        "card-hover": "0 10px 22px -4px rgba(28, 28, 31, 0.08), 0 4px 8px -2px rgba(28, 28, 31, 0.04)",
        dropdown: "0 12px 28px -6px rgba(23, 23, 25, 0.18), 0 4px 12px -2px rgba(23, 23, 25, 0.08)",
        saffron: "0 4px 14px 0 rgba(224, 106, 38, 0.25)",
        burgundy: "0 4px 14px 0 rgba(224, 106, 38, 0.25)",
        champagne: "0 4px 14px 0 rgba(224, 106, 38, 0.20)",
      },
      animation: {
        "fade-in-up": "fadeInUp 0.35s ease-out forwards",
        "fade-in": "fadeIn 0.25s ease-out forwards",
        "pulse-subtle": "pulseSubtle 2.5s ease-in-out infinite",
        "shimmer": "shimmer 2.5s infinite linear",
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
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
}
