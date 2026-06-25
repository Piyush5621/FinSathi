/**
 * Centralized Timezone and DateTime Utilities for FinSathi
 * Target Timezone: Indian Standard Time (IST, UTC+5:30)
 * Consistently converts date/time values without server timezone dependencies.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Returns the current date in IST as a 'YYYY-MM-DD' string.
 * @returns {string} e.g. "2026-06-26"
 */
export function getCurrentISTDate() {
  const istDate = new Date(Date.now() + IST_OFFSET_MS);
  return istDate.toISOString().split('T')[0];
}

/**
 * Returns a Date object representing the current moment shifted to IST.
 * Useful when using standard UTC Date methods (e.g. getUTCHours) to query IST parts.
 * @returns {Date}
 */
export function getCurrentISTDateTime() {
  return new Date(Date.now() + IST_OFFSET_MS);
}

/**
 * Extracts the hour of a given date (defaulting to now) in IST timezone.
 * @param {Date|string|number} [date] - Input date
 * @returns {number} Hour (0 to 23)
 */
export function getISTHour(date) {
  const d = date ? new Date(date) : new Date();
  const istDate = new Date(d.getTime() + IST_OFFSET_MS);
  return istDate.getUTCHours();
}

/**
 * Formats a given date as a 'YYYY-MM-DD' string in IST timezone.
 * @param {Date|string|number} date - Input date
 * @returns {string} e.g. "2026-06-26"
 */
export function formatISTDate(date) {
  const d = new Date(date);
  const istDate = new Date(d.getTime() + IST_OFFSET_MS);
  return istDate.toISOString().split('T')[0];
}

/**
 * Returns a UTC Date object representing 00:00:00.000 IST (start of day) for a given date.
 * @param {Date|string|number} [date] - Input date
 * @returns {Date} UTC Date object
 */
export function getISTDayStart(date) {
  const d = date ? new Date(date) : new Date();
  const istTime = new Date(d.getTime() + IST_OFFSET_MS);
  const startOfISTDayInUTCRep = new Date(Date.UTC(
    istTime.getUTCFullYear(),
    istTime.getUTCMonth(),
    istTime.getUTCDate(),
    0, 0, 0, 0
  ));
  return new Date(startOfISTDayInUTCRep.getTime() - IST_OFFSET_MS);
}

/**
 * Returns a UTC Date object representing 23:59:59.999 IST (end of day) for a given date.
 * @param {Date|string|number} [date] - Input date
 * @returns {Date} UTC Date object
 */
export function getISTDayEnd(date) {
  const d = date ? new Date(date) : new Date();
  const istTime = new Date(d.getTime() + IST_OFFSET_MS);
  const endOfISTDayInUTCRep = new Date(Date.UTC(
    istTime.getUTCFullYear(),
    istTime.getUTCMonth(),
    istTime.getUTCDate(),
    23, 59, 59, 999
  ));
  return new Date(endOfISTDayInUTCRep.getTime() - IST_OFFSET_MS);
}
