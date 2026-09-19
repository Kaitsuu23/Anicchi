import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { AnimeCard } from "@/components/anime-card";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getMonthlyList(page: number) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/monthly?page=${page}`, {
      next: { revalidate: 0 }
    });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Failed to fetch monthly list", error);
    return null;
  }
}

export default async function MonthlyPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const pageStr = typeof sp.page === 'string' ? sp.page : '1';
  const page = parseInt(pageStr, 10) || 1;

  const result = await getMonthlyList(page);
  // Based on the backend, the response structure is { success: true, data: { videos, pages, currentPage, lastPage } }
  const videos = result?.data?.videos || [];
  const lastPage = result?.data?.lastPage || 1;

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Monthly Releases
        </h1>

        {/* Pagination */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-white/10 bg-zinc-900 overflow-hidden">
            <Link
              href={`/monthly?page=${Math.max(1, page - 1)}`}
              className={`p-2 transition-colors ${page <= 1 ? 'opacity-50 pointer-events-none' : 'hover:bg-zinc-800'}`}
            >
              <CaretLeft size={16} weight="bold" className="text-zinc-300" />
            </Link>
            <div className="px-4 py-2 text-sm font-medium border-x border-white/10 text-zinc-300 bg-zinc-800/50">
              {page} / {lastPage}
            </div>
            <Link
              href={`/monthly?page=${Math.min(lastPage, page + 1)}`}
              className={`p-2 transition-colors ${page >= lastPage ? 'opacity-50 pointer-events-none' : 'hover:bg-zinc-800'}`}
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
          <p>No videos found for this page.</p>
        </div>
      )}
    </div>
  );
}
