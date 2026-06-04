import { createContext, useContext, useMemo, type CSSProperties } from "react";

/**
 * Design tokens for the built-in MRBD auth screens.
 *
 * Every default screen ({@link MrbdSignInScreen}, {@link MrbdEmailSignInScreen},
 * {@link MrbdApproveDeviceScreen}, {@link MrbdOtpNumpad}, {@link MrbdOtpInput})
 * render from these tokens, so overriding a few of them re-skins all of them at
 * once. Provide overrides app-wide via `MrbdAuthProvider`'s `theme` prop or
 * per-screen via the `theme` prop. Anything you don't set falls back to
 * {@link defaultMrbdAuthTheme}.
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
  colorBackground: "#000000",
  colorSurface: "#000000",
  colorSurfaceAccent: "#1a1a1a",
  colorBorder: "#ffffff",
  colorText: "#ffffff",
  colorTextMuted: "#a3a3a3",
  colorTextSubtle: "#737373",
  colorAccent: "#ffffff",
  colorPrimary: "#ffffff",
  colorPrimaryText: "#000000",
  colorDanger: "#ffffff",
  radiusLarge: 0,
  radiusMedium: 0,
  radiusSmall: 0,
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
  otpInput: CSSProperties;
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
    gap: 16,
    padding: 16,
    color: theme.colorText,
    background: theme.colorBackground,
    borderRadius: theme.radiusLarge,
    fontFamily: theme.fontFamily,
  };

  const label: CSSProperties = {
    margin: 0,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: theme.colorTextSubtle,
  };

  const heading: CSSProperties = { margin: 0, fontSize: 22, fontWeight: 700, lineHeight: 1.2 };
  const hint: CSSProperties = { margin: 0, fontSize: 15, color: theme.colorTextMuted, lineHeight: 1.4 };
  const subtle: CSSProperties = { margin: 0, fontSize: 13, color: theme.colorTextSubtle, lineHeight: 1.4 };
  const error: CSSProperties = { ...subtle, color: theme.colorDanger };
  const url: CSSProperties = { margin: 0, fontSize: 18, fontWeight: 700, color: theme.colorText };

  const code: CSSProperties = {
    margin: 0,
    fontSize: 32,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: theme.colorText,
  };

  const input: CSSProperties = {
    minHeight: 48,
    borderRadius: theme.radiusSmall,
    border: `1px solid ${theme.colorBorder}`,
    background: theme.colorSurface,
    color: theme.colorText,
    font: "inherit",
    fontFamily: theme.fontFamily,
    fontSize: 16,
    fontWeight: 500,
    padding: "0 12px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  const otpInput: CSSProperties = {
    ...input,
    textAlign: "center",
    letterSpacing: "0.35em",
    fontVariantNumeric: "tabular-nums",
    fontSize: 20,
    fontWeight: 600,
    padding: "0 16px",
  };

  const primaryButton: CSSProperties = {
    minHeight: 48,
    borderRadius: theme.radiusMedium,
    border: `1px solid ${theme.colorBorder}`,
    background: theme.colorPrimary,
    color: theme.colorPrimaryText,
    font: "inherit",
    fontFamily: theme.fontFamily,
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
    width: "100%",
  };

  const subtleButton: CSSProperties = {
    minHeight: 44,
    borderRadius: theme.radiusSmall,
    border: `1px solid ${theme.colorBorder}`,
    background: theme.colorSurface,
    color: theme.colorTextMuted,
    font: "inherit",
    fontFamily: theme.fontFamily,
    fontWeight: 500,
    fontSize: 14,
    cursor: "pointer",
    width: "100%",
  };

  const retryButton: CSSProperties = {
    ...primaryButton,
    background: theme.colorSurface,
    color: theme.colorText,
  };

  const otpBox = (filled: boolean): CSSProperties => ({
    width: 36,
    height: 48,
    display: "grid",
    placeItems: "center",
    borderRadius: theme.radiusSmall,
    border: `1px solid ${theme.colorBorder}`,
    background: theme.colorSurface,
    color: theme.colorText,
    fontSize: 22,
    fontWeight: 600,
    opacity: filled ? 1 : 0.5,
  });

  const key = (accent: boolean): CSSProperties => ({
    minHeight: 64,
    borderRadius: theme.radiusMedium,
    border: `1px solid ${theme.colorBorder}`,
    background: accent ? theme.colorSurfaceAccent : theme.colorSurface,
    color: accent ? theme.colorTextSubtle : theme.colorText,
    font: "inherit",
    fontFamily: theme.fontFamily,
    fontSize: 20,
    fontWeight: 600,
    cursor: "pointer",
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
    otpInput,
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
