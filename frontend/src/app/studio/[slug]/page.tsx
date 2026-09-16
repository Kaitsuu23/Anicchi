import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { AnimeCard } from "@/components/anime-card";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const validFilters = ['recent', 'rating', 'alphabet', 'weekly', 'monthly', 'alltime'];

async function getStudioDetail(slug: string, page: number, filter: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/studio/${slug}?page=${page}&filter=${filter}`, {
      next: { revalidate: 300 }
    });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Failed to fetch studio detail", error);
    return null;
  }
}

function formatTitle(slug: string) {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default async function StudioDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const pageStr = typeof sp.page === 'string' ? sp.page : '1';
  const page = parseInt(pageStr, 10) || 1;
  
  const filterRaw = typeof sp.filter === 'string' ? sp.filter : 'alltime';
  const filter = validFilters.includes(filterRaw) ? filterRaw : 'alltime';

  const result = await getStudioDetail(slug, page, filter);
  const videos = result?.data?.videos || [];
  const lastPage = result?.data?.lastPage || 1;
  
  const title = formatTitle(slug);

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Studio: {title}
        </h1>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-zinc-100 mr-1">Sort by:</span>
            
            {/* Sort by Segmented Control */}
            <div className="flex items-center rounded-md border border-white/10 bg-zinc-900/30 overflow-hidden">
              <Link
                href={`/studio/${slug}?filter=recent&page=1`}
                className={`px-4 py-2 text-sm font-medium border-r border-white/10 transition-colors ${
                  filter === "recent" 
                    ? "bg-zinc-700/80 text-zinc-100 shadow-sm" 
                    : "text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                Recent
              </Link>

              <Link
                href={`/studio/${slug}?filter=rating&page=1`}
                className={`px-4 py-2 text-sm font-medium border-r border-white/10 transition-colors ${
                  filter === "rating" 
                    ? "bg-zinc-700/80 text-zinc-100 shadow-sm" 
                    : "text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                Rating
              </Link>

              <Link
                href={`/studio/${slug}?filter=alphabet&page=1`}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  filter === "alphabet" 
                    ? "bg-zinc-700/80 text-zinc-100 shadow-sm" 
                    : "text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                A-Z
              </Link>
            </div>

            {/* Views Segmented Control */}
            <div className="flex items-center rounded-md border border-white/10 bg-zinc-900/30 overflow-hidden ml-2">
              <div className="px-4 py-2 text-sm font-medium text-zinc-400 bg-zinc-900/50 border-r border-white/10">
                Views:
              </div>
              <Link
                href={`/studio/${slug}?filter=weekly&page=1`}
                className={`px-4 py-2 text-sm font-medium border-r border-white/10 transition-colors ${
                  filter === "weekly" 
                    ? "bg-zinc-700/80 text-zinc-100 shadow-sm" 
                    : "text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                Week
              </Link>
              <Link
                href={`/studio/${slug}?filter=monthly&page=1`}
                className={`px-4 py-2 text-sm font-medium border-r border-white/10 transition-colors ${
                  filter === "monthly" 
                    ? "bg-zinc-700/80 text-zinc-100 shadow-sm" 
                    : "text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                Month
              </Link>
              <Link
                href={`/studio/${slug}?filter=alltime&page=1`}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  filter === "alltime" 
                    ? "bg-zinc-700/80 text-zinc-100 shadow-sm" 
                    : "text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                All Time
              </Link>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border border-white/10 bg-zinc-900 overflow-hidden">
              <Link
                href={`/studio/${slug}?filter=${filter}&page=${Math.max(1, page - 1)}`}
                className={`p-2 transition-colors ${page <= 1 ? 'opacity-50 pointer-events-none' : 'hover:bg-zinc-800'}`}
              >
                <CaretLeft size={16} weight="bold" className="text-zinc-300" />
              </Link>
              <div className="px-4 py-2 text-sm font-medium border-x border-white/10 text-zinc-300 bg-zinc-800/50">
                {page} / {lastPage}
              </div>
              <Link
                href={`/studio/${slug}?filter=${filter}&page=${Math.min(lastPage, page + 1)}`}
                className={`p-2 transition-colors ${page >= lastPage ? 'opacity-50 pointer-events-none' : 'hover:bg-zinc-800'}`}
              >
                <CaretRight size={16} weight="bold" className="text-zinc-300" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      {videos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 gap-y-10">
          {videos.map((video: any, idx: number) => (
            <AnimeCard
              key={idx}
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
          <p>No videos found for this studio.</p>
        </div>
      )}
    </div>
  );
}
