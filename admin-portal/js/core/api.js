import { API } from "./config.js";
import { getToken } from "./auth.js";
import { showLoading, hideLoading } from "../components/loading.js";

export function isAuthError(err) {
  if (!err) return false;
  if (err.status === 401) return true;
  if (err.status === 403) {
    const msg = String(err.message || "").toLowerCase();
    return msg.includes("token") || msg.includes("disabled") || msg.includes("credentials");
  }
  return false;
}

export async function api(method, path, body, opts = {}) {
  const { silent = false, loadingText = "Loading…" } = opts;
  if (!silent) showLoading(loadingText);
  try {
    const headers = { "Content-Type": "application/json" };
    if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
    const fetchOpts = { method, headers, body: body ? JSON.stringify(body) : null };
    let res;
    try {
      res = await fetch(`${API}${path}`, fetchOpts);
    } catch (_) {
      throw new Error("Server unreachable — check that Dirshay Bus backend is running, then try again.");
    }
    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (_) {}
    }
    if (!res.ok) {
      const err = new Error(data?.detail || "Request failed");
      err.status = res.status;
      throw err;
    }
    return data;
  } finally {
    if (!silent) hideLoading();
  }
}
