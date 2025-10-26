import * as React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
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
    <ProtectedRoute>
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
                  asChild
                  size="sm"
                  className="hidden sm:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                >
                  <Link to="/events/log">
                  <Plus className="mr-2 h-4 w-4" />
                  Log Event
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="sm:hidden bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                >
                  <Link to="/events/log">
                  <Plus className="mr-2 h-4 w-4" />
                  Log
                  </Link>
                </Button>
                <ThemeToggle />
              </div>
            </header>
            <main className="flex-1 overflow-y-auto">
              <Outlet />
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
    </ProtectedRoute>
  );
}

export default RootLayout;
