export type Carrier = "bring";

export async function isPackageDelivered(carrier: Carrier, trackingNumber: string): Promise<boolean> {
  try {
    return await checkBring(trackingNumber);
  } catch (err) {
    console.error(`[tracking] ${carrier} ${trackingNumber}:`, err);
    return false;
  }
}

async function checkBring(trackingNumber: string): Promise<boolean> {
  const uid = process.env.BRING_API_UID;
  const key = process.env.BRING_API_KEY;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "aktivbruk-tracking/1.0 (kontakt@aktivbruk.com)",
  };
  if (uid && key) {
    headers["X-MyBring-API-Uid"] = uid;
    headers["X-MyBring-API-Key"] = key;
    headers["X-Bring-Client-URL"] = "https://aktivbruk.com";
  }
  const res = await fetch(
    `https://api.bring.com/tracking/api/v2/tracking.json?q=${encodeURIComponent(trackingNumber)}&lang=no`,
    { headers },
  );
  if (!res.ok) return false;
  const data = await res.json() as BringResponse;
  const packages = data?.consignmentSet?.[0]?.packageSet ?? [];
  // Posten uses several codes for successful delivery depending on channel
  // (mailbox, pickup point, home delivery, etc). Scan every event and match
  // against a broad list; fall back to the localized description text so
  // new codes don't silently break the auto-payout.
  const deliveredCodes = new Set([
    "DELIVERED",
    "DELIVERED_HOMEDELIVERY_PARCEL",
    "DELIVERED_SENDER",
    "DELIVERED_POST_OFFICE",
    "DELIVERED_PICKUPPOINT",
    "DELIVERED_MAILBOX",
    "DELIVERY_ORDERED",
    "HANDED_IN",
    "COLLECTED",
    "PICKED_UP",
  ]);
  return packages.some((pkg) =>
    (pkg.eventSet ?? []).some((ev) => {
      if (ev.status && deliveredCodes.has(ev.status)) return true;
      const desc = (ev.description ?? "").toLowerCase();
      return desc.includes("utlevert") || desc.includes("levert") || desc.includes("hentet");
    })
  );
}

type BringResponse = {
  consignmentSet?: Array<{
    packageSet?: Array<{
      eventSet?: Array<{ status?: string; description?: string }>;
    }>;
  }>;
};
