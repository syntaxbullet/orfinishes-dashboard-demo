import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Boxes,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Settings,
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
          "Key counts for cosmetics, minted items, and ownership churn.",
      },
      {
        title: "Cosmetics Catalog",
        href: "/catalog",
        icon: Sparkles,
        description:
          "Browse every cosmetic definition, finish availability, and sources.",
      },
    ],
  },
  {
    label: "Records",
    items: [
      {
        title: "Minted Items",
        href: "/items",
        icon: Boxes,
        description:
          "Audit minted instances, finish types, and current ownership.",
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
          "Manage player profiles, minting stats, and ban indicators.",
      },
      {
        title: "Reports",
        href: "/reports",
        icon: FileText,
        description:
          "Generate exports for catalog syncs, audits, and retention reviews.",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        description:
          "Configure retention limits, minting guards, and access rules.",
      },
      {
        title: "Operations Runbook",
        href: "/runbook",
        icon: LifeBuoy,
        description:
          "Document procedures for incidents, migrations, and data repairs.",
      },
    ],
  },
];

export const allNavigationItems = navigationGroups.flatMap(
  (group) => group.items,
);
