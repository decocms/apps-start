/**
 * Node.js-compatible cookie helpers.
 * Replaces Deno's std/http/cookie.ts.
 */

export function getCookies(headers: Headers): Record<string, string> {
  const cookieHeader = headers.get("cookie") || "";
  const cookies: Record<string, string> = {};
  for (const pair of cookieHeader.split(";")) {
    const [key, ...rest] = pair.trim().split("=");
    if (key) {
      cookies[key.trim()] = decodeURIComponent(rest.join("=").trim());
    }
  }
  return cookies;
}

export function setCookie(
  headers: Headers,
  options: {
    name: string;
    value: string;
    path?: string;
    expires?: Date;
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
  }
) {
  const parts = [`${options.name}=${encodeURIComponent(options.value)}`];
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);

  headers.append("Set-Cookie", parts.join("; "));
}
