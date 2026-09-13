import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPage } from "@/pages/dashboard-page";
import { SettingsPage } from "@/pages/settings-page";
import { LoginPage } from "@/pages/login-page";
import { useAuth } from "@/app/auth-context";

function FullScreenLoader() {
  return (
    <div className="grid min-h-dvh place-items-center bg-muted/30" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Memuat…
      </div>
    </div>
  );
}

export function AppRouter() {
  const { status } = useAuth();

  if (status === "loading") {
    return <FullScreenLoader />;
  }

  if (status === "unauthenticated") {
    return <LoginPage />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="pengaturan" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
