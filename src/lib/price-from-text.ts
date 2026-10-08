// Pure helpers for turning a farmer's post/comment into market price reports.

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

export function toLatinDigits(text: string): string {
  return text.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

/** Cheap check so we only call AI when the text likely mentions a price. */
export function mentionsPrice(text: string): boolean {
  const t = toLatinDigits(text);
  return /\d/.test(t) && /(টাকা|টাকায়|tk|taka|৳|দর|দাম)/i.test(t);
}

export const MON_IN_KG = 40;

export type ExtractedPrice = {
  product_name: string;
  price: number;
  unit: "কেজি" | "মণ" | "পিস" | "হালি";
  price_type: "retail" | "wholesale" | "growers";
};

/** মণের দাম কেজিতে রূপান্তর করে, যাতে বর্তমান বাজারদর ও পূর্বাভাসের সাথে তুলনা করা যায়। */
export function normalizePrice(p: ExtractedPrice): { price: number; unit: string } {
  if (p.unit === "মণ") return { price: Math.round((p.price / MON_IN_KG) * 100) / 100, unit: "কেজি" };
  if (p.unit === "হালি") return { price: Math.round((p.price / 4) * 100) / 100, unit: "পিস" };
  return { price: p.price, unit: p.unit };
}

/** Rejects absurd values (per kg/piece in BDT). */
export function isPlausible(price: number): boolean {
  return Number.isFinite(price) && price >= 1 && price <= 5000;
}
