import { getToken } from "./core/auth.js";
import { restoreSession, applySessionUser } from "./core/session.js";
import { hideBootSplash } from "./core/brand.js";
import { initNavigation } from "./shell/navigation.js";
import { renderAuth } from "./pages/auth/login.js";
import { renderApp, loadView } from "./shell/app.js";

initNavigation({ renderApp, loadView, renderAuth });

async function boot() {
  const token = getToken();
  if (!token) {
    renderAuth();
    return;
  }

  const result = await restoreSession();
  if (result.ok) {
    applySessionUser(result.user);
    renderApp();
    return;
  }

  hideBootSplash();
  renderAuth({
    retry: !result.authFailed,
    message: result.error,
  });
}

boot();
