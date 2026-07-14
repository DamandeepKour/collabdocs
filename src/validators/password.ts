import { z } from "zod";

/**
 * Strong password for registration:
 * - 6–8 characters
 * - at least 1 uppercase, 1 lowercase, 1 number, 1 special character
 */
export const PASSWORD_RULES_HINT =
  "Password must be 6–8 characters and include uppercase, lowercase, a number, and a special character (!@#$%^&*).";

export const strongPasswordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(8, "Password must be at most 8 characters")
  .regex(/[a-z]/, "Password must include at least one lowercase letter")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter")
  .regex(/[0-9]/, "Password must include at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must include at least one special character (!@#$%^&*)",
  );

/** Login: required only (existing accounts may use older password formats). */
export const loginPasswordSchema = z
  .string()
  .min(1, "Password is required")
  .min(6, "Password must be at least 6 characters")
  .max(128, "Password is too long");

export const registerFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name must be at most 80 characters"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: strongPasswordSchema,
});

export const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: loginPasswordSchema,
});

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
export type LoginFormValues = z.infer<typeof loginFormSchema>;
