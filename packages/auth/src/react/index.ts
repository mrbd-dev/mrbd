export { MrbdAuthContext, useMrbdAuth } from "./context.js";
export type { MrbdAuthContextValue, MrbdAuthStatus } from "./context.js";
export { MrbdAuthProvider } from "./MrbdAuthProvider.js";
export type { MrbdAuthProviderProps } from "./MrbdAuthProvider.js";

// Headless hooks — build a fully custom sign-in UI on the MRBD flow.
export {
  useMrbdEmailSignIn,
  useMrbdDeviceSignIn,
  useMrbdApproveDevice,
} from "./hooks.js";
export type {
  MrbdEmailSignIn,
  MrbdEmailSignInPhase,
  UseMrbdEmailSignInOptions,
  MrbdDeviceSignIn,
  MrbdDeviceSignInPhase,
  UseMrbdDeviceSignInOptions,
  MrbdApproveDevice,
  MrbdApproveDevicePhase,
  UseMrbdApproveDeviceOptions,
} from "./hooks.js";

// Theming — re-skin the built-in screens with design tokens.
export {
  defaultMrbdAuthTheme,
  resolveMrbdAuthTheme,
  useMrbdAuthTheme,
  useMrbdAuthStyles,
  createMrbdAuthStyles,
} from "./theme.js";
export type { MrbdAuthTheme, MrbdAuthStyles } from "./theme.js";
export { MrbdOtpNumpad } from "./MrbdOtpNumpad.js";
export type { MrbdOtpNumpadProps } from "./MrbdOtpNumpad.js";
export { MrbdSignInScreen } from "./MrbdSignInScreen.js";
export type { MrbdSignInScreenProps } from "./MrbdSignInScreen.js";
export { MrbdEmailSignInScreen } from "./MrbdEmailSignInScreen.js";
export type { MrbdEmailSignInScreenProps } from "./MrbdEmailSignInScreen.js";
export { MrbdApproveDeviceScreen } from "./MrbdApproveDeviceScreen.js";
export type { MrbdApproveDeviceScreenProps } from "./MrbdApproveDeviceScreen.js";
export { MrbdAuthGate } from "./MrbdAuthGate.js";
export type { MrbdAuthGateProps } from "./MrbdAuthGate.js";
