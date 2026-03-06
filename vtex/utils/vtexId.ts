/**
 * VTEX authentication cookie parser.
 *
 * Parses the VtexIdclientAutCookie JWT to detect login state
 * without making API calls. Only decodes the payload (no signature
 * verification -- we only need presence and expiry, not auth).
 */

export interface VtexAuthInfo {
  isLoggedIn: boolean;
  email?: string;
  account?: string;
  /** Unix timestamp (seconds) when the token expires. */
  exp?: number;
  /** Whether the token is expired. */
  isExpired: boolean;
}

const VTEX_AUTH_COOKIE = "VtexIdclientAutCookie";

/**
 * Extract the VtexIdclientAutCookie value from a cookie string.
 */
export function extractVtexAuthCookie(cookieHeader: string): string | null {
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${VTEX_AUTH_COOKIE}=([^;]+)`),
  );
  return match?.[1] ?? null;
}

/**
 * Decode a JWT payload without verification.
 * Only reads the middle segment (claims).
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Parse a VTEX auth cookie token into structured auth info.
 */
export function parseVtexAuthToken(token: string): VtexAuthInfo {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return { isLoggedIn: false, isExpired: true };
  }

  const exp = typeof payload.exp === "number" ? payload.exp : undefined;
  const isExpired = exp != null ? exp * 1000 < Date.now() : false;
  const email =
    typeof payload.sub === "string"
      ? payload.sub
      : typeof payload.userId === "string"
        ? payload.userId
        : undefined;

  const account =
    typeof payload.account === "string" ? payload.account : undefined;

  return {
    isLoggedIn: !isExpired,
    email,
    account,
    exp,
    isExpired,
  };
}

/**
 * Check if a request has a valid (non-expired) VTEX auth cookie.
 */
export function isVtexLoggedIn(request: Request): boolean {
  const cookies = request.headers.get("cookie") ?? "";
  const token = extractVtexAuthCookie(cookies);
  if (!token) return false;
  return parseVtexAuthToken(token).isLoggedIn;
}

export { VTEX_AUTH_COOKIE };
