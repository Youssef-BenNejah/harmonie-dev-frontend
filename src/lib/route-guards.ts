// Route auth guards, in two layers:
//
// 1. `requireAuth`/`requireSuperAdmin`/`redirectIfAuthenticated` — for a route's `beforeLoad`.
//    These make client-side (<Link>) navigations redirect instantly, before the destination
//    page ever mounts. But the JWT access token only exists client-side (sessionStorage/
//    localStorage), so on a *hard* navigation (typed URL, refresh, external link) `beforeLoad`
//    runs during SSR with no `window` and can't see it — and the router doesn't re-run it after
//    hydration. So `beforeLoad` alone would let an unauthenticated hard-navigation render the
//    page shell (with every API call then failing 401).
//
// 2. `useAuthGuard`/`useRedirectIfAuthenticated` — React hooks that re-check on every mount,
//    covering that hard-navigation gap. Wired into AdminLayout / AuthLayout so every page that
//    uses them is covered without repeating the check per route.
import { useEffect } from "react";
import { redirect, useNavigate } from "@tanstack/react-router";
import {
  fetchMe,
  getAccessToken,
  getCurrentUser,
  setAccessToken,
  setCurrentUser,
  useCurrentUser,
  type ApiRole,
  type ApiUser,
} from "@/lib/api";

async function resolveUser(): Promise<ApiUser | null> {
  const cached = getCurrentUser();
  if (cached) return cached;
  try {
    const user = await fetchMe();
    setCurrentUser(user);
    return user;
  } catch {
    setAccessToken(null);
    return null;
  }
}

// ---------- beforeLoad (SPA navigations) ----------

export async function requireAuth(): Promise<ApiUser | null> {
  if (typeof window === "undefined") return null;
  if (!getAccessToken()) throw redirect({ to: "/login" });
  const user = await resolveUser();
  if (!user) throw redirect({ to: "/login" });
  return user;
}

export async function requireSuperAdmin(): Promise<ApiUser | null> {
  const user = await requireAuth();
  if (user && user.role !== "ADMIN") throw redirect({ to: "/tableau-de-bord" });
  return user;
}

export async function redirectIfAuthenticated(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!getAccessToken()) return;
  const user = await resolveUser();
  if (user) throw redirect({ to: user.role === "ADMIN" ? "/superadmin" : "/tableau-de-bord" });
}

// ---------- Mount-time hooks (covers hard navigations / page refresh) ----------

/** Use in a protected layout: redirects to /login if there's no session, and to /tableau-de-bord if `requiredRole` doesn't match. */
export function useAuthGuard(requiredRole?: ApiRole) {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();

  useEffect(() => {
    let cancelled = false;
    if (!getAccessToken()) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (getCurrentUser()) return;
    resolveUser().then((user) => {
      if (!cancelled && !user) navigate({ to: "/login", replace: true });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (requiredRole && currentUser && currentUser.role !== requiredRole) {
      navigate({ to: "/tableau-de-bord", replace: true });
    }
  }, [requiredRole, currentUser, navigate]);
}

/** Use in the public auth layout (login, join request, forgot password): sends an already-signed-in user to their home page. */
export function useRedirectIfAuthenticated() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();

  // Kicks off /auth/me once so `currentUser` below gets populated when a token exists but
  // hasn't been resolved yet (e.g. straight after a hard page load).
  useEffect(() => {
    if (getAccessToken() && !getCurrentUser()) {
      resolveUser();
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      navigate({ to: currentUser.role === "ADMIN" ? "/superadmin" : "/tableau-de-bord", replace: true });
    }
  }, [currentUser, navigate]);
}
