import { useTheme } from "next-themes";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Wallet } from "lucide-react";

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
  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-600 text-white">
              <Wallet className="size-4" />
            </span>
            <span className="font-semibold tracking-tight">FinTrack</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Personal Finance
            </span>
          </Link>

          <nav className="ml-auto flex items-center gap-1">
            <NavLink to="/" end>
              {({ isActive }) => (
                <Button variant={isActive ? "secondary" : "ghost"} size="sm">
                  Dashboard
                </Button>
              )}
            </NavLink>
            <NavLink to="/pengaturan" end>
              {({ isActive }) => (
                <Button variant={isActive ? "secondary" : "ghost"} size="sm">
                  Pengaturan
                </Button>
              )}
            </NavLink>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      <footer className="border-t py-5">
        <p className="text-center text-xs text-muted-foreground">
          FinTrack Personal Finance &middot; Pencatatan Tabungan &amp; Hutang Modal
        </p>
      </footer>
    </div>
  );
}