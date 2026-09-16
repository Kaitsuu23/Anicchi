import Image from "next/image";
import Link from "next/link";
import { Star } from "@phosphor-icons/react/dist/ssr";

interface AnimeCardProps {
  title: string;
  thumbnail: string;
  rating: string;
  link: string;
  badge?: string;
  epBadge?: string;
  priority?: boolean;
  variant?: "portrait" | "landscape";
}

export function AnimeCard({ title, thumbnail, rating, link, badge, epBadge, priority = false, variant = "portrait" }: AnimeCardProps) {
  // Extract slug from the full URL if needed or pass directly
  const href = link ? link.replace("https://hentaimama.io", "") : "#";
  
  return (
    <Link href={href || "#"} className="group block relative w-full h-full">
      <div className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900 transition-all duration-300 group-hover:border-white/20 group-hover:shadow-lg ${variant === "landscape" ? "aspect-video" : "aspect-[3/4]"}`}>
        <Image
          src={thumbnail || "https://picsum.photos/seed/placeholder/300/400"}
          alt={title || "Anime Cover"}
          fill
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Bottom Right Badge (e.g. SUB/UNC) */}
        {badge && (
          <div className="absolute bottom-2 right-2 flex items-center rounded bg-zinc-900/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-100 shadow-sm border border-white/10 z-10">
            {badge}
          </div>
        )}

        {/* Bottom Left Ep Badge (e.g. EP 2) */}
        {epBadge && (
          <div className="absolute bottom-2 left-2 flex items-center rounded bg-zinc-900/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-100 shadow-sm border border-white/10 z-10">
            {epBadge}
          </div>
        )}
        
        {/* Rating Badge */}
        {rating && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-zinc-950/80 backdrop-blur-md px-2 py-1 text-xs font-semibold text-zinc-100 border border-white/10 shadow-sm">
            <Star weight="fill" className="text-yellow-400" size={14} />
            <span>{rating}</span>
          </div>
        )}
        
        {/* Bottom Title Gradient overlay - not specifically in screenshot but good for readability if title is shown inside image */}
      </div>
      
      {/* Title Below Image */}
      <div className="mt-3 px-1">
        <h3 className="line-clamp-2 text-sm font-medium leading-tight text-zinc-300 transition-colors group-hover:text-zinc-100">
          {title}
        </h3>
      </div>
    </Link>
  );
}
