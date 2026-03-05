import { heroui } from "@heroui/theme";

/** @type {import('tailwindcss').Config} */
const config: import("tailwindcss").Config = {
  content: [
    "./src/layouts/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontWeight: {
        thin: "50", // was 100
        extralight: "150", // was 200
        light: "250", // was 300
        normal: "350", // was 400
        medium: "450", // was 500
        semibold: "550", // was 600
        bold: "600", // was 700
        extrabold: "750", // was 800
        black: "850", // was 900
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        tiny: "0.4375rem", // 7px
        xxs: "0.625rem", // 10px
        xs: "0.75rem", // 12px
        small: "0.875rem", // 14px
        medium: "0.9375rem", // 15px
        large: "1.125rem", // 18px
      },
      screens: {
        xxs: "320px",
        xs: "375px",
        sm: "431px",
        md: "769px",
        lg: "1440px",
        xl: "1800px",
        xxl: "2550px",
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      prefix: "heroui",
      addCommonColors: false,
      defaultTheme: "light",
      defaultExtendTheme: "light",
      layout: {
        dividerWeight: "1px",
        disabledOpacity: 0.45,
        radius: {
          small: "6px",
          medium: "8px",
          large: "12px",
        },
        borderWidth: {
          small: "1px",
          medium: "1px",
          large: "2px",
        },
      },
      themes: {
        light: {
          colors: {
            background: "#ffffff",
            foreground: "#111111",
            focus: "#6b7280", // neutral gray focus
            primary: {
              50: "#f9fafb",
              100: "#f3f4f6",
              200: "#e5e7eb",
              300: "#d1d5db",
              400: "#9ca3af",
              500: "#6b7280",
              600: "#4b5563",
              700: "#374151",
              800: "#1f2933",
              900: "#111827",
              DEFAULT: "#4b5563",
            },
          },
        },
        dark: {
          colors: {
            background: "#0f0f0f",
            foreground: "#f9fafb",
            focus: "#9ca3af", // slightly lighter gray for dark mode
            primary: {
              50: "#f9fafb",
              100: "#f3f4f6",
              200: "#e5e7eb",
              300: "#d1d5db",
              400: "#9ca3af",
              500: "#6b7280",
              600: "#4b5563",
              700: "#374151",
              800: "#1f2937",
              900: "#111827",
              DEFAULT: "#9ca3af",
            },
          },
        },
      },
    }),
  ],
};

export default config;
