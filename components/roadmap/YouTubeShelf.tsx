"use client";

import { Play, Video, ExternalLink } from "lucide-react";
import { YouTubeVideoRec } from "@/lib/youtubeHelper";

interface YouTubeShelfProps {
  videos: YouTubeVideoRec[];
  skillTitle: string;
}

export default function YouTubeShelf({ videos }: YouTubeShelfProps) {
  if (!videos || videos.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-border space-y-2">
      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
        <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-red-500">
          <Video className="w-3.5 h-3.5 text-red-500 fill-red-500/20" />
          Recommended YouTube Courses
        </span>
        <span className="text-[10px] opacity-75">Top Channels</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {videos.slice(0, 4).map((vid, idx) => (
          <a
            key={idx}
            href={vid.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="group flex items-start gap-2.5 p-2 bg-secondary/60 hover:bg-secondary border border-border hover:border-red-500/40 transition-all rounded-none"
          >
            <div className="w-7 h-7 rounded-none bg-red-600/10 border border-red-500/30 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
              <Play className="w-3 h-3 text-red-500 fill-red-500 group-hover:text-white group-hover:fill-white ml-0.5" />
            </div>

            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-mono font-bold text-red-400 dark:text-red-400 uppercase tracking-tight truncate">
                  {vid.channel}
                </span>
                <ExternalLink className="w-3 h-3 text-muted-foreground opacity-60 group-hover:opacity-100 shrink-0" />
              </div>
              <p className="text-xs font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {vid.title}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
