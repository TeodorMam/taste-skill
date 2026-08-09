export type Carrier = "bring";

export type TrackingCheck = {
  delivered: boolean;
  debug?: {
    ok: boolean;
    events: Array<{ status?: string; description?: string }>;
  };
};

export async function isPackageDelivered(carrier: Carrier, trackingNumber: string): Promise<boolean> {
  return (await checkPackage(carrier, trackingNumber)).delivered;
}

export async function checkPackage(carrier: Carrier, trackingNumber: string): Promise<TrackingCheck> {
  try {
    return await checkBring(trackingNumber);
  } catch (err) {
    console.error(`[tracking] ${carrier} ${trackingNumber}:`, err);
    return { delivered: false, debug: { ok: false, events: [] } };
  }
}

async function checkBring(trackingNumber: string): Promise<TrackingCheck> {
  const res = await fetch(
    `https://api.bring.com/tracking/api/v2/tracking.json?q=${encodeURIComponent(trackingNumber)}&lang=no`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) return { delivered: false, debug: { ok: false, events: [] } };
  const data = await res.json() as BringResponse;
  const packages = data?.consignmentSet?.[0]?.packageSet ?? [];
  // Posten uses several codes for successful delivery depending on channel
  // (mailbox, pickup point, home delivery, etc). We scan every event and
  // match against a broad list, and also fall back to the localized
  // description text so new codes don't silently break the auto-payout.
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
  const allEvents = packages.flatMap((pkg) => pkg.eventSet ?? []);
  const delivered = allEvents.some((ev) => {
    if (ev.status && deliveredCodes.has(ev.status)) return true;
    const desc = (ev.description ?? "").toLowerCase();
    return desc.includes("utlevert") || desc.includes("levert") || desc.includes("hentet");
  });
  return {
    delivered,
    debug: {
      ok: true,
      events: allEvents.map((ev) => ({ status: ev.status, description: ev.description })),
    },
  };
}

type BringResponse = {
  consignmentSet?: Array<{
    packageSet?: Array<{
      eventSet?: Array<{ status?: string; description?: string }>;
    }>;
  }>;
};
