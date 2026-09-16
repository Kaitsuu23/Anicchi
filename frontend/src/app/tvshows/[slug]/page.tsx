import Image from "next/image";
import Link from "next/link";
import { Star, PlayCircle, Info, CalendarBlank, Hash } from "@phosphor-icons/react/dist/ssr";
import { AnimeCard } from "@/components/anime-card";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getDetail(slug: string) {
  const url = `https://hentaimama.io/tvshows/${slug}/`;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/detail?url=${encodeURIComponent(url)}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export default async function DetailPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getDetail(slug);

  if (!data) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-zinc-400">
        <p>Anime not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Hero Section */}
      <div className="relative h-[40vh] min-h-[400px] md:h-[60vh] w-full">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={data.thumbnail}
            alt={data.title}
            fill
            sizes="100vw"
            className="object-cover opacity-30 blur-sm scale-110"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
        </div>
        
        {/* Content (can overflow if necessary) */}
        <div className="relative mx-auto flex h-full max-w-[1440px] flex-col justify-end px-6 pb-12 pt-16">
          <div className="flex flex-col md:flex-row gap-8 items-end">
            <div className="w-40 md:w-64 shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-2xl relative aspect-[3/4]">
              <Image
                src={data.thumbnail}
                alt={data.title}
                fill
                sizes="(max-width: 768px) 160px, 256px"
                className="object-cover"
                priority
              />
            </div>
            
            {/* Info */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap gap-2">
                {data.rating && (
                  <div className="flex items-center gap-1 rounded-md bg-yellow-500/20 px-2 py-1 text-sm font-semibold text-yellow-500">
                    <Star weight="fill" />
                    <span>{data.rating}</span>
                  </div>
                )}
                {data.aired && (
                  <div className="flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-1 text-sm font-medium text-zinc-300">
                    <CalendarBlank />
                    <span>{data.aired}</span>
                  </div>
                )}
                {data.studio && (
                  <Link href={`/studio/${typeof data.studio === 'string' ? data.studio.toLowerCase().replace(/[^a-z0-9]+/g, '-') : data.studio.slug}`} className="flex items-center gap-1 rounded-md bg-purple-500/20 px-2 py-1 text-sm font-medium text-purple-400 hover:bg-purple-500/30 transition-colors">
                    <Hash />
                    <span>{typeof data.studio === 'string' ? data.studio : data.studio.name}</span>
                  </Link>
                )}
              </div>
              
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
                {data.title}
              </h1>
              {data.altTitle && data.altTitle !== data.title && (
                <p className="text-lg text-zinc-400 font-medium">{data.altTitle}</p>
              )}
              
              <div className="flex flex-wrap gap-2 pt-2">
                {data.genres?.map((g: any, i: number) => (
                  <Link 
                    key={i} 
                    href={`/genres/${g.slug}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-6 py-8 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Left Column: Synopsis */}
          <div className="lg:col-span-2">
            {data.description && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Info size={24} weight="bold" className="text-purple-400" />
                  <h2 className="text-2xl font-bold text-white tracking-tight">Synopsis</h2>
                </div>
                <p className="text-zinc-400 leading-relaxed max-w-4xl">
                  {data.description}
                </p>
              </section>
            )}
          </div>

          {/* Right Column: Episodes */}
          <div className="lg:col-span-1">
            {data.episodes && data.episodes.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <PlayCircle size={24} weight="bold" className="text-purple-400" />
                    <h2 className="text-2xl font-bold text-white tracking-tight">Episodes</h2>
                  </div>
                  <span className="text-sm font-medium text-zinc-500">{data.episodes.length} Episodes</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-4">
                  {data.episodes.map((ep: any, idx: number) => (
                    <Link
                      key={idx}
                      href={ep.link.replace('https://hentaimama.io', '')}
                      className="group relative flex w-full aspect-video overflow-hidden rounded-xl border border-white/10 bg-zinc-900 transition-all hover:border-white/20 hover:shadow-lg"
                    >
                      <Image
                        src={ep.thumb || data.thumbnail}
                        alt={`Episode ${ep.epNum}`}
                        fill
                        sizes="(max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-90 group-hover:opacity-70 transition-opacity" />
                      
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <PlayCircle size={48} weight="fill" className="text-white drop-shadow-md" />
                      </div>
                      
                      <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
                        <span className="text-xs sm:text-sm font-bold text-white drop-shadow-md">
                          Episode {ep.epNum}
                        </span>
                        {ep.rating && (
                          <div className="flex items-center gap-1 rounded bg-zinc-900/90 backdrop-blur-md px-1.5 py-0.5 text-[10px] sm:text-xs font-bold text-zinc-100 border border-white/10 shadow-sm">
                            <Star weight="fill" size={10} className="text-yellow-400" />
                            {ep.rating}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Related Anime */}
        {data.related && data.related.length > 0 && (
          <section className="pt-8 border-t border-white/10">
            <h2 className="text-2xl font-bold text-white tracking-tight mb-6">You Might Like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 gap-y-10">
              {data.related.slice(0, 12).map((video: any, idx: number) => (
                <AnimeCard
                  key={`related-${idx}`}
                  title={video.title}
                  thumbnail={video.thumbnail}
                  rating={video.rating}
                  link={video.link}
                  badge={video.badge}
                  epBadge={video.epBadge}
                  variant="portrait"
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
