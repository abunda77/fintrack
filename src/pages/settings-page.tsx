import { Badge } from "@/components/ui/badge";
import { useSyncSettings } from "@/lib/queries";
import {
  SyncLogsTable,
  SyncSettingsCard,
} from "@/components/settings/sync-settings-card";

export function SettingsPage() {
  const settings = useSyncSettings();

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Pengaturan</h1>
          <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
            Pengaturan sinkronisasi opsional dengan Google Sheets.
          </p>
        </div>
        {settings.data ? (
          <div className="ml-auto max-sm:w-full">
            <Badge variant={settings.data.isEnabled ? "default" : "secondary"}>
              {settings.data.isEnabled
                ? "Sinkronisasi aktif"
                : "Sinkronisasi nonaktif"}
            </Badge>
          </div>
        ) : null}
      </div>

      <SyncSettingsCard />

      <SyncLogsTable />
    </div>
  );
}