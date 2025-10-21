import { NavLink, useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { navigationGroups } from "@/config/navigation";

export function AppSidebar() {
  const location = useLocation();

  const isActivePath = (href: string) => {
    if (href === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3">
        <div className="flex items-center gap-2 rounded-lg px-2">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-semibold uppercase text-primary-foreground">
            OF
          </div>
          <div className="grid flex-1 leading-tight">
            <span className="text-sm font-semibold tracking-tight">
              Orfinishes
            </span>
            <span className="text-xs text-muted-foreground">
              Finish Control Center
            </span>
          </div>
        </div>
        <SidebarInput
          placeholder="Search catalog or players"
          aria-label="Search navigation"
          className="bg-background"
        />
      </SidebarHeader>
      <SidebarContent>
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActivePath(item.href)}
                      tooltip={item.title}
                    >
                      <NavLink to={item.href} end={item.href === "/"}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                    {item.badge ? (
                      <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="View profile">
              <NavLink to="/settings">
                <span className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold uppercase">
                  RN
                </span>
                <span className="grid flex-1 gap-0.5">
                  <span className="truncate text-sm font-medium">
                    Riley Noor
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    Catalog Steward
                  </span>
                </span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export default AppSidebar;
