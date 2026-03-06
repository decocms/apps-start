/**
 * Client-side user/session hook for VTEX.
 *
 * Reads user profile data from the VTEX session API and the
 * VtexIdclientAutCookie to determine login state.
 *
 * @example
 * ```tsx
 * import { useUser } from "@decocms/apps/vtex/hooks/useUser";
 *
 * function UserGreeting() {
 *   const { user, isLoggedIn } = useUser();
 *   if (!isLoggedIn) return <a href="/account">Sign In</a>;
 *   return <span>Hello, {user?.email}</span>;
 * }
 * ```
 */

import { useQuery } from "@tanstack/react-query";

export interface VtexUser {
  email?: string;
  firstName?: string;
  lastName?: string;
  userId?: string;
  isLoggedIn: boolean;
}

const USER_QUERY_KEY = ["vtex", "user"] as const;

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match?.[1] ?? null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

async function fetchUser(): Promise<VtexUser> {
  const authCookie = getCookie("VtexIdclientAutCookie");
  if (!authCookie) return { isLoggedIn: false };

  const payload = decodeJwtPayload(authCookie);
  if (!payload) return { isLoggedIn: false };

  const exp = typeof payload.exp === "number" ? payload.exp : undefined;
  if (exp && exp * 1000 < Date.now()) return { isLoggedIn: false };

  const email = (payload.sub ?? payload.userId) as string | undefined;

  try {
    const res = await fetch("/api/sessions?items=profile.email,profile.firstName,profile.lastName", {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      const profile = data?.namespaces?.profile;
      return {
        email: profile?.email?.value ?? email,
        firstName: profile?.firstName?.value,
        lastName: profile?.lastName?.value,
        userId: email,
        isLoggedIn: true,
      };
    }
  } catch {
    // Fall through to JWT-only data
  }

  return {
    email,
    isLoggedIn: true,
  };
}

export interface UseUserOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useUser(options?: UseUserOptions) {
  const query = useQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: fetchUser,
    staleTime: options?.staleTime ?? 30_000,
    enabled: options?.enabled !== false,
  });

  return {
    user: query.data ?? null,
    isLoggedIn: query.data?.isLoggedIn ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
