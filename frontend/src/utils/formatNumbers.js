/**
 * Centralized Currency and Number Formatting Utilities for FinSathi
 * Target Format: Indian numbering system (en-IN) / Indian Rupees (INR, ₹)
 */

/**
 * Formats a numeric value into Indian Standard Rupee (INR) representation.
 * Defaults to 0 decimal places unless overridden in options.
 * @param {number|string} value - The numeric value to format
 * @param {object} [options] - Custom Intl.NumberFormat options to override defaults
 * @returns {string} e.g. "₹1,50,000" or "₹1,50,000.00"
 */
export function formatCurrencyINR(value, options = {}) {
  const num = Number(value ?? 0);
  const defaultOptions = {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    ...options,
  };
  return new Intl.NumberFormat("en-IN", defaultOptions).format(num);
}

/**
 * Formats a number into a short, compact representation using the Indian system.
 * @param {number|string} value - The numeric value
 * @returns {string} e.g. "1.5L" or "10T"
 */
export function formatCompactNumber(value) {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    compactDisplay: "short",
  }).format(num);
}

/**
 * Formats a value as a percentage string.
 * @param {number|string} value - The percentage value
 * @param {number} [decimals=1] - Number of decimal places
 * @returns {string} e.g. "75.5%"
 */
export function formatPercentage(value, decimals = 1) {
  const num = Number(value ?? 0);
  return `${num.toFixed(decimals)}%`;
}
