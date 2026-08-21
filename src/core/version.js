/**
 * Orbit — version (single source of truth)
 *
 * This is the ONLY place the runtime version string is authored.
 * scripts/check-version.mjs enforces that it matches package.json
 * "version" and that dist/orbit.js + key docs carry the same number.
 */

export const VERSION = "0.4.0";
