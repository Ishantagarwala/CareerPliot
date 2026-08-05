import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/seo";

export const alt = `${SITE_NAME} — AI career planning for students`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          border: "12px solid #000",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#88aaee",
          }}
        >
          Free for students
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              lineHeight: 0.95,
              textTransform: "uppercase",
              color: "#88aaee",
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
