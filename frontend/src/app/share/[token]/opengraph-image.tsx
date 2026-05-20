import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';
export const revalidate = 60;

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3099').replace(/\/$/, '');

type ShareOgData = {
  league?: {
    name?: string;
    status?: string;
    format?: string;
    mode?: string;
  };
  standings?: Array<{
    position?: number;
    player?: { fullName?: string } | null;
    points?: number;
    played?: number;
    won?: number;
  }>;
  groups?: Array<{ matches?: Array<{ status?: string }> }>;
};

async function getShareData(token: string): Promise<ShareOgData | null> {
  try {
    const res = await fetch(`${API_URL}/api/share/${token}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getShareData(token);
  const leagueName = data?.league?.name ?? 'Pikado liga';
  const status = data?.league?.status === 'active' ? 'U TOKU' : data?.league?.status === 'completed' ? 'ZAVRSENA' : 'LIVE TABELA';
  const leader = data?.standings?.[0];
  const completedMatches = data?.groups
    ?.flatMap((group) => group.matches ?? [])
    .filter((match) => match.status === 'completed').length ?? 0;
  const topRows = (data?.standings ?? []).slice(0, 3);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: 'linear-gradient(135deg, #0c1220 0%, #111827 56%, #431407 100%)',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          padding: 48,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: -120,
            top: -140,
            width: 420,
            height: 420,
            borderRadius: 420,
            background: 'rgba(249,115,22,0.16)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: -150,
            bottom: -180,
            width: 420,
            height: 420,
            borderRadius: 420,
            background: 'rgba(56,189,248,0.10)',
          }}
        />
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            border: '3px solid rgba(249,115,22,0.42)',
            borderRadius: 34,
            padding: 34,
            gap: 36,
            background: 'rgba(2,6,23,0.42)',
          }}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 16,
                    background: '#f97316',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 30,
                    fontWeight: 900,
                  }}
                >
                  P
                </div>
                <div style={{ color: '#fb923c', fontSize: 26, fontWeight: 900, letterSpacing: 4 }}>{status}</div>
              </div>
              <div style={{ marginTop: 32, fontSize: 70, lineHeight: 1.02, fontWeight: 900, maxWidth: 690 }}>
                {leagueName}
              </div>
              <div style={{ marginTop: 20, color: '#cbd5e1', fontSize: 30, fontWeight: 600 }}>
                Tabela, mečevi i rezultati za igrače.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 18 }}>
              {[
                [String(data?.standings?.length ?? 0), 'IGRACA'],
                [String(completedMatches), 'MECEVA'],
                [String(leader?.points ?? 0), 'BODOVA LIDERA'],
              ].map(([value, label]) => (
                <div
                  key={label}
                  style={{
                    width: 178,
                    height: 96,
                    borderRadius: 20,
                    background: 'rgba(15,23,42,0.82)',
                    border: '1px solid rgba(148,163,184,0.26)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    paddingLeft: 22,
                  }}
                >
                  <div style={{ fontSize: 34, fontWeight: 900 }}>{value}</div>
                  <div style={{ color: '#94a3b8', fontSize: 16, fontWeight: 800, letterSpacing: 1 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ width: 330, display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center' }}>
            <div
              style={{
                borderRadius: 28,
                background: 'rgba(15,23,42,0.84)',
                border: '1px solid rgba(249,115,22,0.28)',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              <div style={{ color: '#fb923c', fontSize: 18, fontWeight: 900, letterSpacing: 2 }}>TOP 3</div>
              {topRows.length > 0 ? topRows.map((row, index) => (
                <div key={row.player?.fullName ?? index} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 42,
                      background: index === 0 ? '#facc15' : index === 1 ? '#cbd5e1' : '#d97706',
                      color: index === 0 || index === 1 ? '#0f172a' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 21,
                      fontWeight: 900,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 214 }}>
                      {row.player?.fullName ?? 'Igrač'}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 17, fontWeight: 700 }}>{row.points ?? 0} bodova</div>
                  </div>
                </div>
              )) : (
                <div style={{ color: '#94a3b8', fontSize: 22, fontWeight: 700 }}>Tabela se uskoro popunjava</div>
              )}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 20, fontWeight: 700, textAlign: 'center' }}>
              Otvori link za live stanje lige
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
