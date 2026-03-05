/**
 * VTEX Sessions API actions.
 */
import { vtexFetch, vtexIOGraphQL } from "../client";

export async function createSession(data: Record<string, any>): Promise<boolean> {
  try {
    await vtexFetch<any>("/api/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return true;
  } catch (e) {
    console.error("[VTEX] Failed to create session:", e);
    return false;
  }
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
 *
 * Ported from `vtex/_to-port/actions/editSession.ts`.
 * Original used `vcs["PATCH /api/sessions"]` + proxySetCookie.
 *
 * @param publicProperties - Key/value map to patch into the session.
 * @param authCookie       - Raw cookie header forwarded for auth.
 */
export async function editSession(
  publicProperties: Record<string, { value: string }>,
  authCookie?: string,
): Promise<EditSessionResponse> {
  const headers: Record<string, string> = {};
  if (authCookie) headers["cookie"] = authCookie;

  return vtexFetch<EditSessionResponse>("/api/sessions", {
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
 *
 * Ported from `vtex/_to-port/actions/deleteSession.ts`.
 * Original used `ctx.io.query(...)` with parseCookie auth.
 *
 * @param sessionId  - Session to delete.
 * @param authCookie - Raw cookie header forwarded for auth.
 */
export async function deleteSession(
  sessionId: string,
  authCookie: string,
): Promise<DeleteSessionResponse> {
  return vtexIOGraphQL<DeleteSessionResponse>(
    {
      query: DELETE_SESSION_MUTATION,
      variables: { sessionId },
    },
    { cookie: authCookie },
  );
}
