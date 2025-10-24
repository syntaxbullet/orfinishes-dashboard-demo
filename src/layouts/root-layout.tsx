import * as React from "react";
import { Outlet, useLocation } from "react-router-dom";

import { AppSidebar } from "@/components/app-sidebar";
import { LogEventSheet } from "@/components/log-event-sheet";
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
  const [isLogEventSheetOpen, setIsLogEventSheetOpen] = React.useState(false);

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
          <header className="flex h-32 sm:h-20 items-center justify-between gap-2 border-b border-border bg-background/80 px-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <SidebarTrigger className="md:hidden" />
              <div className="space-y-1">
                <p className="text-sm font-semibold leading-none tracking-tight">
                  {heading}
                </p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                className="hidden sm:inline-flex"
                onClick={() => setIsLogEventSheetOpen(true)}
              >
                Log Event
              </Button>
              <Button 
                size="sm" 
                className="sm:hidden"
                onClick={() => setIsLogEventSheetOpen(true)}
              >
                Log
              </Button>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </SidebarInset>
      <LogEventSheet 
        open={isLogEventSheetOpen} 
        onOpenChange={setIsLogEventSheetOpen} 
      />
    </SidebarProvider>
  );
}

export default RootLayout;
