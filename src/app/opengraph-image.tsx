import { ImageResponse } from "next/og";

// Branded social card via next/og (no extra dependency). Rendered with the
// default Node runtime so Next can statically generate the PNG at build time.
// Hex colours mirror the "analytical instrument" theme — Satori does not support
// oklch, so the tokens are translated to their nearest sRGB here.
export const alt = "OddsLens — football odds tracker with no-vig value flags";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#12151b";
const FG = "#f4f6fa";
const MUTED = "#8b94a3";
const AZURE = "#4aa8e8";
const BORDER = "rgba(255,255,255,0.10)";
const GREEN = "#34d399";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: BG,
          backgroundImage: `radial-gradient(900px 500px at 50% -160px, rgba(74,168,232,0.14), transparent 70%)`,
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: -0.5,
              color: FG,
            }}
          >
            Odds<span style={{ color: AZURE }}>Lens</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              color: MUTED,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            Football odds tracker
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              display: "flex",
              fontSize: 62,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -1.5,
              color: FG,
              maxWidth: 900,
            }}
          >
            Bookmaker odds, de-vigged into consensus fair value.
          </div>
          <div style={{ display: "flex", fontSize: 26, color: MUTED }}>
            Snapshotted every 3 hours · no-vig probabilities ·{" "}
            <span style={{ color: GREEN, marginLeft: 8 }}>value flags</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: `1px solid ${BORDER}`,
            paddingTop: 26,
            fontSize: 22,
            color: MUTED,
          }}
        >
          <div style={{ display: "flex" }}>
            Next.js · Postgres · The Odds API
          </div>
          <div style={{ display: "flex" }}>Educational — not betting advice</div>
        </div>
      </div>
    ),
    size,
  );
}
