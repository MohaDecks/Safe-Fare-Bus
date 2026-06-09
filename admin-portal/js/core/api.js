import { API } from "./config.js";
import { getToken } from "./auth.js";
import { showLoading, hideLoading } from "../components/loading.js";

export async function api(method, path, body, opts = {}) {
  const { silent = false, loadingText = "Loading…" } = opts;
  if (!silent) showLoading(loadingText);
  try {
    const headers = { "Content-Type": "application/json" };
    if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
    const fetchOpts = { method, headers, body: body ? JSON.stringify(body) : null };
    const res = await fetch(`${API}${path}`, fetchOpts);
    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (_) {}
    }
    if (!res.ok) throw new Error(data?.detail || "Request failed");
    return data;
  } finally {
    if (!silent) hideLoading();
  }
}
