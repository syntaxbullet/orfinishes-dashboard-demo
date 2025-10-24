import type { LucideIcon } from "lucide-react";
import {
  Activity,
  LayoutDashboard,
  Package,
  Sparkles,
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
        description:
          "Here you can find some key insights based on our data",
      },
    ],
  },
  {
    label: "Records",
    items: [
      {
        title: "Cosmetics",
        href: "/catalog",
        icon: Sparkles,
        description:
          "Browse every cosmetic for which a finish can be obtained",
      },
      {
        title: "Items",
        href: "/items",
        icon: Package,
        description:
          "Browse all unboxed items with their finish types and ownership",
      },
      {
        title: "Ownership Events",
        href: "/events",
        icon: Activity,
        description:
          "Trace grants, transfers, and unboxing history for each item.",
      },
      {
        title: "Players",
        href: "/players",
        icon: Users,
        description:
          "Manage player profiles, unboxing stats, and ban indicators.",
      },
    ],
  },
];

export const allNavigationItems = navigationGroups.flatMap(
  (group) => group.items,
);
