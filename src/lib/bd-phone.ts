const BN = "০১২৩৪৫৬৭৮৯";
/** Normalize a Bangladeshi mobile number (01XXXXXXXXX, 8801…, Bangla digits) to +8801XXXXXXXXX. */
export function normalizeBdPhone(raw: string): string | null {
  const d = raw.replace(/[০-৯]/g, (c) => String(BN.indexOf(c))).replace(/\D/g, "");
  const local = d.startsWith("880") ? d.slice(3) : d.startsWith("0") ? d.slice(1) : d;
  return /^1[3-9]\d{8}$/.test(local) ? `+880${local}` : null;
}
