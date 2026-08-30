import { useEffect, useRef, useState } from "react";

export function ScratchCanvas({ onRevealed, children }: { onRevealed: () => void; children: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const { width, height } = container.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#2c2d47";
    ctx.fillRect(0, 0, width, height);
    ctx.font = '600 16px Inter, sans-serif';
    ctx.fillStyle = "#cbcde1";
    ctx.textAlign = "center";
    ctx.fillText("Scratch to reveal", width / 2, height / 2);

    let scratching = false;

    function scratchAt(x: number, y: number) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      // 2x the original 28px radius - scratching a whole card at 28px took too
      // many strokes to clear the 45% reveal threshold below.
      ctx.arc(x, y, 56, 0, Math.PI * 2);
      ctx.fill();
    }

    function checkRevealed() {
      const data = ctx.getImageData(0, 0, width, height).data;
      let cleared = 0;
      for (let i = 3; i < data.length; i += 4 * 20) {
        if (data[i] === 0) cleared++;
      }
      const total = data.length / (4 * 20);
      if (cleared / total > 0.45) {
        setRevealed(true);
        onRevealed();
      }
    }

    function pos(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function onDown(e: PointerEvent) {
      scratching = true;
      const { x, y } = pos(e);
      scratchAt(x, y);
    }
    function onMove(e: PointerEvent) {
      if (!scratching) return;
      const { x, y } = pos(e);
      scratchAt(x, y);
      checkRevealed();
    }
    function onUp() {
      scratching = false;
      checkRevealed();
    }

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: 260 }}>
      <div style={{ position: "absolute", inset: 0 }}>{children}</div>
      {!revealed && (
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, borderRadius: "var(--radius)", touchAction: "none" }}
        />
      )}
    </div>
  );
}
