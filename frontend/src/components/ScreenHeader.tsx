export function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button onClick={onBack} style={{ background: "none", fontSize: "var(--fs-4)", color: "var(--color-text)" }}>
        <span className="icon icon-back" />
      </button>
      <span style={{ fontSize: "var(--fs-2)", fontWeight: 700, color: "var(--color-primary)" }}>{title}</span>
    </div>
  );
}
