import type { ReactNode } from "react";

/** Shared popup shell — header on row 1, content from row 2 down (spec §5). */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>{title}</span>
          <button onClick={onClose} style={{ background: "none", fontSize: "var(--fs-4)" }}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
