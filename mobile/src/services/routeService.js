import { API_BASE_URL } from "../config/api";

/**
 * Fixed demo route request.
 *
 * Note: start_address, end_address, dist, k, and congestion_* are currently
 * ignored by the backend — service.py uses hardcoded values and a file-cached
 * graph. These fields are kept here so the request schema stays valid and the
 * backend can be switched to param-driven mode without frontend changes.
 */
export async function fetchRoutes() {
  const response = await fetch(`${API_BASE_URL}/api/routes/replan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      start_address: "Evergreen, East San Jose, CA",
      end_address: "San Jose Mineta International Airport, San Jose, CA",
      dist: 12000,
      k: 3,
      congestion_start_index: 1,
      congestion_end_index: 4,
      congestion_multiplier: 50,
    }),
  });

  const text = await response.text();

  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    if (!response.ok) {
      throw new Error(`API request failed: ${text}`);
    }
    throw new Error(`Invalid JSON response: ${text}`);
  }

  if (!response.ok) {
    const detail =
      data?.detail ||
      data?.message ||
      `${response.status} ${response.statusText}`;
    throw new Error(`API request failed: ${detail}`);
  }

  return data;
}
