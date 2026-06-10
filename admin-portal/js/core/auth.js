import { TOKEN_KEY } from "./config.js";

const REMEMBER_KEY = "sf_remember";

export const getToken = () => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

export const isRemembered = () => localStorage.getItem(REMEMBER_KEY) === "1";

export const setToken = (t, remember = true) => {
  if (!t) {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    return;
  }
  if (remember) {
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(REMEMBER_KEY, "1");
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, t);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REMEMBER_KEY);
  }
};

export const clearToken = () => setToken(null);
