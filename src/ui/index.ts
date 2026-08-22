export { cn } from "./cn";
export { Button, type ButtonProps } from "./Button";
export { Card, CardTitle, type CardProps } from "./Card";
export { Badge } from "./Badge";
export { EmptyState, type EmptyStateProps } from "./EmptyState";
export { HealthScoreCard, type HealthScoreCardProps } from "./HealthScoreCard";

// ── Auth kit (shared login/registration design system) ──────────────────────
export { AuthShell, type AuthShellProps } from "./auth/AuthShell";
export { AuthButton, type AuthButtonProps } from "./auth/AuthButton";
export { Field, TextInput, inputClass, type FieldProps } from "./auth/Field";
export { PhoneField, type PhoneFieldProps } from "./auth/PhoneField";
export { PasswordField, passwordScore, type PasswordFieldProps } from "./auth/PasswordField";
export { OtpInput, type OtpInputProps } from "./auth/OtpInput";
export { Callout, type CalloutProps } from "./auth/Callout";
export { Stepper, type StepperProps } from "./auth/Stepper";
export { WizardStep, useWizard, type WizardStepProps } from "./auth/Wizard";
export { PanelLogin, type PanelLoginProps, type AuthMethod } from "./auth/PanelLogin";
export { sendPhoneOtp, confirmPhoneOtp, firebaseConfigured, toE164, type ConfirmationResult } from "./auth/firebaseClient";
export { ACCENTS, BRAND, resolveAccent, type Accent } from "./auth/theme";
export {
  authClient,
  AuthError,
  setTokens,
  clearTokens,
  getAccess,
  type Tokens,
} from "./auth/authClient";
