import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3099').replace(/\/$/, '');
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002').replace(/\/$/, '');

type ShareMetadataData = {
  league?: {
    name?: string;
    status?: string;
  };
  standings?: Array<{
    player?: { fullName?: string } | null;
    points?: number;
  }>;
  groups?: Array<{ matches?: Array<{ status?: string }> }>;
};

async function getShareMetadata(token: string): Promise<ShareMetadataData | null> {
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

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const data = await getShareMetadata(token);
  const leagueName = data?.league?.name ?? 'Pikado liga';
  const leader = data?.standings?.[0]?.player?.fullName;
  const leaderPoints = data?.standings?.[0]?.points ?? 0;
  const completedMatches = data?.groups
    ?.flatMap((group) => group.matches ?? [])
    .filter((match) => match.status === 'completed').length ?? 0;
  const title = `${leagueName} - live tabela`;
  const description = leader
    ? `Prati tabelu, mečeve i rezultate. Lider je ${leader} sa ${leaderPoints} bodova, ${completedMatches} odigranih mečeva.`
    : 'Prati tabelu, mečeve i rezultate pikado lige uživo.';
  const pageUrl = `${APP_URL}/share/${token}`;

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: 'Pikado',
      type: 'website',
      images: [
        {
          url: `/share/${token}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${leagueName} Pikado live tabela`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/share/${token}/opengraph-image`],
    },
  };
}

export default function ShareTokenLayout({ children }: { children: ReactNode }) {
  return children;
}
