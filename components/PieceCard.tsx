import Image from 'next/image';
import Link from 'next/link';

interface PieceCardProps {
  tokenId: number;
  dayNumber: number;
  date: string;
  ipfsImage: string;
  priceEth: string;
  sold: boolean;
  palette: string[];
  paletteName?: string;
}

export default function PieceCard({
  tokenId,
  dayNumber,
  date,
  ipfsImage,
  priceEth,
  sold,
  palette,
}: PieceCardProps) {
  return (
    <Link
      href={`/gallery/${tokenId}`}
      className="bg-zinc-950 border border-zinc-800 rounded overflow-hidden hover:border-zinc-600 transition-colors group block"
    >
      <div className="relative aspect-square bg-zinc-900">
        <Image
          src={ipfsImage || '/api/today'}
          alt={`Day ${dayNumber}`}
          fill
          className="object-cover"
          unoptimized
        />
        {!sold && (
          <span className="absolute top-2 right-2 text-[10px] bg-yellow-900/80 text-yellow-300 px-1.5 py-0.5 rounded font-bold tracking-wider">
            UNCLAIMED
          </span>
        )}
      </div>
      <div className="p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">Day {dayNumber}</span>
          {sold ? (
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">sold</span>
          ) : (
            <span className="text-xs bg-purple-950 text-purple-300 px-2 py-0.5 rounded">
              {priceEth} ETH
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-600">
          {new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
        <div className="flex gap-1 pt-1">
          {palette.map((color: string, i: number) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </Link>
  );
}
