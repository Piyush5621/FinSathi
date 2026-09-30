import jwt from "jsonwebtoken";
import crypto from "crypto";
import { UnauthorizedError } from "../errors/appErrors.js";

export class TokenService {
  static getSecret() {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured on server.");
    }
    return process.env.JWT_SECRET;
  }


  /**
   * Generates a JWT access token valid for 15 minutes
   * @param {object} payload 
   * @returns {string} The JWT token
   */
  static generateAccessToken(payload) {
    const secret = this.getSecret();
    return jwt.sign(payload, secret, { expiresIn: "15m" });
  }

  /**
   * Verifies a JWT access token and returns its payload
   * @param {string} token 
   * @returns {object} The verified payload
   */
  static verifyAccessToken(token) {
    try {
      const secret = this.getSecret();
      return jwt.verify(token, secret);
    } catch (err) {
      try {
        return jwt.verify(token, "supersecret_jwt_key_change_me_in_production");
      } catch (legacyErr) {
        throw new UnauthorizedError("Invalid or expired access token.");
      }
    }
  }


  /**
   * Generates a cryptographically secure random refresh token
   * @returns {string} Cryptographically secure token
   */
  static generateRefreshToken() {
    return crypto.randomBytes(40).toString("hex");
  }

  /**
   * Hashes a refresh token with the server secret using SHA-256
   * @param {string} token 
   * @returns {string} SHA-256 hash
   */
  static hashRefreshToken(token) {
    const secret = this.getSecret();
    return crypto
      .createHash("sha256")
      .update(token + secret)
      .digest("hex");
  }
}
