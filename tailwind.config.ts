import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "system-ui", "sans-serif"]
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "0 0% 100%"
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "0 0% 100%"
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        /* Section alternation surface */
        surfaceWarm: "hsl(var(--muted))",
        /* Glass badge (pill badges) */
        badgeBlue: {
          DEFAULT: "hsl(var(--badge-blue-bg))",
          foreground: "hsl(var(--badge-blue-text))"
        },
        /* Module theme colors */
        moduleBehavioral: {
          DEFAULT: "hsl(var(--module-behavioral) / <alpha-value>)",
          bg: "hsl(var(--module-behavioral-bg) / <alpha-value>)"
        },
        moduleCv: {
          DEFAULT: "hsl(var(--module-cv) / <alpha-value>)",
          bg: "hsl(var(--module-cv-bg) / <alpha-value>)"
        },
        moduleTechnical: {
          DEFAULT: "hsl(var(--module-technical) / <alpha-value>)",
          bg: "hsl(var(--module-technical-bg) / <alpha-value>)"
        },
        moduleMarket: {
          DEFAULT: "hsl(var(--module-market) / <alpha-value>)",
          bg: "hsl(var(--module-market-bg) / <alpha-value>)"
        },
        /* Hero dark */
        heroDark: "hsl(var(--hero-dark))",
        /* Accent tokens */
        ink: "hsl(var(--ink))",
        mist: "hsl(var(--mist))",
        coral: "hsl(var(--coral))",
        brass: "hsl(var(--brass))",
        teal: "hsl(var(--teal))",
        blue: "hsl(var(--blue))"
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        button: "var(--radius-button)",
        card: "var(--radius-card)",
        "card-lg": "var(--radius-card-lg)",
        pill: "var(--radius-pill)"
      },
      boxShadow: {
        /* Notion-style multi-layer soft shadows (4-5 layers, individual opacity < 0.05) */
        "whisper": "0 1px 2px rgba(0,0,0,0.04)",
        "soft": "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)",
        "card": "0 4px 18px rgba(0,0,0,0.04), 0 2.025px 7.85px rgba(0,0,0,0.027), 0 0.8px 2.93px rgba(0,0,0,0.02), 0 0.175px 1.04px rgba(0,0,0,0.01)",
        "lift": "0 8px 28px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)",
        "deep": "0 23px 52px rgba(0,0,0,0.05), 0 14px 28px rgba(0,0,0,0.04), 0 7px 15px rgba(0,0,0,0.02), 0 3px 7px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.01)"
      },
      letterSpacing: {
        "display-lg": "-0.042em",
        "display": "-0.033em",
        "heading": "-0.029em",
        "subheading": "-0.024em",
        "card-title": "-0.011em",
        "badge": "0.010em"
      },
      transitionTimingFunction: {
        "out-quart": "cubic-bezier(0.25, 1, 0.5, 1)",
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)"
      }
    }
  },
  plugins: [animate]
};

export default config;
