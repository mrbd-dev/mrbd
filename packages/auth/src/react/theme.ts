import { createContext, useContext, useMemo, type CSSProperties } from "react";

/**
 * Design tokens for the built-in MRBD auth screens.
 *
 * Every default screen ({@link MrbdSignInScreen}, {@link MrbdEmailSignInScreen},
 * {@link MrbdApproveDeviceScreen}, {@link MrbdOtpNumpad}) renders from these
 * tokens, so overriding a few of them re-skins all of them at once. Provide
 * overrides app-wide via `MrbdAuthProvider`'s `theme` prop or per-screen via the
 * `theme` prop. Anything you don't set falls back to {@link defaultMrbdAuthTheme}.
 *
 * If you want full control over markup (not just colors), skip these screens
 * entirely and build your own UI on the headless hooks (`useMrbdEmailSignIn`,
 * `useMrbdDeviceSignIn`, `useMrbdApproveDevice`).
 */
export type MrbdAuthTheme = {
  /** Page/card background. */
  colorBackground: string;
  /** Inputs, numpad keys, and secondary buttons. */
  colorSurface: string;
  /** Slightly raised surface (e.g. clear/delete keys). */
  colorSurfaceAccent: string;
  /** Borders on inputs and OTP boxes. */
  colorBorder: string;
  /** Primary text. */
  colorText: string;
  /** Hint / supporting text. */
  colorTextMuted: string;
  /** Subtle / footnote text. */
  colorTextSubtle: string;
  /** Eyebrow label + verification code accent. */
  colorAccent: string;
  /** Primary call-to-action background. */
  colorPrimary: string;
  /** Text on top of `colorPrimary`. */
  colorPrimaryText: string;
  /** Error text and error borders. */
  colorDanger: string;
  /** Outer container radius. */
  radiusLarge: number;
  /** Button radius. */
  radiusMedium: number;
  /** Input / OTP-box radius. */
  radiusSmall: number;
  /** Font family for all screen text (defaults to inheriting the app font). */
  fontFamily: string;
};

export const defaultMrbdAuthTheme: MrbdAuthTheme = {
  colorBackground: "#0a0a0f",
  colorSurface: "#1C1E21",
  colorSurfaceAccent: "#26282c",
  colorBorder: "#2a2d31",
  colorText: "#ffffff",
  colorTextMuted: "#d4d4d8",
  colorTextSubtle: "#9ca3af",
  colorAccent: "#67e8f9",
  colorPrimary: "#a3e635",
  colorPrimaryText: "#0a0a0f",
  colorDanger: "#f87171",
  radiusLarge: 28,
  radiusMedium: 24,
  radiusSmall: 18,
  fontFamily: "inherit",
};

const MrbdAuthThemeContext = createContext<MrbdAuthTheme | null>(null);

export const MrbdAuthThemeProvider = MrbdAuthThemeContext.Provider;

/** Merge a partial override over the default theme. */
export function resolveMrbdAuthTheme(theme?: Partial<MrbdAuthTheme> | null): MrbdAuthTheme {
  if (!theme) return defaultMrbdAuthTheme;
  return { ...defaultMrbdAuthTheme, ...theme };
}

/**
 * Read the active theme (from the nearest provider) and merge an optional
 * per-screen override on top of it. Memoized so screens that consume styles
 * don't rebuild them every render.
 */
export function useMrbdAuthTheme(override?: Partial<MrbdAuthTheme> | null): MrbdAuthTheme {
  const provided = useContext(MrbdAuthThemeContext);
  return useMemo(() => {
    const base = provided ?? defaultMrbdAuthTheme;
    return override ? { ...base, ...override } : base;
  }, [provided, override]);
}

export type MrbdAuthStyles = {
  container: CSSProperties;
  label: CSSProperties;
  heading: CSSProperties;
  hint: CSSProperties;
  subtle: CSSProperties;
  error: CSSProperties;
  url: CSSProperties;
  code: CSSProperties;
  input: CSSProperties;
  primaryButton: CSSProperties;
  subtleButton: CSSProperties;
  retryButton: CSSProperties;
  otpBox: (filled: boolean) => CSSProperties;
  key: (accent: boolean) => CSSProperties;
};

