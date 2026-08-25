const SWATCHES = [
  { label: "Current — nav-bg", hex: "#2A1550" },
  { label: "Current — accent", hex: "#3D1E70" },
  { label: "Logo purple (reference)", hex: "#3D1D6B" },
  { label: "A — warmer/redder, same depth", hex: "#31114A" },
  { label: "B — warmer/redder, darker", hex: "#280F3D" },
  { label: "C — more saturated, same hue", hex: "#2E0F5C" },
  { label: "D — more saturated + warmer", hex: "#33104F" },
  { label: "E — deeper/near-black purple", hex: "#1E0B38" },
  { label: "F — magenta-leaning", hex: "#3A1052" },
  { label: "G — royal purple, less blue", hex: "#3B1259" },
];

export default function ColorSwatchPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "#000" }}>
      {SWATCHES.map((s) => (
        <div
          key={s.hex}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            height: "90px",
            paddingInline: "24px",
            background: s.hex,
          }}
        >
          <span style={{ fontFamily: "system-ui, sans-serif", fontSize: "14px", fontWeight: 600, color: "#fff", width: "260px" }}>
            {s.label}
          </span>
          <span style={{ fontFamily: "monospace", fontSize: "14px", color: "#fff", opacity: 0.8 }}>{s.hex}</span>
        </div>
      ))}
    </div>
  );
}
