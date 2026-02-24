import { withPayload } from '@payloadcms/next/withPayload';

const NEXT_PUBLIC_SERVER_URL = "https://analyser.skde.no"

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  trailingSlash: false,
  images: {
    remotePatterns: [
      ...[NEXT_PUBLIC_SERVER_URL, 'http://localhost:3000'].map((item) => {
        const url = new URL(item)
        return {
          hostname: url.hostname,
          protocol: url.protocol.replace(':', ''),
        }
      }),
    ],
    unoptimized: true,
    qualities: [25, 50, 75, 100],
    // localPatterns: [
    //   {
    //     pathname: '/api/media/**',
    //   },
    // ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
    imgOptTimeoutInSeconds: 30, // Øker timeout for bildeoptimalisering til 30 sekunder. Default er 7, som ofte fører til timeout problemer (504)
  },
  logging: {
    fetches: {
      fullUrl: true,
    }
  },
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/.auth/login/cognito',
        permanent: true,
      },
      { // Denne redirecten er lagt til som en fiks for problemer i FNSP. Problemet er at vi vil ha et
        // forsidekort med link til samlesiden for alle helseatlas, uten å få med banner-bildet til skde.no/helseatlas/
        source: '/helseatlas-forside/',
        destination: 'https://www.skde.no/helseatlas/',
        permanent: true,
      },
      {
        // Alle kall til helseatlas.no (uansett path) skal til skde.no/helseatlas uten å ta med path
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'helsesatlas.no',
          },
          // Hvis du også vil støtte www.helsesatlas.no, kan du legge til:
          // { type: 'host', value: 'www.helsesatlas.no' },
        ],
        destination: 'https://skde.no/helseatlas',
        permanent: false,
      },
    ]
  },
};

export default withPayload(nextConfig);
