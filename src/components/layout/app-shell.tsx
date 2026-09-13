import { useTheme } from "next-themes";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, LogOut, Moon, Settings, Sun, Wallet } from "lucide-react";
import { useAuth } from "@/app/auth-context";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

export function AppShell() {
  const { username, logout } = useAuth();

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 min-w-0 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-brand text-brand-foreground">
              <Wallet className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight">FinTrack</span>
            <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
              Personal Finance
            </span>
          </Link>

          <nav className="ml-auto flex items-center gap-1" aria-label="Navigasi utama">
            <NavLink to="/" end>
              {({ isActive }) => (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Dashboard"
                  className={isActive ? "bg-brand/12 text-foreground" : undefined}
                >
                  <LayoutDashboard className="size-3.5" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              )}
            </NavLink>
            <NavLink to="/pengaturan" end>
              {({ isActive }) => (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Pengaturan"
                  className={isActive ? "bg-brand/12 text-foreground" : undefined}
                >
                  <Settings className="size-3.5" />
                  <span className="hidden sm:inline">Pengaturan</span>
                </Button>
              )}
            </NavLink>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Keluar"
              title={username ? `Keluar (${username})` : "Keluar"}
              onClick={() => void logout()}
            >
              <LogOut className="size-4" />
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      <footer className="border-t py-5">
        <p className="px-4 text-center text-xs text-muted-foreground [overflow-wrap:anywhere]">
          FinTrack Personal Finance &middot; Pencatatan Tabungan &amp; Hutang Modal
        </p>
      </footer>
    </div>
  );
}