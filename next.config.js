/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Self-contained output for Vercel-optimised deployments.
  output: 'standalone',

  // Allow search engines to index the site (overrides platforms that set x-robots-tag: noindex on previews).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'index, follow' },
        ],
      },
    ]
  },
}

// Warn at build time if backend URL is not set (local dev can still work without it).
if (process.env.NEXT_PUBLIC_API_URL == null || process.env.NEXT_PUBLIC_API_URL === '') {
  console.warn(
    '[next.config.js] NEXT_PUBLIC_API_URL is not set. Set it in .env.local or Vercel for production.'
  )
}

module.exports = nextConfig
