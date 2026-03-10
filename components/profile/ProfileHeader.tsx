import Image from 'next/image';
import Link from 'next/link';
import type { AgentProfile } from '@/lib/types/agent-profile';
import AgentStatsBar from './AgentStatsBar';
import LivePrice from '@/components/LivePrice';
import AutonomyBadge from '@/components/AutonomyBadge';

interface ProfileHeaderProps {
  profile: AgentProfile;
}

function SocialLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
    >
      {label}
    </a>
  );
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
  const { identity, stats, social, tokenAddress, tokenSymbol } = profile;

  return (
    <div className="space-y-6">
      {/* Avatar + Identity */}
      <div className="flex items-start gap-4">
        <div className="relative w-20 h-20 rounded overflow-hidden border border-zinc-800 bg-zinc-900 flex-shrink-0">
          {identity.avatarUrl ? (
            <Image
              src={identity.avatarUrl}
              alt={identity.name}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-700 text-2xl font-bold">
              {identity.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-white truncate">{identity.name}</h1>
            <AutonomyBadge agentSlug={profile.slug} />
            <Link
              href={`/${profile.slug}`}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Storefront
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-zinc-500">
            {identity.createdBy && <span>Created by {identity.createdBy}</span>}
            {identity.createdBy && identity.runtime && <span>·</span>}
            {identity.runtime && <span>Runtime: {identity.runtime}</span>}
            <span>·</span>
            <span className="capitalize">{identity.chain}</span>
          </div>

          {identity.bio && (
            <p className="text-sm text-zinc-400 mt-2 italic">&ldquo;{identity.bio}&rdquo;</p>
          )}

          {/* Personality tags */}
          {identity.personality && identity.personality.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {identity.personality.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] text-zinc-500 border border-zinc-800 rounded-full px-2 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Social links + wallet */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <a
          href={`https://basescan.org/address/${identity.walletAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-600 hover:text-zinc-400 transition-colors font-mono"
        >
          {truncateAddress(identity.walletAddress)}
        </a>
        {social.twitter && <SocialLink href={`https://x.com/${social.twitter}`} label={`@${social.twitter}`} />}
        {social.farcaster && <SocialLink href={`https://warpcast.com/${social.farcaster}`} label={`/${social.farcaster}`} />}
        {social.github && <SocialLink href={`https://github.com/${social.github}`} label={social.github} />}
        {social.website && <SocialLink href={social.website} label="Website" />}
      </div>

      {/* Token price */}
      {tokenAddress && (
        <div>
          <LivePrice tokenAddress={tokenAddress} tokenSymbol={tokenSymbol} />
        </div>
      )}

      {/* Stats bar */}
      <AgentStatsBar stats={stats} />
    </div>
  );
}
