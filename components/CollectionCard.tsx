import Image from 'next/image';
import Link from 'next/link';

interface CollectionCardProps {
  slug: string;
  name: string;
  agentName: string;
  image: string;
  supply: number | null;
  mintPrice: string | null;
  onchain: boolean;
  license: string | null;
}

export default function CollectionCard({
  slug,
  name,
  agentName,
  image,
  supply,
  mintPrice,
  onchain,
  license,
}: CollectionCardProps) {
  return (
    <Link
      href={`/collections/${slug}`}
      className="bg-zinc-950 border border-zinc-800 rounded overflow-hidden hover:border-zinc-600 transition-colors group block"
    >
      <div className="relative aspect-square bg-zinc-900">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover"
          unoptimized
        />
      </div>
      <div className="p-3 space-y-1.5">
        <h3 className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors truncate">
          {name}
        </h3>
        <p className="text-xs text-zinc-500">
          by {agentName}
          {supply != null && ` · ${supply} pieces`}
          {mintPrice && ` · ${mintPrice}`}
        </p>
        {(onchain || license) && (
          <div className="flex gap-1.5 pt-1">
            {onchain && (
              <span className="text-[10px] text-emerald-400 border border-emerald-400/30 rounded px-1.5 py-0.5 leading-none">
                ONCHAIN
              </span>
            )}
            {license && (
              <span className="text-[10px] text-zinc-500 border border-zinc-700 rounded px-1.5 py-0.5 leading-none">
                {license}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
