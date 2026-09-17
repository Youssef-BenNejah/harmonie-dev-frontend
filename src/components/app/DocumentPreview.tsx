import { useState } from "react";
import { ExternalLink, FileText, FileWarning, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"];

function extensionOf(url: string) {
  const clean = url.toLowerCase().split("?")[0] ?? "";
  const dot = clean.lastIndexOf(".");
  return dot === -1 ? "" : clean.slice(dot);
}

export function isPdfUrl(url: string) {
  return extensionOf(url) === ".pdf";
}

/**
 * For a Cloudinary-hosted document, asks Cloudinary to rasterize it to a PNG (first page/artboard)
 * instead of serving the original bytes — this is how a format the browser can't render directly
 * (e.g. a .ai/.psd file someone dropped in) still shows real content instead of a broken icon.
 */
function cloudinaryRasterUrl(url: string): string | null {
  if (!url.includes("res.cloudinary.com")) return null;
  const marker = "/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return `${url.slice(0, idx + marker.length)}f_png,pg_1/${url.slice(idx + marker.length)}`;
}

/**
 * Renders an uploaded invoice document inline, inside the app — never just a link out. An <img>
 * for images, an embedded viewer for PDFs, and for anything else (a non-standard format someone
 * uploaded, like .ai/.psd), a Cloudinary-rasterized PNG so there's still a real preview.
 * `isPdf` can be passed explicitly for a local blob: URL (before upload), whose extension can't
 * tell us the type — otherwise it's guessed from the URL's file extension.
 */
export function DocumentPreview({
  url,
  className,
  isPdf: isPdfProp,
  height = "h-[420px]",
}: {
  url: string;
  className?: string;
  isPdf?: boolean;
  /** Tailwind height class for the preview area (img/iframe). Defaults to h-[420px]. */
  height?: string;
}) {
  const isPdf = isPdfProp ?? isPdfUrl(url);
  const isKnownImage = isPdfProp === false || IMAGE_EXTENSIONS.includes(extensionOf(url));
  const rasterUrl = cloudinaryRasterUrl(url);

  // Known image types load directly; anything else (no recognized extension, e.g. a .ai/.psd
  // someone uploaded) starts straight on the Cloudinary-rasterized PNG since the raw file
  // wouldn't render as an <img> anyway.
  const [imgSrc, setImgSrc] = useState(isKnownImage ? url : (rasterUrl ?? url));
  const [usedFallback, setUsedFallback] = useState(!isKnownImage);
  const [failed, setFailed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const handleImgError = () => {
    if (!usedFallback && rasterUrl) {
      setUsedFallback(true);
      setImgSrc(rasterUrl);
    } else {
      setFailed(true);
    }
  };

  const content = (previewHeight: string) =>
    failed ? (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-xs text-muted-foreground">
        <FileWarning className="size-6" />
        Aperçu indisponible pour ce fichier.
      </div>
    ) : isPdf ? (
      <iframe src={url} title="Document" className={cn("w-full", previewHeight)} onError={() => setFailed(true)} />
    ) : (
      <img
        src={imgSrc}
        alt="Document"
        className={cn("w-full object-contain", previewHeight.replace("h-", "max-h-"))}
        onError={handleImgError}
      />
    );

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border/60 bg-muted/30", className)}>
      <div className="flex items-center justify-between border-b border-border/60 bg-background/60 px-3 py-1.5">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <FileText className="size-3.5" /> {isPdf ? "Document PDF" : "Document"}
        </span>
        <div className="flex items-center gap-3">
          {!failed ? (
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              title="Afficher en plein écran"
              className="flex items-center gap-1 text-xs text-ocean hover:underline dark:text-sky"
            >
              Plein écran <Maximize2 className="size-3" />
            </button>
          ) : null}
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-ocean hover:underline dark:text-sky"
          >
            Ouvrir <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
      {content(height)}

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="flex h-[92vh] w-[95vw] max-w-6xl flex-col gap-2 overflow-hidden p-3">
          <DialogTitle className="sr-only">{isPdf ? "Document PDF" : "Document"}</DialogTitle>
          <div className="flex-1 overflow-auto rounded-lg bg-muted/30">{content("h-full")}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
