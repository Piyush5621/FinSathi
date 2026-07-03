import { z } from "zod";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters long.")
  .regex(passwordRegex, "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.");

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  password: passwordSchema,
  businessName: z.string().min(2, "Business name must be at least 2 characters."),
  businessType: z.string().optional(),
  phone: z.string().min(10, "Phone number must be at least 10 digits."),
  city: z.string().optional(),
  state: z.string().optional(),
  address: z.string().optional(),
  gstin: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal(""))
});

export const loginSchema = z.object({
  emailOrPhone: z.string().min(4, "Email or phone must be provided."),
  password: z.string().min(1, "Password is required.")
});

export const tokenRefreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required.")
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Old password is required."),
  newPassword: passwordSchema
});

export const rbacAssignSchema = z.object({
  storeId: z.string().uuid("Invalid store ID format."),
  staffId: z.string().uuid("Invalid staff ID format."),
  roleId: z.string().uuid("Invalid role ID format.")
});

export const toggleOverrideSchema = z.object({
  permissionId: z.string().uuid("Invalid permission ID format."),
  grant: z.boolean()
});
