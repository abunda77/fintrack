import { describe, expect, it } from "vitest";
import { buildCsv, sanitizeCsvField } from "../server/csv";
import { computeBalance } from "../shared/balance";
import { accountInputSchema, transactionInputSchema } from "../shared/schemas";
import { formatAmountInput, formatIDR, toInteger } from "../src/lib/format";

describe("computeBalance (PRD 7.1 & 7.2)", () => {
  it("TABUNGAN + DEBIT adds to the balance", () => {
    expect(computeBalance("TABUNGAN", "DEBIT", 1_000_000, 250_000)).toEqual({
      ok: true,
      newBalance: 1_250_000,
    });
  });

  it("TABUNGAN + KREDIT subtracts from the balance", () => {
    expect(computeBalance("TABUNGAN", "KREDIT", 1_000_000, 250_000)).toEqual({
      ok: true,
      newBalance: 750_000,
    });
  });

  it("TABUNGAN + KREDIT refuses a negative balance", () => {
    expect(computeBalance("TABUNGAN", "KREDIT", 100_000, 150_000)).toEqual({
      ok: false,
      code: "INSUFFICIENT_BALANCE",
    });
  });

  it("HUTANG_MODAL + DEBIT pays down the debt", () => {
    expect(computeBalance("HUTANG_MODAL", "DEBIT", 2_000_000, 500_000)).toEqual({
      ok: true,
      newBalance: 1_500_000,
    });
  });

  it("HUTANG_MODAL + DEBIT clamps at zero (no negative debt)", () => {
    expect(computeBalance("HUTANG_MODAL", "DEBIT", 500_000, 2_000_000)).toEqual({
      ok: true,
      newBalance: 0,
    });
  });

  it("HUTANG_MODAL + KREDIT adds a new loan", () => {
    expect(computeBalance("HUTANG_MODAL", "KREDIT", 3_400_000, 2_000_000)).toEqual({
      ok: true,
      newBalance: 5_400_000,
    });
  });
});

describe("Rupiah format & parsing (PRD 11.4)", () => {
  it("formats numbers with id-ID thousand separators", () => {
    expect(formatIDR(25_312_570)).toBe("Rp 25.312.570");
    expect(formatIDR(0)).toBe("Rp 0");
  });

  it("strips non-digit characters when parsing input", () => {
    expect(toInteger("Rp 1.500.000")).toBe(1_500_000);
    expect(toInteger("abc")).toBe(0);
  });

  it("groups typed digits for the amount input", () => {
    expect(formatAmountInput("1500000")).toBe("1.500.000");
    expect(formatAmountInput("")).toBe("");
  });
});

describe("CSV export safety (PRD 14)", () => {
  it("escapes embedded double quotes", () => {
    expect(sanitizeCsvField('zeg "hallo"')).toBe('zeg ""hallo""');
  });

  it("neutralizes spreadsheet formula injection", () => {
    expect(sanitizeCsvField("=SUM(A1:A9)")).toBe("'=SUM(A1:A9)");
    expect(sanitizeCsvField("+911")).toBe("'+911");
    expect(sanitizeCsvField("-2+3")).toBe("'-2+3");
    expect(sanitizeCsvField("\tTAB")).toBe("'\tTAB");
  });

  it("builds a BOM-prefixed CRLF csv with quoted fields", () => {
    const csv = buildCsv(
      ["Nama", "Nominal"],
      [
        { Nama: "=HYPERLINK(...)", Nominal: 1_500_000 },
        { Nama: 'Hutang "modal"', Nominal: 0 },
      ],
    );
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"\'=HYPERLINK(...)","1500000"');
    expect(csv).toContain('"Hutang ""modal""","0"');
    expect(csv.endsWith("\r\n")).toBe(true);
  });
});

describe("input validation schemas (PRD 7.3 & 9)", () => {
  it("rejects an account without a name", () => {
    const parsed = accountInputSchema.safeParse({ name: "", type: "TABUNGAN", openingBalance: 0 });
    expect(parsed.success).toBe(false);
  });

  it("rejects a non-positive transaction amount", () => {
    const parsed = transactionInputSchema.safeParse({
      accountId: "acc_1",
      type: "DEBIT",
      amount: 0,
      transactionDate: "2026-09-01",
      category: "Lain-lain",
      notes: null,
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a valid transaction", () => {
    const parsed = transactionInputSchema.safeParse({
      accountId: "acc_1",
      type: "DEBIT",
      amount: 100_000,
      transactionDate: "2026-09-01",
      category: "Pemasukan / Gaji",
      notes: null,
    });
    expect(parsed.success).toBe(true);
  });
});