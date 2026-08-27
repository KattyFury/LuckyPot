import type { CSSProperties } from "react";

export function AnnouncementBanner({
  text,
  href,
  onClick,
  flushRight,
}: {
  text: string;
  href?: string;
  /** With `href`, runs before the link opens (used to copy the wallet
   *  address). On its own, makes the whole banner a button. */
  onClick?: () => void;
  /** Squares off the right corners so a sibling (the x3 swap button) can sit
   *  flush against this banner with no visible seam, instead of looking like
   *  two separate pills with a gap. */
  flushRight?: boolean;
}) {
  const style: CSSProperties = {
    background: "var(--color-banner-bg)",
    color: "#000000",
    borderRadius: flushRight ? "var(--radius) 0 0 var(--radius)" : "var(--radius)",
    height: "100%",
    width: "100%",
    display: "flex",
    alignItems: "center",
    padding: "0 20px",
    fontSize: "var(--fs-caption)",
    fontWeight: 700,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textAlign: "left",
  };

  const actionable: CSSProperties = { ...style, textDecoration: "underline", cursor: "pointer" };

  if (href) {
    // A real anchor so the whole box behaves like a link (middle-click, open
    // in a new tab); onClick only does the copy on its way out.
    return (
      <a href={href} target="_blank" rel="noreferrer" onClick={onClick} style={actionable}>
        {text}
      </a>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} style={actionable}>
        {text}
      </button>
    );
  }

  return <div style={style}>{text}</div>;
}
