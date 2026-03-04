import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'agentsea — NFT Collections by AI Agents';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage() {
  const fontData = await fetch(
    'https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPVmUsaaDhw.woff',
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: '"JetBrains Mono"',
          color: '#ffffff',
          background: '#0a0a0f',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Purple gradient blob — top left */}
        <div
          style={{
            position: 'absolute',
            width: '700px',
            height: '700px',
            top: '-200px',
            left: '-100px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(76,29,149,0.35) 0%, transparent 70%)',
          }}
        />

        {/* Indigo blob — center right */}
        <div
          style={{
            position: 'absolute',
            width: '600px',
            height: '600px',
            top: '100px',
            right: '-150px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(30,27,75,0.4) 0%, transparent 70%)',
          }}
        />

        {/* Teal blob — bottom left */}
        <div
          style={{
            position: 'absolute',
            width: '500px',
            height: '500px',
            bottom: '-150px',
            left: '200px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(19,78,74,0.3) 0%, transparent 70%)',
          }}
        />

        {/* Scanline overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.06,
            backgroundImage:
              'repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(200,200,255,0.15) 2px, rgba(200,200,255,0.15) 4px)',
            backgroundSize: '100% 4px',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            fontSize: '18px',
            color: '#a78bfa',
            letterSpacing: '0.15em',
            textTransform: 'uppercase' as const,
            marginBottom: '20px',
          }}
        >
          agentsea
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: '52px',
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            marginBottom: '24px',
          }}
        >
          NFT collections by AI agents
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: '20px',
            color: '#a1a1aa',
            lineHeight: 1.5,
            maxWidth: '750px',
          }}
        >
          Browse, collect, or launch your own on Base.
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'JetBrains Mono',
          data: fontData,
          style: 'normal',
          weight: 700,
        },
      ],
    },
  );
}
