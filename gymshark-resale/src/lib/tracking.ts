export type Carrier = "bring" | "postnord" | "helthjem" | "other";

export const CARRIER_LABELS: Record<Carrier, string> = {
  bring: "Posten / Bring",
  postnord: "PostNord",
  helthjem: "Helthjem",
  other: "Annen (manuell bekreftelse)",
};

export async function isPackageDelivered(carrier: Carrier, trackingNumber: string): Promise<boolean> {
  try {
    switch (carrier) {
      case "bring":    return await checkBring(trackingNumber);
      case "postnord": return await checkPostNord(trackingNumber);
      case "helthjem": return await checkHelthjem(trackingNumber);
      default:         return false;
    }
  } catch (err) {
    console.error(`[tracking] ${carrier} ${trackingNumber}:`, err);
    return false;
  }
}

async function checkBring(trackingNumber: string): Promise<boolean> {
  const res = await fetch(
    `https://api.bring.com/tracking/api/v2/tracking.json?q=${encodeURIComponent(trackingNumber)}&lang=no`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) return false;
  const data = await res.json() as BringResponse;
  const packages = data?.consignmentSet?.[0]?.packageSet ?? [];
  // eventSet is reverse-chronological, first entry is latest status
  return packages.some((pkg) => pkg.eventSet?.[0]?.status === "DELIVERED");
}

async function checkPostNord(trackingNumber: string): Promise<boolean> {
  const apiKey = process.env.POSTNORD_API_KEY;
  if (!apiKey) {
    console.warn("[tracking] POSTNORD_API_KEY not set");
    return false;
  }
  const res = await fetch(
    `https://api2.postnord.com/rest/shipment/v5/trackandtrace/findByIdentifier.json?apikey=${encodeURIComponent(apiKey)}&id=${encodeURIComponent(trackingNumber)}&locale=no`,
  );
  if (!res.ok) return false;
  const data = await res.json() as PostNordResponse;
  const shipments = data?.TrackingInformationResponse?.shipments ?? [];
  return shipments.some((s) => s.status === "DELIVERED");
}

async function checkHelthjem(trackingNumber: string): Promise<boolean> {
  const res = await fetch(
    `https://sporing.helthjem.no/api/Tracking/GetTracking?orderNumber=${encodeURIComponent(trackingNumber)}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) return false;
  const data = await res.json() as HelthjemResponse;
  return data?.deliveryStatus === "Delivered" || data?.isDelivered === true;
}

type BringResponse = {
  consignmentSet?: Array<{
    packageSet?: Array<{
      eventSet?: Array<{ status: string }>;
    }>;
  }>;
};

type PostNordResponse = {
  TrackingInformationResponse?: {
    shipments?: Array<{ status: string }>;
  };
};

type HelthjemResponse = {
  deliveryStatus?: string;
  isDelivered?: boolean;
};
