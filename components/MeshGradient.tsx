export default function MeshGradient() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
    >
      {/* Blob 1 — deep purple, top-left */}
      <div
        className="absolute blob-drift-1"
        style={{
          width: '60vw',
          height: '60vw',
          top: '-15%',
          left: '-10%',
          background:
            'radial-gradient(circle, rgba(76,29,149,0.15) 0%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />

      {/* Blob 2 — indigo, center-right */}
      <div
        className="absolute blob-drift-2"
        style={{
          width: '55vw',
          height: '55vw',
          top: '20%',
          right: '-15%',
          background:
            'radial-gradient(circle, rgba(30,27,75,0.2) 0%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />

      {/* Blob 3 — teal, bottom-left */}
      <div
        className="absolute blob-drift-3"
        style={{
          width: '50vw',
          height: '50vw',
          bottom: '-10%',
          left: '10%',
          background:
            'radial-gradient(circle, rgba(19,78,74,0.15) 0%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />

      {/* Blob 4 — violet, top-right */}
      <div
        className="absolute blob-drift-4"
        style={{
          width: '65vw',
          height: '65vw',
          top: '40%',
          left: '30%',
          background:
            'radial-gradient(circle, rgba(88,28,135,0.12) 0%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />
    </div>
  );
}
