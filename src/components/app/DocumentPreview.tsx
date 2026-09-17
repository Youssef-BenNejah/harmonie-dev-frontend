import { ExternalLink, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export function isPdfUrl(url: string) {
  return url.toLowerCase().split("?")[0]?.endsWith(".pdf") ?? false;
}

/**
 * Renders an uploaded invoice document inline — an <img> for images, an embedded viewer for PDFs.
 * `isPdf` can be passed explicitly for a local blob: URL (before upload), whose extension can't
 * tell us the type — otherwise it's guessed from the URL's file extension.
 */
export function DocumentPreview({ url, className, isPdf: isPdfProp }: { url: string; className?: string; isPdf?: boolean }) {
  const isPdf = isPdfProp ?? isPdfUrl(url);
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border/60 bg-muted/30", className)}>
      <div className="flex items-center justify-between border-b border-border/60 bg-background/60 px-3 py-1.5">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <FileText className="size-3.5" /> {isPdf ? "Document PDF" : "Image du document"}
        </span>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs text-ocean hover:underline dark:text-sky"
        >
          Ouvrir <ExternalLink className="size-3" />
        </a>
      </div>
      {isPdf ? (
        <iframe src={url} title="Document" className="h-[420px] w-full" />
      ) : (
        <img src={url} alt="Document" className="max-h-[420px] w-full object-contain" />
      )}
    </div>
  );
}
