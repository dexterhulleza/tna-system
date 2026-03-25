export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
// This works correctly on any domain: dev preview, tna1.net, or custom domains.
export const getLoginUrl = (returnPath?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  // Use the current page's origin so the callback always returns to the right domain.
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  // IMPORTANT: The SDK's decodeState() does a plain atob(state), so state MUST be
  // btoa(redirectUri) — a plain base64 string, NOT a JSON-encoded object.
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
