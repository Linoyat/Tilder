/**
 * App config. For production, set REACT_APP_API_URL in your build environment.
 */
export const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:5050';

export const GOOGLE_MAPS_API_KEY =
  process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
