import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usePushAllSync, usePullBalancesSync, useSyncLogs, useSyncSettings, useUpdateSyncSettings } from "@/lib/queries";
import { formatDateTimeID } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { CloudDownload, CloudUpload, RefreshCw } from "lucide-react";

function statusBadge(status: "IDLE" | "SUCCESS" | "FAILED" | undefined | null) {
  const meta: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    SUCCESS: { label: "Berhasil", variant: "default" },
    FAILED: { label: "Gagal", variant: "destructive" },
    IDLE: { label: "Belum ada sinkronisasi", variant: "secondary" },
  };
  const { label, variant } = meta[status ?? "IDLE"];
  return <Badge variant={variant} className="w-fit">{label}</Badge>;
}

export function SyncSettingsCard() {
  const settingsQuery = useSyncSettings();
  const settings = settingsQuery.data;
  const [endpointUrl, setEndpointUrl] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);
  const saveMutation = useUpdateSyncSettings();
  const pushMutation = usePushAllSync();
  const pullMutation = usePullBalancesSync();

  useEffect(() => {
    if (settingsQuery.data) {
      setEndpointUrl(settingsQuery.data.endpointUrl ?? "");
      setIsEnabled(settingsQuery.data.isEnabled);
    }
  }, [settingsQuery.data]);

  const busy =
    settingsQuery.isLoading ||
    saveMutation.isPending ||
    pushMutation.isPending ||
    pullMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudUpload className="size-4 text-muted-foreground" />
          Sinkronisasi Google Sheets
        </CardTitle>
        <CardDescription className="min-w-0 [overflow-wrap:anywhere]">
          Opsional. Sinkronisasi tidak pernah menjadi syarat untuk menyimpan transaksi secara lokal.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {settingsQuery.isLoading && !settings ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="sync-url">Web-app endpoint URL</Label>
              <Input
                id="sync-url"
                type="url"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value.trim())}
              />
              <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
                URL dari Google Apps Script web-app (deploy). Simpan terlebih dahulu, lalu dapat melakukan push.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={isEnabled}
                onCheckedChange={(checked: boolean) => setIsEnabled(checked)}
                size="sm"
              />
              <Label className="min-w-0 font-normal [overflow-wrap:anywhere]">
                Aktifkan sinkronisasi otomatis setelah setiap transaksi
              </Label>
            </div>

            {settings ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Status:</span>
                {statusBadge(settings.lastStatus)}
                {settings.lastSyncedAt ? (
                  <span>
                    Sinkronisasi terakhir {formatDateTimeID(settings.lastSyncedAt)}
                  </span>
                ) : null}
              </div>
            ) : null}

            {settings?.lastError ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {settings.lastError}
              </p>
            ) : null}
          </>
        )}

        <div className="flex flex-wrap items-center gap-2 max-sm:flex-col max-sm:items-stretch">
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              saveMutation.mutate(
                { endpointUrl: endpointUrl === "" ? null : endpointUrl, isEnabled },
                {
                  onSuccess: () => toast.success("Pengaturan sinkronisasi disimpan."),
                  onError: (err) => toast.error(err.message),
                },
              )
            }
          >
            {saveMutation.isPending ? "Menyimpan..." : "Simpan pengaturan"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              pushMutation.mutate(undefined, {
                onSuccess: (res) =>
                  toast.success(`Push berhasil: ${res.pushed} transaksi ke spreadsheet.`),
                onError: (err) => toast.error(err.message),
              })
            }
          >
            <CloudUpload className="size-4" />
            Push alles
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              pullMutation.mutate(undefined, {
                onSuccess: (res) =>
                  toast.success(
                    `Pull berhasil: ${res.created} akun baru, ${res.updated} saldo diperbarui.`,
                  ),
                onError: (err) => toast.error(err.message),
              })
            }
          >
            <CloudDownload className="size-4" />
            Pull saldo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SyncLogsTable() {
  const logsQuery = useSyncLogs();
  const logs = logsQuery.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="size-4 text-muted-foreground" />
          Sinkronisasi log
        </CardTitle>
        <CardDescription>50 tindakan sinkronisasi terakhir.</CardDescription>
      </CardHeader>
      <CardContent>
        {logsQuery.isLoading && !logs ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="divide-y">
            {!logs || logs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Belum ada tindakan sinkronisasi.
              </p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 py-2 px-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {log.operation === "PUSH_TRANSACTION"
                        ? "Push transaksi"
                        : log.operation === "PUSH_ALL"
                          ? "Push semua"
                          : "Pull saldo"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatDateTimeID(log.createdAt)}
                      {log.errorMessage ? ` · ${log.errorMessage}` : ""}
                    </p>
                  </div>
                  <Badge
                    variant={
                      log.status === "SUCCESS" ? "default" : log.status === "FAILED" ? "destructive" : "secondary"
                    }
                    className="w-fit ml-auto"
                  >
                    {log.status === "SUCCESS" ? "Berhasil" : log.status === "FAILED" ? "Gagal" : "Tertunda"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}