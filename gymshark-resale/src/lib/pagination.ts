/**
 * Page size for the item grids.
 *
 * This lives in its own module, with no "use client", on purpose. A server
 * component that imports a value from a "use client" file does not get the
 * value: the RSC bundler replaces every export of that module with a client
 * reference proxy. `PAGE_SIZE - 1` then evaluates to NaN, and `.range(0, NaN)`
 * quietly returns no rows. Keep shared constants in plain modules like this
 * one so both sides get the real value.
 */
export const PAGE_SIZE = 24;
