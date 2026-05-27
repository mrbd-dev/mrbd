import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        mrbd: {
          panel: "#1C1E21",
          cyan: "#00D4FF",
        },
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["black"],
  },
};

export default config;
