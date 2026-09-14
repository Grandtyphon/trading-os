"use client";

/**
 * Ambient aurora background — three huge, softly-tinted gradient blobs that
 * drift very slowly behind all content, plus a film-grain overlay.
 * Colors come from the active atmosphere template (--aurora-1/2/3 in
 * globals.css), so every theme template breathes with its own light.
 * Purely decorative: aria-hidden, pointer-events none, print-hidden, and the
 * drift is disabled under prefers-reduced-motion.
 */
export function AuroraBackground() {
  return (
    <div className="aurora-layer" aria-hidden="true">
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
      <div className="aurora-grain" />
    </div>
  );
}
