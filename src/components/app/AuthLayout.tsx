import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useRedirectIfAuthenticated } from "@/lib/route-guards";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useRedirectIfAuthenticated();
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-sky/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 size-96 rounded-full bg-ice blur-3xl" />

      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
          <img src="/logo-mark.png" alt="" className="size-10 shrink-0" />
          <span className="text-lg font-semibold text-navy">Harmonie-dev</span>
        </Link>
        <div className="rounded-3xl border border-border bg-card p-7 shadow-2xl shadow-ocean/10">
          <h1 className="text-2xl font-semibold text-navy">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p> : null}
          <div className="mt-6 space-y-4">{children}</div>
        </div>
        {footer ? <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </div>
  );
}
