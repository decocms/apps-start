/**
 * VTEX Authentication Actions
 *
 * Ported from deco-cx/apps vtex/actions/authentication/*.ts
 * @see https://github.com/deco-cx/apps/tree/main/vtex/actions/authentication
 *
 * Original files:
 *   - startAuthentication.ts
 *   - classicSignIn.ts
 *   - accessKeySignIn.ts
 *   - logout.ts
 *   - refreshToken.ts
 *   - recoveryPassword.ts
 *   - resetPassword.ts
 *   - sendEmailVerification.ts
 */

import { getVtexConfig, vtexFetch } from "../client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthProvider {
  providerName: string;
  className: string;
  expectedContext: unknown[];
}

export interface StartAuthentication {
  authenticationToken: string | null;
  oauthProviders: AuthProvider[];
  showClassicAuthentication: boolean;
  showAccessKeyAuthentication: boolean;
  showPasskeyAuthentication: boolean;
  authCookie: string | null;
  isAuthenticated: boolean;
  selectedProvider: string | null;
  samlProviders: unknown[];
}

export interface AuthResponse {
  authStatus: string | "WrongCredentials" | "BlockedUser" | "Success";
  promptMFA: boolean;
  clientToken: string | null;
  authCookie: { Name: string; Value: string } | null;
  accountAuthCookie: { Name: string; Value: string } | null;
  expiresIn: number;
  userId: string | null;
  phoneNumber: string | null;
  scope: string | null;
}

export interface RefreshTokenResponse {
  status: string;
  userId: string;
  refreshAfter: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FORM_HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
  Accept: "application/json",
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Initiates the VTEX ID authentication flow.
 * Returns available auth methods and a session token that must be forwarded to
 * subsequent sign-in / verification calls.
 */
export async function startAuthentication(options?: {
  callbackUrl?: string;
  returnUrl?: string;
  locale?: string;
  appStart?: boolean;
}): Promise<StartAuthentication> {
  const { account } = getVtexConfig();
  const {
    callbackUrl = "/",
    returnUrl = "/",
    locale = "pt-BR",
    appStart = true,
  } = options ?? {};

  const params = new URLSearchParams({
    locale,
    scope: account,
    appStart: String(appStart),
    callbackUrl,
    returnUrl,
  });

  return vtexFetch<StartAuthentication>(
    `/api/vtexid/pub/authentication/start?${params}`,
  );
}

/**
 * Classic email + password sign-in.
 *
 * Typical flow:
 * 1. Call {@link startAuthentication} to obtain `authenticationToken`.
 * 2. Pass that token here together with the user's credentials.
 */
export async function classicSignIn(
  email: string,
  password: string,
  authenticationToken: string,
): Promise<AuthResponse> {
  const body = new URLSearchParams({ email, password, authenticationToken });

  return vtexFetch<AuthResponse>(
    "/api/vtexid/pub/authentication/classic/validate",
    { method: "POST", body, headers: FORM_HEADERS },
  );
}

/**
 * Passwordless sign-in via email access key.
 *
 * Typical flow:
 * 1. {@link startAuthentication} → get `authenticationToken`.
 * 2. {@link sendEmailVerification} → user receives the access key via email.
 * 3. Pass the access key + same `authenticationToken` here.
 */
export async function accessKeySignIn(
  email: string,
  accessKey: string,
  authenticationToken: string,
): Promise<AuthResponse> {
  const body = new URLSearchParams({
    login: email,
    accessKey,
    authenticationToken,
  });

  return vtexFetch<AuthResponse>(
    "/api/vtexid/pub/authentication/accesskey/validate",
    { method: "POST", body, headers: FORM_HEADERS },
  );
}

/**
 * Logout helper.
 *
 * VTEX has no server-side logout endpoint — authentication is invalidated by
 * clearing the session cookies on the client. This function returns the cookie
 * name prefixes the caller must expire (set `Max-Age=0`).
 */
export function logout(): { cookiesToClear: string[] } {
  return { cookiesToClear: ["VtexIdclientAutCookie", "vid_rt"] };
}

/**
 * Refreshes the VTEX auth token using existing session cookies.
 *
 * The caller must forward the relevant cookies (`VtexIdclientAutCookie*`,
 * `vid_rt`) as a raw `Cookie` header string.
 */
export async function refreshToken(
  cookieHeader: string,
  fingerprint?: string,
): Promise<RefreshTokenResponse> {
  return vtexFetch<RefreshTokenResponse>(
    "/api/vtexid/refreshtoken/webstore",
    {
      method: "POST",
      body: JSON.stringify({ fingerprint }),
      headers: { cookie: cookieHeader },
    },
  );
}

/**
 * Sets a new password using an email access key (password-recovery flow).
 *
 * Typical flow:
 * 1. {@link startAuthentication} → get `authenticationToken`.
 * 2. {@link sendEmailVerification} → user receives the access key via email.
 * 3. Pass access key, new password, and the same `authenticationToken` here.
 */
export async function recoveryPassword(
  email: string,
  newPassword: string,
  accessKey: string,
  authenticationToken: string,
  locale?: string,
): Promise<AuthResponse> {
  const { account } = getVtexConfig();

  const params = new URLSearchParams({
    scope: account,
    locale: locale ?? "pt-BR",
  });

  const body = new URLSearchParams({
    login: email,
    accessKey,
    newPassword,
    authenticationToken,
  });

  return vtexFetch<AuthResponse>(
    `/api/vtexid/pub/authentication/classic/setpassword?${params}`,
    { method: "POST", body, headers: FORM_HEADERS },
  );
}

/**
 * Resets the password for an already-authenticated user (knows current password).
 *
 * Typical flow:
 * 1. {@link startAuthentication} → get `authenticationToken`.
 * 2. Pass current + new password together with the `authenticationToken`.
 */
export async function resetPassword(
  email: string,
  currentPassword: string,
  newPassword: string,
  authenticationToken: string,
  locale?: string,
): Promise<AuthResponse> {
  const { account } = getVtexConfig();

  const params = new URLSearchParams({
    scope: account,
    locale: locale ?? "pt-BR",
  });

  const body = new URLSearchParams({
    login: email,
    currentPassword,
    newPassword,
    authenticationToken,
  });

  return vtexFetch<AuthResponse>(
    `/api/vtexid/pub/authentication/classic/setpassword?${params}`,
    { method: "POST", body, headers: FORM_HEADERS },
  );
}

/**
 * Sends an access-key verification email to the user.
 *
 * Returns `true` on success, `false` on any failure (errors are logged).
 * The caller should hold onto the `authenticationToken` — it is needed for
 * the subsequent {@link accessKeySignIn} or {@link recoveryPassword} call.
 */
export async function sendEmailVerification(
  email: string,
  authenticationToken: string,
  locale?: string,
  parentAppId?: string,
): Promise<boolean> {
  try {
    const body = new URLSearchParams({ authenticationToken, email });
    if (locale) body.append("locale", locale);
    if (parentAppId) body.append("parentAppId", parentAppId);

    const data = await vtexFetch<Record<string, string>>(
      "/api/vtexid/pub/authentication/accesskey/send?deliveryMethod=email",
      { method: "POST", body, headers: FORM_HEADERS },
    );

    if (data?.authStatus === "InvalidToken") {
      throw new Error("Authentication token is invalid");
    }

    return true;
  } catch (error) {
    console.error("[sendEmailVerification]", error);
    return false;
  }
}
