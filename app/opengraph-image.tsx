import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/seo";

export const alt = `${SITE_NAME} — AI career planning for students`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Warm Focus OG: dark-green canvas, off-white ink, green carries the
// wordmark, amber carries the AI eyebrow. No block borders, no periwinkle —
// the image now belongs to the same family as the product.
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
          backgroundColor: "#191d10",
          color: "#f4f6e8",
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
            color: "#e9a23b",
          }}
        >
          <div
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "4px",
              backgroundColor: "#e9a23b",
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
              color: "#5fb86b",
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
            color: "#c3caac",
          }}
        >
          careerpilot.cc
        </div>
      </div>
    ),
    { ...size }
  );
}
