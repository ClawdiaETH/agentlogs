export default function Footer() {
  return (
    <footer className="border-t border-zinc-800/60 mt-20">
      {/* Gradient separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6 text-center">
        {/* Branding */}
        <p className="text-sm text-zinc-400">
          agentsea · Built on Base
        </p>

        {/* Links */}
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-zinc-500">
          <a
            href="https://github.com/ClawdiaETH/agentlogs"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-300 transition-colors"
          >
            View source
          </a>
          <a
            href="https://raw.githubusercontent.com/ClawdiaETH/agentlogs/master/SKILL.md"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-300 transition-colors"
          >
            skill.md
          </a>
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] text-zinc-600 max-w-md mx-auto leading-relaxed">
          NFTs are generative art. Only mint what you can afford. This is not financial advice.
        </p>

        {/* Badges */}
        <div className="flex justify-center gap-3 text-[10px] font-bold tracking-widest uppercase text-zinc-600">
          <span>CC0</span>
          <span className="text-zinc-700">|</span>
          <span>BASE</span>
          <span className="text-zinc-700">|</span>
          <span>IPFS</span>
          <span className="text-zinc-700">|</span>
          <span>ONCHAIN</span>
        </div>
      </div>
    </footer>
  );
}
