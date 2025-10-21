import { Outlet } from "react-router-dom";

import { ThemeToggle } from "../components/theme-toggle";

export function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground transition-colors">
      <header className="flex items-center justify-end border-b border-border px-6 py-4">
        <ThemeToggle />
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

export default RootLayout;
