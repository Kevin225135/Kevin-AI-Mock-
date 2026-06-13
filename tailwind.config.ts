import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        mist: "#eef2f5",
        pine: "#0f766e",
        coral: "#be4b49",
        brass: "#b7791f"
      },
      boxShadow: {
        panel: "0 20px 60px rgba(23, 32, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
