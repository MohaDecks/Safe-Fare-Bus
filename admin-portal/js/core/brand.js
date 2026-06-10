import { DEFAULT_LOGO, DEFAULT_BRAND_NAME, DEFAULT_TAGLINE } from "./config.js";

export function resolveLogoUrl(logoUrl) {
  return logoUrl || DEFAULT_LOGO;
}

export function authBrandHtml(branding) {
  const name = branding?.name || DEFAULT_BRAND_NAME;
  const logoSrc = resolveLogoUrl(branding?.logo_url);
  const isDefault = !branding?.logo_url;
  const taglineBlock = isDefault ? "" : `<p class="auth-brand-tagline">${DEFAULT_TAGLINE}</p>`;
  return `
    <img class="auth-brand-logo" src="${logoSrc}" alt="${name}" />
    ${taglineBlock}
    <div class="auth-features">
      <div class="auth-feature">
        <div class="auth-feature-icon">📊</div>
        <div><strong>Admin</strong><br/>Manage buses, staff, and daily reports</div>
      </div>
      <div class="auth-feature">
        <div class="auth-feature-icon">🎫</div>
        <div><strong>Passengers</strong><br/>Register and pay fare on the mobile app</div>
      </div>
    </div>`;
}

export function sidebarBrandHtml(company) {
  const name = company?.name || DEFAULT_BRAND_NAME;
  const logoSrc = resolveLogoUrl(company?.logo_url);
  return `
    <img class="sidebar-brand-logo" src="${logoSrc}" alt="${name}" />
    <span>Staff portal</span>`;
}

export function hideBootSplash() {
  document.getElementById("boot-splash")?.remove();
}
