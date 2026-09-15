import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";

export function DetailSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  icon,
  footer,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {icon}
            {title}
          </SheetTitle>
          {subtitle ? <SheetDescription>{subtitle}</SheetDescription> : null}
        </SheetHeader>
        <div className="mt-6 space-y-1">{children}</div>
        {footer ? <SheetFooter className="mt-6">{footer}</SheetFooter> : null}
      </SheetContent>
    </Sheet>
  );
}

export function DetailField({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/50 py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value === undefined || value === null || value === "" ? "—" : value}</span>
    </div>
  );
}

export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-5 first:mt-0">
      <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      <div className="rounded-xl border border-border/60 px-3">{children}</div>
    </div>
  );
}
