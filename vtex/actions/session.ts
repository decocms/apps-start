/**
 * VTEX Sessions API actions.
 * All session-mutating actions return Set-Cookie headers for propagation.
 */
import { vtexFetchWithCookies, vtexIOGraphQL, getVtexConfig } from "../client";
import type { VtexFetchResult } from "../client";
import { buildAuthCookieHeader } from "../utils/vtexId";

// ---------------------------------------------------------------------------
// createSession
// ---------------------------------------------------------------------------

export interface SessionData {
  id: string;
  namespaces: Record<string, Record<string, { value: string }>>;
}

export async function createSession(
  data: Record<string, any>,
  cookieHeader?: string,
): Promise<VtexFetchResult<SessionData>> {
  const headers: Record<string, string> = {};
  if (cookieHeader) headers["cookie"] = cookieHeader;
  return vtexFetchWithCookies<SessionData>("/api/sessions", {
    method: "POST",
    body: JSON.stringify(data),
    headers,
  });
}

// ---------------------------------------------------------------------------
// editSession
// ---------------------------------------------------------------------------

export interface EditSessionResponse {
  id: string;
  namespaces: Record<string, Record<string, { value: string }>>;
}

/**
 * Edit the current VTEX session (public properties).
 * Returns data + Set-Cookie headers.
 */
export async function editSession(
  publicProperties: Record<string, { value: string }>,
  cookieHeader?: string,
): Promise<VtexFetchResult<EditSessionResponse>> {
  const headers: Record<string, string> = {};
  if (cookieHeader) headers["cookie"] = cookieHeader;

  return vtexFetchWithCookies<EditSessionResponse>("/api/sessions", {
    method: "PATCH",
    body: JSON.stringify({ public: { ...publicProperties } }),
    headers,
  });
}

// ---------------------------------------------------------------------------
// deleteSession
// ---------------------------------------------------------------------------

export interface DeleteSessionResponse {
  logOutFromSession: string;
}

const DELETE_SESSION_MUTATION = `mutation LogOutFromSession($sessionId: ID) {
  logOutFromSession(sessionId: $sessionId) @context(provider: "vtex.store-graphql@2.x")
}`;

/**
 * Log out / delete a VTEX session via the store-graphql mutation.
 * Requires a valid auth cookie.
 */
export async function deleteSession(
  sessionId: string,
  authCookie: string,
): Promise<DeleteSessionResponse> {
  if (!authCookie) throw new Error("Auth cookie is required to delete session");
  const { account } = getVtexConfig();
  return vtexIOGraphQL<DeleteSessionResponse>(
    {
      query: DELETE_SESSION_MUTATION,
      variables: { sessionId },
    },
    { cookie: buildAuthCookieHeader(authCookie, account) },
  );
}
