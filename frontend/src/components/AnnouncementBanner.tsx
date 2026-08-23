import type { CSSProperties } from "react";

export function AnnouncementBanner({
  text,
  href,
  onClick,
}: {
  text: string;
  href?: string;
  /** Runs before the link opens — used to copy the wallet address. */
  onClick?: () => void;
}) {
  const style: CSSProperties = {
    background: "var(--color-banner-bg)",
    color: "#000000",
    borderRadius: "var(--radius)",
    height: "100%",
    display: "flex",
    alignItems: "center",
    padding: "0 20px",
    fontSize: "var(--fs-4)",
    fontWeight: 700,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  if (href) {
    // Kept as a real anchor so the whole box is a link (middle-click, open in
    // new tab); onClick only does the copy on its way out.
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        onClick={onClick}
        style={{ ...style, color: "#000000", textDecoration: "underline" }}
      >
        {text}
      </a>
    );
  }

  return <div style={style}>{text}</div>;
}
