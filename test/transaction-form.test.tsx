// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionForm } from "../src/components/transactions/transaction-form";
import type { Account } from "../shared/schemas";

// jsdom lacks the layout APIs Radix primitives touch on mount.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= () => {};
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};

vi.mock("@/lib/queries", () => ({
  useCreateTransaction: () => ({ mutate: vi.fn(), isPending: false }),
}));

const tabungan: Account = {
  id: "acc-1",
  name: "BRI Extra",
  type: "TABUNGAN",
  openingBalance: 0,
  currentBalance: 0,
  isDefault: true,
  status: "ACTIVE",
  transactionCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const radios = () => {
  const [debit, kredit] = screen.getAllByRole("radio");
  return {
    debitChecked: debit.getAttribute("aria-checked"),
    kreditChecked: kredit.getAttribute("aria-checked"),
  };
};

afterEach(cleanup);

describe("TransactionForm jenis transaksi", () => {
  it("selects DEBIT by default", () => {
    render(<TransactionForm accounts={[tabungan]} />);
    expect(radios()).toEqual({ debitChecked: "true", kreditChecked: "false" });
  });

  it("selects KREDIT when its option label is clicked", async () => {
    const user = userEvent.setup();
    render(<TransactionForm accounts={[tabungan]} />);

    await user.click(screen.getByText("KREDIT (Keluar)"));

    expect(radios()).toEqual({ debitChecked: "false", kreditChecked: "true" });
  });

  it("round-trips KREDIT back to DEBIT", async () => {
    const user = userEvent.setup();
    render(<TransactionForm accounts={[tabungan]} />);

    await user.click(screen.getByText("KREDIT (Keluar)"));
    expect(radios()).toEqual({ debitChecked: "false", kreditChecked: "true" });

    await user.click(screen.getByText("DEBIT (Masuk)"));
    expect(radios()).toEqual({ debitChecked: "true", kreditChecked: "false" });
  });

  it("selects KREDIT when the radio itself is clicked", async () => {
    const user = userEvent.setup();
    render(<TransactionForm accounts={[tabungan]} />);

    await user.click(screen.getAllByRole("radio")[1]);

    expect(radios()).toEqual({ debitChecked: "false", kreditChecked: "true" });
  });
});

describe("TransactionForm rekening", () => {
  it("shows the chosen rekening and its saldo explanation", async () => {
    const user = userEvent.setup();
    render(<TransactionForm accounts={[tabungan]} />);

    expect(
      screen.getByText("Kies eerst een rekening om het effect op het saldo te zien."),
    ).toBeTruthy();

    await user.click(screen.getAllByRole("combobox")[0]);
    await user.click(await screen.findByRole("option", { name: "BRI Extra" }));

    expect(screen.getAllByRole("combobox")[0].textContent).toContain("BRI Extra");
    expect(screen.getByText("Debit menambah saldo rekening tabungan.")).toBeTruthy();

    await user.click(screen.getByText("KREDIT (Keluar)"));
    expect(screen.getByText("Kredit mengurangi saldo rekening tabungan.")).toBeTruthy();
  });
});
