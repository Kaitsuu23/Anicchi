import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { AnimeCard } from "@/components/anime-card";

// Next.js 15+ searchParams is a promise
interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getTopRated(tab: string, page: number) {
  try {
    // Assuming Express backend is running on 3000 locally
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/toprated?tab=${tab}&page=${page}`, {
      next: { revalidate: 0 }
    });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Failed to fetch toprated", error);
    return null;
  }
}

async function getHomeRecentlyAdded() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/home`, {
      next: { revalidate: 0 }
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data.find((s: any) => s.section === "Recently Added" || s.section.toLowerCase().includes("recently added")) || null;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch home", error);
    return null;
  }
}

export default async function HomePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const tab = (typeof sp.tab === 'string' ? sp.tab : 'monthly') || 'monthly';
  const pageStr = typeof sp.page === 'string' ? sp.page : '1';
  const page = parseInt(pageStr, 10) || 1;

  const [data, recentlyAdded] = await Promise.all([
    getTopRated(tab, page),
    // Only fetch recently added on the first page to save bandwidth, or fetch it always? 
    // Usually it makes sense on the main landing
    page === 1 ? getHomeRecentlyAdded() : Promise.resolve(null)
  ]);

  const videos = data?.videos || [];

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8">
      {/* Top Rated Section */}
      <div className="mb-16">
        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-lg border border-white/5 bg-zinc-900/50 p-1 backdrop-blur-sm w-fit">
            <Link
              href={`/?tab=monthly&page=1`}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${tab === "monthly"
                ? "bg-zinc-700/80 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
                }`}
            >
              MONTHLY
            </Link>
            <Link
              href={`/?tab=3d&page=1`}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${tab === "3d"
                ? "bg-zinc-700/80 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
                }`}
            >
              3D
            </Link>
            <Link
              href={`/?tab=uncensored&page=1`}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${tab === "uncensored"
                ? "bg-zinc-700/80 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
                }`}
            >
              UNCENSORED
            </Link>
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-2">
            <Link
              href={tab === '3d' ? '/genres/3d?filter=recent' : tab === 'uncensored' ? '/genres/uncensored?filter=recent' : '/monthly'}
              className="rounded-md border border-white/10 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              ALL
            </Link>

            <div className="flex items-center rounded-md border border-white/10 bg-zinc-900 overflow-hidden">
              <Link
                href={`/?tab=${tab}&page=${Math.max(1, page - 1)}`}
                className={`p-2 transition-colors ${page <= 1 ? 'opacity-50 pointer-events-none' : 'hover:bg-zinc-800'}`}
              >
                <CaretLeft size={16} weight="bold" className="text-zinc-300" />
              </Link>
              <div className="px-4 py-2 text-sm font-medium border-x border-white/10 text-zinc-300 bg-zinc-800/50">
                {page}
              </div>
              <Link
                href={`/?tab=${tab}&page=${page + 1}`}
                className="p-2 transition-colors hover:bg-zinc-800"
              >
                <CaretRight size={16} weight="bold" className="text-zinc-300" />
              </Link>
            </div>
          </div>
        </div>

        {/* Grid */}
        {videos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 gap-y-10">
            {videos.map((video: any, idx: number) => (
              <AnimeCard
                key={`top-${idx}`}
                title={video.title}
                thumbnail={video.thumbnail}
                rating={video.rating}
                link={video.link}
                badge={video.badge}
                epBadge={video.epBadge}
                priority={idx < 8}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-zinc-500 flex flex-col items-center justify-center">
            <p>No videos found for this tab.</p>
          </div>
        )}
      </div>

      {/* Recently Added Section */}
      {recentlyAdded && recentlyAdded.videos && recentlyAdded.videos.length > 0 && (
        <div className="pt-8 border-t border-white/10">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold uppercase tracking-wide text-zinc-100">
              {recentlyAdded.section || "Recently Added"}
            </h2>
            {recentlyAdded.seeAll && (
              <Link
                href={recentlyAdded.seeAll.replace('https://hentaimama.io', '')}
                className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-zinc-300 transition-all hover:border-white/20 hover:bg-zinc-800 hover:text-zinc-100"
              >
                See All
                <CaretRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 gap-y-10">
            {recentlyAdded.videos.slice(0, 5).map((video: any, idx: number) => (
              <AnimeCard
                key={`recent-${idx}`}
                title={video.title}
                thumbnail={video.thumbnail}
                rating={video.rating}
                link={video.link}
                badge={video.badge}
                epBadge={video.epBadge}
                variant="landscape"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
