import Image from 'next/image';
import Link from 'next/link';

interface AgentCardProps {
  slug: string;
  name: string;
  title: string;
  latestImage?: string;
  pieceCount: number;
  palette?: string[];
}

export default function AgentCard({
  slug,
  name,
  title,
  latestImage,
  pieceCount,
  palette,
}: AgentCardProps) {
  return (
    <Link
      href={`/${slug}`}
      className="bg-zinc-950 border border-zinc-800 rounded overflow-hidden hover:border-zinc-600 transition-colors group block"
    >
      <div className="relative aspect-square bg-zinc-900">
        {latestImage ? (
          <Image
            src={latestImage}
            alt={title}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-700 text-xs">
            Coming soon
          </div>
        )}
      </div>
      <div className="p-3 space-y-1.5">
        <h3 className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors truncate">
          {title}
        </h3>
        <p className="text-xs text-zinc-500">
          by {name} · {pieceCount} piece{pieceCount !== 1 ? 's' : ''}
        </p>
        {palette && palette.length > 0 && (
          <div className="flex gap-1 pt-1">
            {palette.map((color: string, i: number) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
