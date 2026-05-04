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

type BringResponse = {
  consignmentSet?: Array<{
    packageSet?: Array<{
      eventSet?: Array<{ status: string }>;
    }>;
  }>;
};
