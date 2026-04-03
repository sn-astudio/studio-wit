"use client";

import { useCallback, useRef, useState } from "react";
import NextImage from "next/image";
import {
  Film,
  Heart,
  ImageIcon,
  MessageCircle,
  Play,
} from "lucide-react";
import { Link } from "@/i18n/routing";

import type { GalleryCardProps } from "./types";
import { getAspectStyle, formatTimeAgo } from "./utils";

export function GalleryCard({ item }: GalleryCardProps) {
  const isVideo = item.type === "video";
  const [hovering, setHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (!isVideo) return;
    setHovering(true);
    videoRef.current?.play().catch(() => {});
  }, [isVideo]);

  const handleMouseLeave = useCallback(() => {
    setHovering(false);
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  }, []);

  const timeAgo = formatTimeAgo(item.created_at);
  const aspectStyle = getAspectStyle(item.aspect_ratio);

  return (
    <Link href={`/gallery/${item.id}`}>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ aspectRatio: aspectStyle }}
        className="group relative w-full cursor-pointer overflow-hidden rounded-xl border border-zinc-200/60 bg-zinc-100/60 transition-all hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800/60 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
      >
        {/* Media */}
        {isVideo && item.result_url && (
          <video
            ref={videoRef}
            src={item.result_url}
            poster={item.thumbnail_url ?? undefined}
            preload="metadata"
            className="absolute inset-0 size-full object-cover"
            muted
            loop
            playsInline
          />
        )}
        {!isVideo && item.result_url && (
          <NextImage
            src={item.result_url}
            alt={item.prompt}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        )}

        {/* Video play icon */}
        {isVideo && !hovering && !item.thumbnail_url && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="size-5 text-zinc-400 dark:text-zinc-600" />
          </div>
        )}

        {/* Type badge */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          {isVideo ? <Film className="size-3" /> : <ImageIcon className="size-3" />}
          {item.type}
        </div>

        {/* Stats (always visible on mobile, hover on desktop) */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
          <span className="flex items-center gap-0.5 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm">
            <Heart className="size-3" />
            {item.like_count}
          </span>
          <span className="flex items-center gap-0.5 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm">
            <MessageCircle className="size-3" />
            {item.comment_count}
          </span>
        </div>

        {/* Bottom gradient info */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 pt-6 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100">
          <p className="line-clamp-2 text-xs leading-snug text-zinc-200">
            {item.prompt}
          </p>
          <div className="mt-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {item.user.profile_image ? (
                <NextImage
                  src={item.user.profile_image}
                  alt={item.user.name}
                  width={16}
                  height={16}
                  className="rounded-full"
                />
              ) : (
                <div className="flex size-4 items-center justify-center rounded-full bg-zinc-600 text-[8px] font-bold text-white">
                  {item.user.name.charAt(0)}
                </div>
              )}
              <span className="text-[10px] text-zinc-300">{item.user.name}</span>
            </div>
            <span className="text-[10px] text-zinc-400">{timeAgo}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
