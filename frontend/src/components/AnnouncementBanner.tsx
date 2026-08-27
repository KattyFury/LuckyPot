import type { CSSProperties } from "react";

export function AnnouncementBanner({
  text,
  lead,
  href,
  onClick,
}: {
  /** The call-to-action phrase — the only part that's underlined. */
  text: string;
  /** Plain context that comes before `text`, read as one flowing sentence
   *  with it — not underlined, since the whole banner is one clickable
   *  region regardless and underlining all of it just reads as noisy. */
  lead?: string;
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
    fontSize: "var(--fs-2)",
    fontWeight: 700,
    whiteSpace: "normal",
    textAlign: "left",
    lineHeight: 1.3,
  };

  // The browser's default <a> underline draws across the whole element
  // regardless of what a descendant span sets - has to be cancelled here,
  // on the element actually drawing it, not just on the "text" span.
  const actionable: CSSProperties = { ...style, textDecoration: "none", cursor: "pointer" };
  // One wrapping span, not two siblings: the outer element is display:flex
  // for vertical centering, and flex treats each direct child (including a
  // bare text node) as its own item that wraps independently - lead and
  // text would end up as two separate columns instead of one flowing
  // sentence. Wrapping them in a single span makes them one flex item, so
  // the text inside reflows normally.
  const content = (
    <span>
      {lead && `${lead} `}
      <span style={{ textDecoration: "underline" }}>{text}</span>
    </span>
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

  return (
    <div style={style}>
      {lead && `${lead} `}
      {text}
    </div>
  );
}
