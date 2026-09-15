import type { ReactNode } from "react";

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
  return (
    <div className="surface-ocean relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 opacity-60">
        <svg viewBox="0 0 1440 320" className="animate-wave h-full w-[200%]" preserveAspectRatio="none" aria-hidden>
          <path
            fill="var(--ocean)"
            fillOpacity="0.5"
            d="M0,192L60,181.3C120,171,240,149,360,160C480,171,600,213,720,213.3C840,213,960,171,1080,154.7C1200,139,1320,149,1380,154.7L1440,160L1440,320L0,320Z"
          />
          <path
            fill="var(--sky)"
            fillOpacity="0.25"
            d="M0,224L60,213.3C120,203,240,181,360,192C480,203,600,245,720,245.3C840,245,960,203,1080,186.7C1200,171,1320,181,1380,186.7L1440,192L1440,320L0,320Z"
          />
        </svg>
      </div>
      <div className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-sky/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 size-96 rounded-full bg-ocean/25 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <img src="/logo-mark.png" alt="" className="size-11 shrink-0" />
          <span className="text-xl font-semibold text-white">Harmonie-dev</span>
        </div>
        <div className="rounded-3xl border border-white/15 bg-white/10 p-7 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-sm text-white/70">{subtitle}</p> : null}
          <div className="mt-6 space-y-4 text-white">{children}</div>
        </div>
        {footer ? <div className="mt-5 text-center text-sm text-white/70">{footer}</div> : null}
      </div>
    </div>
  );
}
