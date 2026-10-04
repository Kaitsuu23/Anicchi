"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FilmStrip } from "@phosphor-icons/react";
import { useState } from "react";
import { SearchModal } from "./search-modal";

export function Navbar() {
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-zinc-950/80 backdrop-blur-md">
        <div className="relative mx-auto max-w-[1440px] flex h-16 items-center justify-between px-6">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <FilmStrip size={28} weight="fill" className="text-zinc-100" />
              <span className="font-bold tracking-tight text-zinc-100 text-lg">Anicchi</span>
            </Link>
          </div>
          
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <nav className="flex items-center gap-8 text-sm font-medium">
              <Link
                href="/"
                className={`transition-colors hover:text-zinc-100 ${pathname === "/" ? "text-zinc-100" : "text-zinc-400"}`}
              >
                Home
              </Link>
              <Link
                href="/series"
                className={`transition-colors hover:text-zinc-100 ${pathname.startsWith("/series") ? "text-zinc-100" : "text-zinc-400"}`}
              >
                Series
              </Link>
              <Link
                href="/hentai-list"
                className={`transition-colors hover:text-zinc-100 ${pathname.startsWith("/hentai-list") ? "text-zinc-100" : "text-zinc-400"}`}
              >
                A-Z List
              </Link>
              <Link
                href="/genres/uncensored"
                className={`transition-colors hover:text-zinc-100 ${pathname.startsWith("/uncensored") ? "text-zinc-100" : "text-zinc-400"}`}
              >
                Uncensored
              </Link>
              <Link
                href="/genres/3d"
                className={`transition-colors hover:text-zinc-100 ${pathname.startsWith("/3d") ? "text-zinc-100" : "text-zinc-400"}`}
              >
                3D
              </Link>
              <Link
                href="/genres"
                className={`transition-colors hover:text-zinc-100 ${pathname.startsWith("/genres") || pathname.startsWith("/studio") || pathname.startsWith("/releases") ? "text-zinc-100" : "text-zinc-400"}`}
              >
                Genre
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-zinc-400 transition-colors hover:text-zinc-100 outline-none"
              title="Search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
                <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"></path>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <SearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </>
  );
}
