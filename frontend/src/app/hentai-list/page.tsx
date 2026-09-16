import Link from "next/link";

export const metadata = {
  title: 'Hentai List A-Z',
};

async function getHentaiList() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/hentai-list`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Failed to fetch hentai list", error);
    return null;
  }
}

export default async function HentaiListPage() {
  const result = await getHentaiList();
  const groups = result?.data || [];

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-100 mb-8">
        Hentai List A-Z
      </h1>

      {/* Quick Jump Navigation */}
      <div className="flex flex-wrap gap-2 mb-12 bg-zinc-900/50 p-4 rounded-xl border border-white/5 backdrop-blur-sm sticky top-20 z-40">
        {groups.map((group: any) => (
          <a
            key={`nav-${group.letter}`}
            href={`#letter-${group.letter === '#' ? 'hash' : group.letter}`}
            className="flex h-8 w-8 items-center justify-center rounded bg-zinc-800 text-sm font-bold text-zinc-300 transition-colors hover:bg-zinc-600 hover:text-white"
          >
            {group.letter}
          </a>
        ))}
      </div>

      {/* Lists grouped by letter */}
      {groups.length > 0 ? (
        <div className="space-y-12">
          {groups.map((group: any, idx: number) => {
            if (!group.items || group.items.length === 0) return null;
            
            return (
              <section key={idx} id={`letter-${group.letter === '#' ? 'hash' : group.letter}`} className="scroll-mt-36">
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="text-3xl font-black text-zinc-100">{group.letter}</h2>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {group.items.map((item: any, i: number) => {
                    const slug = item.link ? item.link.replace("https://hentaimama.io", "") : "#";
                    return (
                      <Link
                        key={i}
                        href={slug}
                        className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors line-clamp-1"
                      >
                        {item.title}
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center text-zinc-500">
          <p>No list found.</p>
        </div>
      )}
    </div>
  );
}
