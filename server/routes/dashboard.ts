import { Router } from "express";
import { db } from "../db";
import type { DashboardSummary } from "../../shared/schemas";

export const dashboardRouter = Router();

dashboardRouter.get("/summary", (_req, res) => {
  const row = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'TABUNGAN' THEN current_balance ELSE 0 END), 0) AS totalSavings,
         COALESCE(SUM(CASE WHEN type = 'HUTANG_MODAL' THEN current_balance ELSE 0 END), 0) AS totalDebt,
         COALESCE(SUM(CASE WHEN type = 'TABUNGAN' THEN 1 ELSE 0 END), 0) AS savingsAccountCount,
         COALESCE(SUM(CASE WHEN type = 'HUTANG_MODAL' THEN 1 ELSE 0 END), 0) AS debtAccountCount
       FROM accounts
       WHERE status = 'ACTIVE'`,
    )
    .get() as {
    totalSavings: number;
    totalDebt: number;
    savingsAccountCount: number;
    debtAccountCount: number;
  };

  const summary: DashboardSummary = {
    totalSavings: row.totalSavings,
    totalDebt: row.totalDebt,
    // Mengikuti definisi bisnis pada spreadsheet referensi (PRD pasal 6.1).
    totalLiquidAssets: row.totalSavings + row.totalDebt,
    netWorth: row.totalSavings - row.totalDebt,
    savingsAccountCount: row.savingsAccountCount,
    debtAccountCount: row.debtAccountCount,
  };
  res.json(summary);
});