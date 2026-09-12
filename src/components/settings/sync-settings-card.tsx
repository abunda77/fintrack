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
    SUCCESS: { label: "Geslaagd", variant: "default" },
    FAILED: { label: "Gefaald", variant: "destructive" },
    IDLE: { label: "Nog geen sync", variant: "secondary" },
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
        <CardDescription>
          Optioneel. Sinkronisierung is nooit een vereiste om transacties lokaal op te slaan.
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
              <p className="text-xs text-muted-foreground">
                URL dari Google Apps Script web-app (deploy). Bewaar eerst, dan kan je pushen.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={isEnabled}
                onCheckedChange={(checked: boolean) => setIsEnabled(checked)}
                size="sm"
              />
              <Label className="font-normal">
                Activeer automatic sinkronisasi na elke transactie
              </Label>
            </div>

            {settings ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Status:</span>
                {statusBadge(settings.lastStatus)}
                {settings.lastSyncedAt ? (
                  <span>
                    Laatste sync {formatDateTimeID(settings.lastSyncedAt)}
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

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              saveMutation.mutate(
                { endpointUrl: endpointUrl === "" ? null : endpointUrl, isEnabled },
                {
                  onSuccess: () => toast.success("Instellingen sinkronisasi opgeslagen."),
                  onError: (err) => toast.error(err.message),
                },
              )
            }
          >
            {saveMutation.isPending ? "Opslaan..." : "Opslaan instellingen"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              pushMutation.mutate(undefined, {
                onSuccess: (res) =>
                  toast.success(`Push gedaan: ${res.pushed} transacties naar spreadsheet.`),
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
                    `Pull gedaan: ${res.created} akun nieuw, ${res.updated} saldo bijgewerkt.`,
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
        <CardDescription>De laatste 50 sinkronisasi-acties.</CardDescription>
      </CardHeader>
      <CardContent>
        {logsQuery.isLoading && !logs ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="divide-y">
            {!logs || logs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nog geen sinkronisasi-acties.
              </p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 py-2 px-1">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {log.operation === "PUSH_TRANSACTION"
                        ? "Push transactie"
                        : log.operation === "PUSH_ALL"
                          ? "Push alles"
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
                    {log.status === "SUCCESS" ? "Geslaagd" : log.status === "FAILED" ? "Gefaald" : "Pending"}
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