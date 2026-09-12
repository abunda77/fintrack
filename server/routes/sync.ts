import { Router } from "express";
import { db } from "../db";
import { asyncHandler, badRequest } from "../errors";
import { syncSettingsInputSchema, type SyncSettings, type SyncLog } from "../../shared/schemas";
import { pushAllToSheets, pullBalancesFromSheets } from "../sync/sheets";

export const syncRouter = Router();

interface SettingsRow {
  provider: string;
  endpoint_url: string | null;
  is_enabled: number;
  last_synced_at: string | null;
  last_status: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

function mapSettings(r: SettingsRow): SyncSettings {
  return {
    provider: r.provider,
    endpointUrl: r.endpoint_url,
    isEnabled: r.is_enabled === 1,
    lastSyncedAt: r.last_synced_at,
    lastStatus: r.last_status as SyncSettings["lastStatus"],
    lastError: r.last_error,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function getSettingsRow(): SettingsRow | undefined {
  return db
    .prepare("SELECT * FROM sync_settings WHERE provider = 'GOOGLE_SHEETS' LIMIT 1")
    .get() as SettingsRow | undefined;
}

function upsertSettings(input: { endpointUrl: string | null; isEnabled: boolean }): SettingsRow {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO sync_settings (provider, endpoint_url, is_enabled, last_status, created_at, updated_at)
     VALUES ('GOOGLE_SHEETS', ?, ?, 'IDLE', ?, ?)
     ON CONFLICT(provider) DO UPDATE SET
       endpoint_url = excluded.endpoint_url,
       is_enabled = excluded.is_enabled,
       updated_at = excluded.updated_at`,
  ).run(
    input.endpointUrl && input.endpointUrl.trim() ? input.endpointUrl.trim() : null,
    input.isEnabled ? 1 : 0,
    now,
    now,
  );
  return getSettingsRow()!;
}

syncRouter.get("/settings", (_req, res) => {
  const row = getSettingsRow();
  if (!row) {
    upsertSettings({ endpointUrl: null, isEnabled: false });
    res.json(mapSettings(getSettingsRow()!));
    return;
  }
  res.json(mapSettings(row));
});

syncRouter.put("/settings", asyncHandler(async (req, res) => {
  const input = syncSettingsInputSchema.parse(req.body);
  const row = upsertSettings({
    endpointUrl: input.endpointUrl ?? null,
    isEnabled: input.isEnabled ?? false,
  });
  res.json(mapSettings(row));
}));

syncRouter.post("/google-sheets/push", asyncHandler(async (_req, res) => {
  const result = await pushAllToSheets();
  if (!result.ok) {
    throw badRequest("SYNC_FAILED", result.error ?? "Sinkronisasi gagal.");
  }
  res.json({ ok: true, pushed: result.pushed });
}));

syncRouter.post("/google-sheets/pull", asyncHandler(async (_req, res) => {
  const result = await pullBalancesFromSheets();
  if (!result.ok) {
    throw badRequest("SYNC_FAILED", result.error ?? "Tarik data gagal.");
  }
  res.json({ ok: true, created: result.created, updated: result.updated });
}));

syncRouter.get("/logs", (req, res) => {
  const limit = Number(req.query.limit ?? 50);
  const safeLimit = Number.isInteger(limit) && limit > 0 && limit <= 200 ? limit : 50;
  const rows = db
    .prepare(
      `SELECT id, provider, operation, status, reference_id AS referenceId, error_message AS errorMessage, created_at AS createdAt, completed_at AS completedAt
       FROM sync_logs
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(safeLimit) as unknown as SyncLog[];
  res.json(rows);
});