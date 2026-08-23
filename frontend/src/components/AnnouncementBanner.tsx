import type { CSSProperties } from "react";

export function AnnouncementBanner({ text, href }: { text: string; href?: string }) {
  const style: CSSProperties = {
    background: "var(--color-banner-bg)",
    color: "#000000",
    borderRadius: "var(--radius)",
    display: "flex",
    alignItems: "center",
    padding: "16px 20px",
    fontSize: "var(--fs-4)",
    fontWeight: 700,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textDecoration: "none",
  };

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" style={style}>
        {text}
      </a>
    );
  }

  return <div style={style}>{text}</div>;
}
