import Link from "next/link";

async function getGenres() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/genres`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Failed to fetch genres", error);
    return null;
  }
}

function extractSlug(url: string) {
  const parts = url.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

export default async function GenresPage() {
  const data = await getGenres();
  const genres = data?.genres || [];
  const studios = data?.studios || [];
  const years = data?.years || [];

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8">
      {/* Genres Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100 mb-6">Genres</h2>
        {genres.length > 0 ? (
          <div className="flex flex-wrap gap-3 md:gap-4">
            {genres.map((g: any, idx: number) => {
              const slug = g.slug || extractSlug(g.url);
              return (
                <Link
                  key={`genre-${idx}`}
                  href={`/genres/${slug}`}
                  className="group relative flex items-center gap-2 overflow-hidden rounded-lg border border-white/5 bg-zinc-900/50 px-5 py-3 transition-all hover:border-white/20 hover:bg-zinc-800 hover:-translate-y-0.5 hover:shadow-lg backdrop-blur-sm"
                >
                  <span className="text-zinc-600 font-bold group-hover:text-rose-500 transition-colors">#</span>
                  <span className="text-sm font-semibold text-zinc-300 group-hover:text-zinc-100 transition-colors">
                    {g.name}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-zinc-500">No genres found.</p>
        )}
      </section>

      {/* Studios Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100 mb-6">Studios</h2>
        {studios.length > 0 ? (
          <div className="flex flex-wrap gap-3 md:gap-4">
            {studios.map((s: any, idx: number) => {
              // Use slug from backend response, fallback to extracting from URL
              const slug = s.slug || extractSlug(s.url);
              return (
                <Link
                  key={`studio-${idx}`}
                  href={`/studio/${slug}`}
                  className="group relative flex items-center gap-2 overflow-hidden rounded-lg border border-white/5 bg-zinc-900/50 px-5 py-3 transition-all hover:border-white/20 hover:bg-zinc-800 hover:-translate-y-0.5 hover:shadow-lg backdrop-blur-sm"
                >
                  <span className="text-zinc-600 font-bold group-hover:text-blue-500 transition-colors">@</span>
                  <span className="text-sm font-semibold text-zinc-300 group-hover:text-zinc-100 transition-colors">
                    {s.name}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-zinc-500">No studios found.</p>
        )}
      </section>

      {/* Release Years Section */}
      <section>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100 mb-6">Release Years</h2>
        {years.length > 0 ? (
          <div className="flex flex-wrap gap-3 md:gap-4">
            {years.map((y: any, idx: number) => {
              const slug = extractSlug(y.url);
              return (
                <Link
                  key={`year-${idx}`}
                  href={`/releases/${slug}`}
                  className="group relative flex items-center gap-2 overflow-hidden rounded-lg border border-white/5 bg-zinc-900/50 px-5 py-3 transition-all hover:border-white/20 hover:bg-zinc-800 hover:-translate-y-0.5 hover:shadow-lg backdrop-blur-sm"
                >
                  <span className="text-zinc-600 font-bold group-hover:text-green-500 transition-colors">📅</span>
                  <span className="text-sm font-semibold text-zinc-300 group-hover:text-zinc-100 transition-colors">
                    {y.name}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-zinc-500">No release years found.</p>
        )}
      </section>
    </div>
  );
}
