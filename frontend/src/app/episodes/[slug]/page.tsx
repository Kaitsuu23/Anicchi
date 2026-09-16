import Image from "next/image";
import Link from "next/link";
import {
  CaretLeft,
  CaretRight,
  Television,
  Star,
  FilmStrip,
  Sparkle,
  ArrowSquareOut,
  House,
  PlayCircle,
  Images
} from "@phosphor-icons/react/dist/ssr";
import { AnimeCard } from "@/components/anime-card";
import { VideoPlayer } from "./video-player";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getEpisode(slug: string) {
  const url = `https://hentaimama.io/episodes/${slug}/`;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/episode?url=${encodeURIComponent(url)}`, {
      cache: "no-store"
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export default async function EpisodePage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getEpisode(slug);

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 px-4 text-center">
        <div className="rounded-full bg-zinc-900 border border-white/10 p-4 text-zinc-500">
          <Television size={40} weight="duotone" />
        </div>
        <h2 className="text-xl font-bold text-white">Episode Unavailable</h2>
        <p className="max-w-md text-sm text-zinc-400">
          Could not retrieve this episode's stream. Please try again or return to home.
        </p>
        <Link
          href="/"
          className="rounded-xl bg-zinc-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-rose-500"
        >
          Return to Home
        </Link>
      </div>
    );
  }

  const seriesSlug = data.seriesLink
    ? data.seriesLink.replace("https://hentaimama.io/tvshows/", "").replace("/", "")
    : null;

  // Clean series title and episode indicator
  const seriesTitle =
    data.seriesTitle ||
    data.title.split(/ - (?:Episode|\d+)/i)[0]?.trim() ||
    "Series";

  const epMatch = data.title.match(/(?:Episode|\bEP\b)\s*(\d+)/i);
  const currentEpNum = epMatch ? epMatch[1] : null;

  const coverImage = data.seriesCover || data.thumbnail;
  const validScreenshots = (data.screenshots || []).filter(
    (s: string) => s && s.trim().length > 0 && s.startsWith("http")
  );

  return (
    <div className="min-h-screen bg-zinc-950 pb-24 text-zinc-100">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Top Breadcrumb Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4 text-xs font-medium">
          <nav className="flex items-center gap-2 text-zinc-400 flex-wrap">
            <Link href="/" className="flex items-center gap-1 hover:text-white transition-colors">
              <House size={14} />
              <span>Home</span>
            </Link>
            <span className="text-zinc-600">/</span>
            <Link href="/series" className="hover:text-white transition-colors">
              Series
            </Link>
            {seriesSlug && (
              <>
                <span className="text-zinc-600">/</span>
                <Link
                  href={`/tvshows/${seriesSlug}`}
                  className="hover:text-white transition-colors font-semibold max-w-[180px] sm:max-w-xs truncate"
                >
                  {seriesTitle}
                </Link>
              </>
            )}
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-200 font-bold">
              {currentEpNum ? `Episode ${currentEpNum}` : data.title}
            </span>
          </nav>
        </div>

        {/* Video Player Section */}
        <section aria-label="Video Player">
          <VideoPlayer
            srcs={data.playerSrcs || []}
            poster={data.thumbnail}
            title={data.title}
            prevEp={data.prevEp}
            nextEp={data.nextEp}
          />
        </section>

        {/* Main Content & Playlist Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">

          {/* Main Left Stage (8 cols) */}
          <div className="lg:col-span-8 space-y-8">

            {/* Series Overview Spotlight Card */}
            {seriesSlug && (
              <div className="pt-2">
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  {/* Series Cover */}
                  {coverImage && (
                    <Link
                      href={`/tvshows/${seriesSlug}`}
                      className="group relative aspect-[3/4] w-28 sm:w-36 rounded-xl overflow-hidden border border-white/10 shadow-2xl shrink-0 bg-zinc-900"
                    >
                      <Image
                        src={coverImage}
                        alt={seriesTitle}
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 112px, 144px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-black/60 px-2 py-1 rounded-md border border-white/20">
                          View
                        </span>
                      </div>
                    </Link>
                  )}

                  {/* Series Info */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold tracking-widest uppercase text-rose-500">
                        SERIES SPOTLIGHT
                      </span>
                      <Link
                        href={`/tvshows/${seriesSlug}`}
                        className="group flex items-center gap-2"
                      >
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white group-hover:text-rose-400 transition-colors">
                          {seriesTitle}
                        </h2>
                        <ArrowSquareOut size={18} className="text-zinc-500 group-hover:text-rose-400 transition-colors shrink-0" />
                      </Link>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {data.rating && data.studio && (
                        <Link
                          href={`/studio/${data.studio.toLowerCase().replace(/\s+/g, '-')}`}
                          className="inline-flex items-center gap-1 rounded-md bg-zinc-950/80 backdrop-blur-md px-2 py-1 text-xs font-semibold text-zinc-100 border border-white/10 shadow-sm hover:bg-zinc-900 hover:border-white/20 transition-all cursor-pointer"
                        >
                          <Star weight="fill" className="text-yellow-400" size={14} />
                          {data.rating}
                        </Link>
                      )}
                      {data.rating && !data.studio && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-zinc-950/80 backdrop-blur-md px-2 py-1 text-xs font-semibold text-zinc-100 border border-white/10 shadow-sm">
                          <Star weight="fill" className="text-yellow-400" size={14} />
                          {data.rating}
                        </span>
                      )}
                      {data.studio && (
                        <Link
                          href={`/studio/${data.studio.toLowerCase().replace(/\s+/g, '-')}`}
                          className="rounded-md bg-rose-600/10 border border-rose-600/20 px-2.5 py-0.5 font-medium text-rose-400 hover:bg-rose-600/20 hover:border-rose-600/30 hover:text-rose-300 transition-all"
                        >
                          {data.studio}
                        </Link>
                      )}
                      {data.airedOn && (
                        <span className="rounded-md bg-zinc-800 px-2.5 py-0.5 font-medium text-zinc-400 border border-white/5">
                          {data.airedOn}
                        </span>
                      )}
                      {data.episodes?.length > 0 && (
                        <span className="rounded-md bg-zinc-800 px-2.5 py-0.5 font-medium text-zinc-400 border border-white/5">
                          {data.episodes.length} Episodes
                        </span>
                      )}
                    </div>

                    {/* Genre Tags */}
                    {data.genres && data.genres.length > 0 && (
                      <div className="pt-1">
                        <div className="flex flex-wrap gap-1.5">
                          {data.genres.map((g: any, i: number) => (
                            <Link
                              key={i}
                              href={`/genres/${g.slug}`}
                              className="rounded-full bg-zinc-950/80 border border-white/10 px-3 py-1 text-xs font-medium text-zinc-300 hover:text-white hover:border-zinc-500/50 hover:bg-zinc-800 transition-all"
                            >
                              {g.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Sidebar Playlist (4 cols) */}
          <div className="lg:col-span-4">
            {data.episodes && data.episodes.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <PlayCircle size={24} weight="bold" className="text-purple-500" />
                    <h2 className="text-2xl font-bold text-white tracking-tight">Episodes</h2>
                  </div>
                  <span className="text-sm font-medium text-zinc-500">{data.episodes.length} Episodes</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {data.episodes.map((ep: any, idx: number) => {
                    const isActive = ep.link.includes(slug);
                    return (
                      <Link
                        key={idx}
                        href={ep.link.replace("https://hentaimama.io", "")}
                        className={`group relative flex w-full aspect-video overflow-hidden rounded-xl border transition-all ${isActive
                          ? "border-white/80 ring-2 ring-white/20 shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                          : "border-white/10 bg-zinc-900 hover:border-white/20 hover:shadow-lg"
                          }`}
                      >
                        <Image
                          src={ep.thumb || data.thumbnail}
                          alt={`Episode ${ep.epNum}`}
                          fill
                          unoptimized
                          sizes="(max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />

                        <div className={`absolute inset-0 bg-gradient-to-t transition-opacity ${isActive
                          ? "from-zinc-950 via-zinc-950/40 to-transparent opacity-90"
                          : "from-zinc-950 via-zinc-950/20 to-transparent opacity-90 group-hover:opacity-70"
                          }`} />

                        <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          }`}>
                          <PlayCircle size={48} weight="fill" className={`${isActive ? "text-zinc-100" : "text-white"} drop-shadow-md`} />
                        </div>

                        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
                          <span className={`text-xs sm:text-sm font-bold drop-shadow-md ${isActive ? 'text-white' : 'text-white'}`}>
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
                    );
                  })}
                </div>
              </section>
            )}
          </div>

        </div>

        {/* Full-Width Screenshots Showcase */}
        {validScreenshots.length > 0 && (
          <div className="space-y-4 pt-8">
            <div className="flex items-center gap-2">
              <Images size={22} weight="duotone" className="text-purple-500" />
              <h2 className="text-xl font-bold tracking-tight text-white">Previews</h2>
              <span className="ml-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-900 border border-white/10 text-zinc-400">
                {validScreenshots.length} Captures
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {validScreenshots.map((src: string, idx: number) => (
                <div
                  key={idx}
                  className="group relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-md transition-all duration-300 hover:border-white/80/50 hover:shadow-lg"
                >
                  <Image
                    src={src}
                    alt={`Screenshot ${idx + 1}`}
                    fill
                    sizes="(max-width: 640px) 50vw, 20vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-medium text-zinc-300">
                    #{idx + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Similar Titles Section */}
        {data.similarTitles && data.similarTitles.length > 0 && (
          <section className="pt-10 border-t border-white/5 space-y-6">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">You Might Also Like</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
              {data.similarTitles.slice(0, 6).map((video: any, idx: number) => (
                <AnimeCard
                  key={`similar-${idx}`}
                  title={video.title}
                  thumbnail={video.thumbnail}
                  rating={video.rating}
                  link={video.link}
                  badge={video.badge}
                  epBadge={video.epBadge}
                />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
