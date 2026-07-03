import bcrypt from "bcryptjs";
import { ValidationError } from "../errors/appErrors.js";

export class PasswordService {
  /**
   * Hashes a plaintext password using bcrypt
   * @param {string} password - The plaintext password
   * @returns {Promise<string>} The password hash
   */
  static async hashPassword(password) {
    this.validatePasswordStrength(password);
    return bcrypt.hash(password, 10);
  }

  /**
   * Compares a plaintext password with a bcrypt hash
   * @param {string} password - Plaintext password
   * @param {string} hash - Bcrypt hash
   * @returns {Promise<boolean>} Match result
   */
  static async comparePassword(password, hash) {
    if (!password || !hash) return false;
    return bcrypt.compare(password, hash);
  }

  /**
   * Enforces password strength rules
   * @param {string} password 
   */
  static validatePasswordStrength(password) {
    if (!password || password.length < 8) {
      throw new ValidationError("Password must be at least 8 characters long.");
    }
    
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[@$!%*?&#]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasDigit || !hasSpecial) {
      throw new ValidationError(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
      );
    }
  }
}
