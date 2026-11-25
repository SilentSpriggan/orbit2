import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { EMBEDDED, websiteHref } from "../../../shared/embed";

const LINK_CLASS =
  "inline-flex min-h-11 items-center gap-1.5 self-start rounded-md text-sm font-medium text-accent hover:text-accent-hover";
import { ICON_STROKE } from "../../../shared/ui/cn";
import { Popover } from "../../../shared/ui/Popover";
import type { Citation } from "../types";

export function evidenceHref(c: Citation): string {
  return `/evidence?doc=${encodeURIComponent(c.documentId)}&chunk=${encodeURIComponent(c.chunkId)}`;
}

/** Inline `[n]` marker that opens the cited source. */
export function CitationMarker({ citation }: { citation: Citation }) {
  return (
    <Popover
      label={`Source ${citation.marker}`}
      className="w-[360px] max-w-[calc(100vw-32px)]"
      trigger={(p) => (
        <button
          ref={p.ref}
          type="button"
          onClick={p.onClick}
          aria-expanded={p["aria-expanded"]}
          aria-controls={p["aria-controls"]}
          aria-haspopup="dialog"
          aria-label={`Source ${citation.marker}: ${citation.title}`}
          className="mx-0.5 inline-flex rounded-sm px-0.5 align-baseline font-mono text-2xs font-semibold text-accent hover:text-accent-hover hover:bg-accent-tint"
        >
          [{citation.marker}]
        </button>
      )}
    >
      {() => (
        <div className="flex flex-col gap-3">
          <p className="font-mono text-2xs font-medium uppercase tracking-[0.08em] text-ink-3">Source [{citation.marker}]</p>
          <p className="text-sm font-semibold text-ink">{citation.title}</p>
          <blockquote className="border-l border-line-strong pl-3 text-sm text-ink-2">{citation.excerpt}</blockquote>
          <p className="font-mono text-xs text-ink-3">
            {citation.documentId} · {citation.chunkId}
          </p>
          {EMBEDDED ? (
            // In the website tab, open the website's Evidence library, not this app's placeholder.
            <a href={websiteHref(evidenceHref(citation))} target="_top" className={LINK_CLASS}>
              Open in Evidence library
              <ArrowRight size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
            </a>
          ) : (
            <Link to={evidenceHref(citation)} className={LINK_CLASS}>
              Open in Evidence library
              <ArrowRight size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
    </Popover>
  );
}
