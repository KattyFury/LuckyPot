import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Shared popup shell — header on row 1, content from row 2 down (spec §5).
 *
 * Rendered via a portal into document.body: every caller places this inside a
 * `display: grid` box (the dashboard grid, or a card's own row grid), and a
 * `position: fixed` element that's a direct child of a grid container gets
 * positioned relative to that grid's area instead of the viewport — the
 * backdrop would shrink to the size of the box it was opened from, and
 * clicking outside it (but still on-screen) wouldn't register as "outside".
 * Escaping the grid via a portal is what makes the backdrop actually cover
 * the full screen.
 */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>{title}</span>
          <button onClick={onClose} style={{ background: "none", padding: 0, lineHeight: 0 }}>
            <span className="icon icon-x" style={{ fontSize: "var(--fs-1)" }} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
