"use client";

import { Play, Video, ExternalLink } from "lucide-react";
import { YouTubeVideoRec } from "@/lib/youtubeHelper";

interface YouTubeShelfProps {
  videos: YouTubeVideoRec[];
  skillTitle: string;
}

export default function YouTubeShelf({ videos, skillTitle }: YouTubeShelfProps) {
  if (!videos || videos.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 min-w-0">
        <h3
          className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 min-w-0"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <Video className="w-3.5 h-3.5 shrink-0 text-foreground" />
          <span className="truncate">YouTube for {skillTitle}</span>
        </h3>
        <span
          className="text-[10px] text-muted-foreground shrink-0"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {videos.length} {videos.length === 1 ? "video" : "videos"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {videos.slice(0, 4).map((vid, idx) => (
          <a
            key={idx}
            href={vid.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="group flex items-start gap-2.5 min-w-0 p-3 border border-border bg-card hover:border-foreground transition-colors"
          >
            <div className="h-9 w-9 shrink-0 border border-border bg-background flex items-center justify-center group-hover:bg-primary group-hover:border-black">
              <Play className="w-3.5 h-3.5 text-foreground fill-foreground ml-0.5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <span
                  className="text-[10px] uppercase tracking-wider text-muted-foreground truncate"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {vid.channel}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5 group-hover:text-foreground" />
              </div>
              <p className="text-xs font-medium text-foreground leading-snug line-clamp-2 mt-0.5">
                {vid.title}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
