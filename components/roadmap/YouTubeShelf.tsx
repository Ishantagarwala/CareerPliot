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
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
          <Video className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate">YouTube for {skillTitle}</span>
        </h3>
        <span className="shrink-0 text-xs text-muted-foreground">
          {videos.length} {videos.length === 1 ? "video" : "videos"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {videos.slice(0, 4).map((vid, idx) => (
          <a
            key={idx}
            href={vid.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="group flex min-w-0 items-start gap-2.5 rounded-xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <span className="truncate text-xs font-medium text-muted-foreground">
                  {vid.channel}
                </span>
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-snug text-foreground">
                {vid.title}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
