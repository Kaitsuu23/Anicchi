"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ArrowsOut, CaretLeft, CaretRight, X, Images } from "@phosphor-icons/react";

interface ScreenshotGalleryProps {
  screenshots: string[];
  title?: string;
}

export function ScreenshotGallery({ screenshots, title }: ScreenshotGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const closeModal = useCallback(() => setSelectedIndex(null), []);

  const showNext = useCallback(() => {
    setSelectedIndex((prev) => (prev !== null ? (prev + 1) % screenshots.length : null));
  }, [screenshots.length]);

  const showPrev = useCallback(() => {
    setSelectedIndex((prev) => (prev !== null ? (prev - 1 + screenshots.length) % screenshots.length : null));
  }, [screenshots.length]);

  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowRight") showNext();
      if (e.key === "ArrowLeft") showPrev();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, closeModal, showNext, showPrev]);

  if (!screenshots || screenshots.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Images size={22} weight="duotone" className="text-rose-500" />
          <h2 className="text-lg font-bold tracking-tight text-white">Previews</h2>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-900 border border-white/10 text-zinc-400">
          {screenshots.length} Captures
        </span>
      </div>

      {/* Screenshots Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {screenshots.map((src, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setSelectedIndex(idx)}
            className="group relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-md transition-all duration-300 hover:border-rose-500/50 hover:shadow-rose-500/10 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-left"
          >
            <Image
              src={src}
              alt={`${title || "Episode"} screenshot ${idx + 1}`}
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Subtle Gradient & Hover Indicator */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-950/80 backdrop-blur-md border border-white/20 text-xs font-semibold text-white shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
                <ArrowsOut size={14} weight="bold" />
                <span>Expand</span>
              </div>
            </div>
            <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-medium text-zinc-300">
              #{idx + 1}
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Backdrop click to close */}
          <div className="absolute inset-0" onClick={closeModal} />

          {/* Top Bar */}
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-zinc-900/90 border border-white/10 px-3.5 py-1.5 text-xs font-medium text-zinc-200 backdrop-blur-md">
              <span>{title || "Screenshot"}</span>
              <span className="text-zinc-500">•</span>
              <span className="text-rose-400 font-bold">
                {selectedIndex + 1} / {screenshots.length}
              </span>
            </div>

            <button
              onClick={closeModal}
              className="pointer-events-auto p-2 rounded-full bg-zinc-900/90 border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors backdrop-blur-md"
              aria-label="Close lightbox"
            >
              <X size={20} weight="bold" />
            </button>
          </div>

          {/* Navigation Controls */}
          {screenshots.length > 1 && (
            <>
              <button
                onClick={showPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-zinc-900/80 border border-white/10 text-white hover:bg-zinc-800 hover:scale-105 transition-all shadow-xl backdrop-blur-md"
                aria-label="Previous screenshot"
              >
                <CaretLeft size={24} weight="bold" />
              </button>
              <button
                onClick={showNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-zinc-900/80 border border-white/10 text-white hover:bg-zinc-800 hover:scale-105 transition-all shadow-xl backdrop-blur-md"
                aria-label="Next screenshot"
              >
                <CaretRight size={24} weight="bold" />
              </button>
            </>
          )}

          {/* Main Image */}
          <div className="relative z-10 w-full max-w-5xl aspect-video max-h-[80vh] overflow-hidden rounded-2xl border border-white/15 shadow-2xl">
            <Image
              src={screenshots[selectedIndex]}
              alt={`Screenshot ${selectedIndex + 1}`}
              fill
              sizes="100vw"
              priority
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
