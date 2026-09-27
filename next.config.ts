import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Photos come from Pexels' CDN and are sized there (see components/pexels-image.tsx).
    remotePatterns: [{ protocol: 'https', hostname: 'images.pexels.com', pathname: '/photos/**' }],
  },
}

export default nextConfig
