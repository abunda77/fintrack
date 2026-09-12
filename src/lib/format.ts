/** Format & parsing Rupiah (PRD pasal 11.4). */

export function formatIDR(value: number): string {
  return "Rp " + value.toLocaleString("id-ID");
}

/** Mengubah string input menjadi bilangan bulat Rupiah (hanya digit). */
export function toInteger(input: string): number {
  const digits = input.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

/** Memformat digit bulat dengan pemisah ribuan Indonesia. */
export function formatAmountInput(digits: string): string {
  const n = toInteger(digits);
  return n ? n.toLocaleString("id-ID") : "";
}

export function formatDateID(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDateTimeID(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}