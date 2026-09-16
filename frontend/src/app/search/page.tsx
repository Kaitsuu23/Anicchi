import Link from "next/link";
import { MagnifyingGlass, CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { AnimeCard } from "@/components/anime-card";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getSearchResults(query: string, page: number) {
  if (!query) return null;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/search?q=${encodeURIComponent(query)}&page=${page}`, {
      cache: "no-store", // Search results should not be heavily cached
    });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Failed to fetch search results", error);
    return null;
  }
}

export default async function SearchPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q : '';
  const pageStr = typeof sp.page === 'string' ? sp.page : '1';
  const page = parseInt(pageStr, 10) || 1;

  const result = await getSearchResults(q, page);
  const videos = result?.data?.videos || (Array.isArray(result?.data) ? result.data : []);
  const lastPage = result?.data?.lastPage || 1;

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8">
      {/* Search Header */}
      <div className="mb-12 max-w-2xl mx-auto">
        <form action="/search" method="GET" className="relative">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search for titles..."
            className="w-full rounded-xl border border-white/10 bg-zinc-900/80 py-4 pl-12 pr-4 text-lg font-medium text-zinc-100 placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 backdrop-blur-sm"
          />
          <MagnifyingGlass
            size={24}
            weight="bold"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <button type="submit" className="hidden">Search</button>
        </form>
      </div>

      {q && (
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              Search results for <span className="text-purple-400">"{q}"</span>
            </h1>
          </div>

          {videos.length > 0 && lastPage > 1 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-md border border-white/10 bg-zinc-900 overflow-hidden">
                <Link
                  href={`/search?q=${encodeURIComponent(q)}&page=${Math.max(1, page - 1)}`}
                  className={`p-2 transition-colors ${page <= 1 ? 'opacity-50 pointer-events-none' : 'hover:bg-zinc-800'}`}
                >
                  <CaretLeft size={16} weight="bold" className="text-zinc-300" />
                </Link>
                <div className="px-4 py-2 text-sm font-medium border-x border-white/10 text-zinc-300 bg-zinc-800/50">
                  {page} / {lastPage}
                </div>
                <Link
                  href={`/search?q=${encodeURIComponent(q)}&page=${Math.min(lastPage, page + 1)}`}
                  className={`p-2 transition-colors ${page >= lastPage ? 'opacity-50 pointer-events-none' : 'hover:bg-zinc-800'}`}
                >
                  <CaretRight size={16} weight="bold" className="text-zinc-300" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      {videos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 gap-y-10">
          {videos.map((video: any, idx: number) => (
            <AnimeCard
              key={idx}
              title={video.title}
              thumbnail={video.thumbnail}
              link={video.link}
              rating={video.rating}
              epBadge={video.year} // Use the year as the bottom-left badge
              priority={idx < 8}
            />
          ))}
        </div>
      ) : q ? (
        <div className="py-20 text-center text-zinc-500 flex flex-col items-center justify-center">
          <p>No results found for "{q}".</p>
          <p className="text-sm mt-2">Try checking for typos or using different keywords.</p>
        </div>
      ) : null}
    </div>
  );
}
