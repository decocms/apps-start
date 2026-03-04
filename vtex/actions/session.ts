/**
 * VTEX Sessions API actions.
 */
import { vtexFetch } from "../client";

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
