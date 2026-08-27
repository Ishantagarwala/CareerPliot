import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/seo";

export const alt = `${SITE_NAME} — AI career planning for students`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// LM Zero OG: dark blue-black canvas, near-white ink, teal carries the
// wordmark, mint carries the AI eyebrow. The image belongs to the same
// family as the product.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0b1117",
          color: "#dee3e4",
          padding: "64px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: "#38ab83",
          }}
        >
          <div
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "4px",
              backgroundColor: "#38ab83",
            }}
          />
          AI career guidance · free for students
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
              color: "#23a0a7",
              marginBottom: 24,
            }}
          >
            {SITE_NAME}
          </div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              lineHeight: 1.2,
              maxWidth: 900,
            }}
          >
            AI career discovery, learning roadmaps, courses, jobs & tutoring
          </div>
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: "#8b9398",
          }}
        >
          careerpilot.cc
        </div>
      </div>
    ),
    { ...size }
  );
}
