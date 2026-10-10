export type EntryType = "capital" | "expense" | "income" | "withdrawal" | "credit_purchase" | "credit_sale";
export type FinanceEntry = { id: string; entry_type: EntryType; title: string; amount: number; entry_date: string; note: string | null; is_settled: boolean };

export const ENTRY_TYPES: EntryType[] = ["capital", "expense", "income", "credit_purchase", "credit_sale", "withdrawal"];

export const LABEL: Record<EntryType, string> = {
  capital: "মূলধন",
  expense: "ব্যয়",
  income: "আয়",
  credit_purchase: "বাকিতে ক্রয়",
  credit_sale: "বাকিতে বিক্রয়",
  withdrawal: "উত্তোলন",
};

export const HINT: Record<EntryType, string> = {
  capital: "চাষ শুরুর জন্য হাতে রাখা টাকা",
  expense: "নগদ টাকায় যা খরচ করেছেন",
  income: "নগদ টাকায় যা বিক্রি করেছেন",
  credit_purchase: "দোকান থেকে বাকিতে নেওয়া জিনিস (পরে দিতে হবে)",
  credit_sale: "পাইকারকে দিয়েছেন, টাকা এখনো পাননি",
  withdrawal: "সংসার বা নিজের কাজে তুলে নেওয়া টাকা",
};

export function summarize(rows: Pick<FinanceEntry, "entry_type" | "amount" | "is_settled">[]) {
  const t = { capital: 0, expense: 0, income: 0, withdrawal: 0, credit_purchase: 0, credit_sale: 0, payable: 0, receivable: 0, paidCredit: 0, receivedCredit: 0 };
  for (const r of rows) {
    const a = Number(r.amount) || 0;
    t[r.entry_type] += a;
    if (r.entry_type === "credit_purchase") r.is_settled ? (t.paidCredit += a) : (t.payable += a);
    if (r.entry_type === "credit_sale") r.is_settled ? (t.receivedCredit += a) : (t.receivable += a);
  }
  const totalCost = t.expense + t.credit_purchase;
  const totalIncome = t.income + t.credit_sale;
  const profit = totalIncome - totalCost;
  const cashInHand = t.capital + t.income + t.receivedCredit - t.expense - t.paidCredit - t.withdrawal;
  return { ...t, totalCost, totalIncome, profit, cashInHand };
}

export function perUnit(value: number, units: number | null | undefined) {
  if (!units || units <= 0) return null;
  return value / units;
}
