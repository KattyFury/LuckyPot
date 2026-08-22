export function AnnouncementBanner({ text }: { text: string }) {
  return (
    <div
      style={{
        background: "var(--color-banner-bg)",
        color: "#000000",
        borderRadius: "var(--radius)",
        height: "100%",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        fontSize: "var(--fs-5)",
        fontWeight: 700,
      }}
    >
      {text}
    </div>
  );
}