/**
 * Build the concrete inline styles the default screens render from, derived
 * from a resolved {@link MrbdAuthTheme}.
 */
export function createMrbdAuthStyles(theme: MrbdAuthTheme): MrbdAuthStyles {
  const container: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    padding: 24,
    color: theme.colorText,
    background: theme.colorBackground,
    borderRadius: theme.radiusLarge,
    fontFamily: theme.fontFamily,
  };

  const label: CSSProperties = {
    margin: 0,
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: "0.24em",
    textTransform: "uppercase",
    color: theme.colorAccent,
  };

  const heading: CSSProperties = { margin: 0, fontSize: 30, fontWeight: 900, lineHeight: 1.1 };
  const hint: CSSProperties = { margin: 0, fontSize: 16, color: theme.colorTextMuted };
  const subtle: CSSProperties = { margin: 0, fontSize: 13, color: theme.colorTextSubtle };
  const error: CSSProperties = { ...subtle, color: theme.colorDanger };
  const url: CSSProperties = { margin: 0, fontSize: 24, fontWeight: 800, color: theme.colorText };

  const code: CSSProperties = {
    margin: 0,
    fontSize: 44,
    fontWeight: 900,
    letterSpacing: "0.18em",
    color: theme.colorPrimary,
  };

  const input: CSSProperties = {
    minHeight: 64,
    borderRadius: theme.radiusSmall,
    border: `2px solid ${theme.colorBorder}`,
    background: theme.colorSurface,
    color: theme.colorText,
    font: "inherit",
    fontFamily: theme.fontFamily,
    fontSize: 20,
    fontWeight: 600,
    padding: "0 18px",
    outline: "none",
  };

  const primaryButton: CSSProperties = {
    minHeight: 72,
    borderRadius: theme.radiusMedium,
    border: "2px solid transparent",
    background: theme.colorPrimary,
    color: theme.colorPrimaryText,
    font: "inherit",
    fontFamily: theme.fontFamily,
    fontWeight: 900,
    fontSize: 18,
    cursor: "pointer",
  };

  const subtleButton: CSSProperties = {
    minHeight: 56,
    borderRadius: theme.radiusSmall,
    border: "2px solid transparent",
    background: theme.colorSurface,
    color: theme.colorTextSubtle,
    font: "inherit",
    fontFamily: theme.fontFamily,
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
  };

  const retryButton: CSSProperties = {
    minHeight: 88,
    borderRadius: theme.radiusMedium,
    border: "2px solid transparent",
    background: theme.colorSurface,
    color: theme.colorText,
    font: "inherit",
    fontFamily: theme.fontFamily,
    fontWeight: 800,
    fontSize: 18,
    cursor: "pointer",
  };

  const otpBox = (filled: boolean): CSSProperties => ({
    width: 40,
    height: 56,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    border: `2px solid ${theme.colorBorder}`,
    background: theme.colorSurface,
    color: theme.colorText,
    fontSize: 28,
    fontWeight: 800,
    opacity: filled ? 1 : 0.85,
  });

  const key = (accent: boolean): CSSProperties => ({
    minHeight: 88,
    borderRadius: theme.radiusMedium,
    border: "2px solid transparent",
    background: accent ? theme.colorSurfaceAccent : theme.colorSurface,
    color: accent ? theme.colorTextSubtle : theme.colorText,
    font: "inherit",
    fontFamily: theme.fontFamily,
    fontSize: 26,
    fontWeight: 800,
    cursor: "pointer",
    transition: "transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease",
  });

  return {
    container,
    label,
    heading,
    hint,
    subtle,
    error,
    url,
    code,
    input,
    primaryButton,
    subtleButton,
    retryButton,
    otpBox,
    key,
  };
}

/** Convenience: resolve the active theme and build its styles in one call. */
export function useMrbdAuthStyles(override?: Partial<MrbdAuthTheme> | null): {
  theme: MrbdAuthTheme;
  styles: MrbdAuthStyles;
} {
  const theme = useMrbdAuthTheme(override);
  const styles = useMemo(() => createMrbdAuthStyles(theme), [theme]);
  return { theme, styles };
}
