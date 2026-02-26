import { getCookies } from "../shopify/utils/cookies";

const LOGIN_COOKIE = "fbits-login";

export const getUserCookie = (headers: Headers): string | undefined => {
  const cookies = getCookies(headers);

  return cookies[LOGIN_COOKIE];
};
