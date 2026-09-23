/** @type {import('next').NextConfig} */

/**
 * Old English routes kept alive as permanent redirects.
 *
 * These stay indefinitely rather than being removed after a year. Google
 * revisits old URLs long after they move, and external links never update:
 * a story shoutout, the Instagram bio, a bookmark, a screenshot somebody
 * sent a friend. A handful of rules costs nothing; a dead link costs a
 * visitor. Query strings are carried across automatically, which matters
 * for /logg-inn?next=... and Stripe's ?stripe=return.
 */
const legacyRoutes = [
  { source: "/login", destination: "/logg-inn" },
  { source: "/orders", destination: "/ordre" },
  { source: "/inbox", destination: "/meldinger" },
  { source: "/chat/:itemId/:buyerId", destination: "/meldinger/:itemId/:buyerId" },
  { source: "/post", destination: "/ny-annonse" },
  { source: "/sell", destination: "/selg" },
  { source: "/seller/:id", destination: "/selger/:id" },
];

const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async redirects() {
    return legacyRoutes.map((r) => ({ ...r, permanent: true }));
  },
};

module.exports = nextConfig;
