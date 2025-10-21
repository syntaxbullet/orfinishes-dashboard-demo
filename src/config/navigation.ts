import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";

export type AppNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  description?: string;
};

export type AppNavGroup = {
  label: string;
  items: AppNavItem[];
};

export const navigationGroups: AppNavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        description: "Key metrics, activity, and quick insights at a glance.",
      },
      {
        title: "Analytics",
        href: "/analytics",
        icon: BarChart3,
        description: "Drill into performance trends and attribution.",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        title: "Customers",
        href: "/customers",
        icon: Users,
        description: "Track customer health, engagement, and retention.",
      },
      {
        title: "Sales",
        href: "/sales",
        icon: ShoppingCart,
        description: "Monitor pipeline velocity and conversion performance.",
      },
      {
        title: "Reports",
        href: "/reports",
        icon: FileText,
        badge: "4",
        description: "Curated exports and compliance-ready reporting.",
      },
    ],
  },
  {
    label: "Help & Settings",
    items: [
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        description: "Manage workspace preferences, billing, and access.",
      },
      {
        title: "Support",
        href: "/support",
        icon: LifeBuoy,
        description: "Reach our team and review service updates.",
      },
    ],
  },
];

export const allNavigationItems = navigationGroups.flatMap(
  (group) => group.items,
);
