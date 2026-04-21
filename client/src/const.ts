export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Custom auth: always redirect to the local /login page instead of Manus OAuth.
export const getLoginUrl = (returnPath?: string) => {
  if (returnPath) {
    return `/login?returnPath=${encodeURIComponent(returnPath)}`;
  }
  return "/login";
};
