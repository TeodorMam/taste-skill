/** @type {import('next').NextConfig} */

/**
 * Old English routes kept alive as permanent redirects.
 *
 * These stay indefinitely rather than being removed after a year. Google
 * revisits old URLs long after they move, and external links never update:
 * a story shoutout, the Instagram bio, a bookmark, a screenshot somebody
 * sent a friend. A handful of rules costs nothing; a dead link costs a
 * visitor. Query strings carry across automatically, which matters for
 * /logg-inn?next=..., /varer?brand=... and Stripe's ?stripe=return.
 *
 * Order matters: Next takes the first match, so /item/:id/rediger has to sit
 * above /item/:id or the edit page would land on the listing instead.
 */
const legacyRoutes = [
  // The Norwegian move renamed this route to /rediger but left three links in
  // the app pointing at /edit, so editing a listing 404'd from every entry
  // point. Those links are fixed; this keeps already-shared or bookmarked
  // /edit URLs working.
  { source: "/vare/:id/edit", destination: "/vare/:id/rediger" },
  { source: "/item/:id/edit", destination: "/vare/:id/rediger" },
  { source: "/item/:id", destination: "/vare/:id" },
  { source: "/browse", destination: "/varer" },
  { source: "/about", destination: "/om" },
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
