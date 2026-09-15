import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <svg viewBox="0 0 240 90" className="h-20 w-56 text-ocean/50" aria-hidden>
        <path
          d="M0 55 C 30 30, 60 80, 90 55 S 150 30, 180 55 S 240 80, 240 55"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M0 70 C 30 45, 60 95, 90 70 S 150 45, 180 70 S 240 95, 240 70"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.35"
        />
        <circle cx="120" cy="26" r="10" fill="currentColor" opacity="0.25" />
      </svg>
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}
