export function AnnouncementBanner({ text }: { text: string }) {
  return (
    <div
      style={{
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
      }}
    >
      {text}
    </div>
  );
}
