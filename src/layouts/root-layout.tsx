import { Outlet, useLocation } from "react-router-dom";

import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { allNavigationItems } from "@/config/navigation";

export function RootLayout() {
  const location = useLocation();

  const activeItem =
    allNavigationItems.find((item) =>
      item.href === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(item.href),
    ) ?? null;

  const heading = activeItem?.title ?? "Dashboard";
  const description =
    activeItem?.description ??
    "Stay on top of cosmetics, ownership events, and player health.";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <div className="flex min-h-svh flex-col text-foreground transition-colors">
          <header className="flex h-16 items-center justify-between gap-2 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="md:hidden" />
              <div className="space-y-0.5">
                <p className="text-sm font-semibold leading-none tracking-tight">
                  {heading}
                </p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="hidden sm:inline-flex"
              >
                Mint Item
              </Button>
              <Button size="sm">Log Event</Button>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default RootLayout;
