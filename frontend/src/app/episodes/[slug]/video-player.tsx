"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Artplayer from "artplayer";
import Hls from "hls.js";
import {
  HardDrives,
  CaretLeft,
  CaretRight,
  Sparkle
} from "@phosphor-icons/react";

interface VideoPlayerProps {
  srcs: any[];
  poster?: string;
  title: string;
  prevEp?: string;
  nextEp?: string;
}

export function VideoPlayer({ srcs, poster, title, prevEp, nextEp }: VideoPlayerProps) {
  const [currentSrcIndex, setCurrentSrcIndex] = useState(0);
  const artRef = useRef<HTMLDivElement>(null);
  const artInstanceRef = useRef<any>(null);

  // Gunakan semua source (MP4 dan HLS)
  const validSrcs = srcs;
  const currentSrc = validSrcs[currentSrcIndex];

  // Setup ArtPlayer
  useEffect(() => {
    if (!currentSrc || !artRef.current) return;

    const art = new Artplayer({
      container: artRef.current,
      url: currentSrc.type === "hls" ? currentSrc.src : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${currentSrc.proxySrc}`,
      poster: poster,
      volume: 0.7,
      isLive: false,
      muted: false,
      autoplay: false,
      pip: true,
      autoSize: true,
      autoMini: false, // Disabled auto mini/popup saat scroll
      screenshot: true,
      setting: true,
      loop: false,
      flip: true,
      playbackRate: true,
      aspectRatio: true,
      fullscreen: true,
      fullscreenWeb: true,
      miniProgressBar: true,
      type: currentSrc.type === "hls" || currentSrc.src?.includes(".m3u8") ? "m3u8" : "mp4",
      customType: {
        m3u8: function (video: HTMLVideoElement, url: string, art: any) {
          if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
            art.on('destroy', () => hls.destroy());
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
          } else {
            art.notice.show = 'Unsupported video format: m3u8';
          }
        },
      },
    });

    artInstanceRef.current = art;

    return () => {
      if (artInstanceRef.current) {
        artInstanceRef.current.destroy();
        artInstanceRef.current = null;
      }
    };
  }, [currentSrc, poster]);

  if (!currentSrc) {
    return (
      <div className="w-full bg-zinc-950 rounded-2xl overflow-hidden aspect-video flex flex-col items-center justify-center border border-white/10 text-zinc-400 p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-500">
          <HardDrives size={24} />
        </div>
        <p className="text-base font-semibold text-zinc-200">No compatible video streams detected</p>
        <p className="text-xs text-zinc-500 max-w-sm">
          The video sources might be updating. Try switching servers or refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Cinema Frame with Ambient Glow */}
      <div className="relative group">
        {/* Ambient Backlight */}
        <div className="absolute -inset-1.5 bg-gradient-to-r from-rose-600/15 via-purple-600/10 to-rose-600/15 rounded-3xl blur-2xl opacity-60 pointer-events-none -z-10" />

        {/* Video Player Container */}
        <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <div ref={artRef} className="w-full h-full" />
        </div>
      </div>

      {/* Modern Player Action Bar */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-5 backdrop-blur-md shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Title & HD Status */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              1080p HD
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800/80 border border-white/5 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
              <Sparkle size={12} className="text-amber-400" />
              ArtPlayer
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate">
            {title}
          </h1>
        </div>

        {/* Right: Server Switcher & Navigation */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Server Switcher */}
          {validSrcs.length > 1 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-950/80 p-1 backdrop-blur-sm">
              <div className="flex items-center gap-1 pl-2 pr-1 text-xs font-semibold text-zinc-400">
                <HardDrives size={16} />
                <span className="hidden sm:inline">Mirror:</span>
              </div>
              <div className="flex items-center gap-1">
                {validSrcs.map((src, idx) => {
                  const isActive = idx === currentSrcIndex;
                  const label = src.type === "hls" ? `HLS ${idx + 1}` : `MP4 ${idx + 1}`;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentSrcIndex(idx);
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        isActive
                          ? "bg-rose-600 text-white shadow-md shadow-rose-600/30 font-semibold"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Prev / Next Buttons */}
          <div className="flex items-center gap-1.5">
            <Link
              href={prevEp ? prevEp.replace("https://hentaimama.io", "") : "#"}
              className={`flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold transition-all ${
                prevEp
                  ? "bg-zinc-950/80 text-zinc-200 hover:bg-zinc-800 hover:border-white/20"
                  : "bg-zinc-950/40 text-zinc-600 border-white/5 cursor-not-allowed pointer-events-none"
              }`}
            >
              <CaretLeft size={14} weight="bold" />
              <span>Prev</span>
            </Link>

            <Link
              href={nextEp ? nextEp.replace("https://hentaimama.io", "") : "#"}
              className={`flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold transition-all ${
                nextEp
                  ? "bg-zinc-950/80 text-zinc-200 hover:bg-zinc-800 hover:border-white/20"
                  : "bg-zinc-950/40 text-zinc-600 border-white/5 cursor-not-allowed pointer-events-none"
              }`}
            >
              <span>Next</span>
              <CaretRight size={14} weight="bold" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
