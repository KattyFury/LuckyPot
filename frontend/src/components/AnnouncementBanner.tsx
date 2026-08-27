import type { CSSProperties } from "react";

export function AnnouncementBanner({
  text,
  note,
  href,
  onClick,
}: {
  text: string;
  /** Extra text appended after `text`, NOT underlined — for a parenthetical
   *  aside that shouldn't read as part of the clickable prompt itself. */
  note?: string;
  href?: string;
  /** With `href`, runs before the link opens (used to copy the wallet
   *  address). On its own, makes the whole banner a button. */
  onClick?: () => void;
}) {
  const style: CSSProperties = {
    background: "var(--color-banner-bg)",
    color: "#000000",
    borderRadius: "var(--radius)",
    minHeight: "100%",
    width: "100%",
    display: "flex",
    alignItems: "center",
    padding: "12px 20px",
    fontSize: "var(--fs-md)",
    fontWeight: 700,
    whiteSpace: "normal",
    textAlign: "left",
    lineHeight: 1.3,
  };

  // The browser's default <a> underline draws across the whole element
  // regardless of what a descendant span sets - has to be cancelled here,
  // on the element actually drawing it, not just on the "note" span.
  const actionable: CSSProperties = { ...style, textDecoration: "none", cursor: "pointer" };
  const content = (
    <>
      <span style={{ textDecoration: "underline" }}>{text}</span>
      {note && <span style={{ textDecoration: "none" }}> {note}</span>}
    </>
  );

  if (href) {
    // A real anchor so the whole box behaves like a link (middle-click, open
    // in a new tab); onClick only does the copy on its way out.
    return (
      <a href={href} target="_blank" rel="noreferrer" onClick={onClick} style={actionable}>
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} style={actionable}>
        {content}
      </button>
    );
  }

  return <div style={style}>{text}</div>;
}
