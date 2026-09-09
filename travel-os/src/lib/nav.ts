import {
  Building2,
  FileText,
  LayoutDashboard,
  Plane,
  Settings,
  Users,
  Wallet,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Shown in the sidebar but not yet built. */
  comingSoon?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: FileText },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/trips", label: "Trips", icon: Plane, comingSoon: true },
  { href: "/suppliers", label: "Suppliers", icon: Building2, comingSoon: true },
  { href: "/payables", label: "Payables", icon: Wallet, comingSoon: true },
  { href: "/settings", label: "Settings", icon: Settings, comingSoon: true },
];

/**
 * Pipeline stages.
 *
 * These values are also a CHECK constraint on leads.status and rows in
 * option_sets, because the application branches on them — so all three move
 * together. The labels here are the agency's own wording, taken from their
 * working sheet; option_sets carries the same text for server-rendered forms.
 */
export const STAGE_ORDER = [
  "new",
  "contacted",
  "requirements_logged",
  "quoted",
  "revision_requested",
  "negotiating",
  "booking_pending",
  "won",
  "lost",
] as const;

export const STAGE_LABELS: Record<string, string> = {
  new: "New Inquiry",
  contacted: "Contacted",
  requirements_logged: "Requirement Gathered",
  quoted: "Quote Sent",
  revision_requested: "Revision Requested",
  negotiating: "Negotiation",
  booking_pending: "Booking Pending",
  won: "Won / Booking Confirmed",
  lost: "Lost",
  dormant: "Dormant",
};

/** Short forms for dense table cells, where the full label wraps badly. */
export const STAGE_SHORT: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  requirements_logged: "Requirements",
  quoted: "Quote Sent",
  revision_requested: "Revision Req.",
  negotiating: "Negotiation",
  booking_pending: "Booking Pending",
  won: "Won",
  lost: "Lost",
  dormant: "Dormant",
};

/** Maps a stage to its CSS variable, defined once in globals.css. */
export function stageColor(stage: string): string {
  const mapped: Record<string, string> = {
    new: "stage-new",
    contacted: "stage-contacted",
    requirements_logged: "stage-contacted",
    quoted: "stage-quoted",
    revision_requested: "stage-quoted",
    negotiating: "stage-negotiating",
    // Agreed but not yet paid: warmer than negotiation, not yet a win.
    booking_pending: "stage-negotiating",
    won: "stage-won",
    lost: "stage-lost",
    dormant: "stage-lost",
  };
  return `var(--color-${mapped[stage] ?? "stage-new"})`;
}

export const PRIORITY_COLOR: Record<string, string> = {
  hot: "var(--color-state-overdue)",
  warm: "var(--color-state-due)",
  cold: "var(--color-muted-foreground)",
};
