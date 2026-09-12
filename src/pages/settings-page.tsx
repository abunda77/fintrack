import {
  SyncLogsTable,
  SyncSettingsCard,
} from "@/components/settings/sync-settings-card";

export function SettingsPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">
          Instellingen voor sinkronisasi optioneel met Google Sheets.
        </p>
      </div>

      <SyncSettingsCard />

      <SyncLogsTable />
    </div>
  );
}