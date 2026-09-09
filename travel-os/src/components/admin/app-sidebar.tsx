"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

type Props = {
  staffName: string;
  staffEmail: string;
  onSignOut: () => void;
  /** Closes the mobile drawer after navigating. No-op on desktop. */
  onNavigate?: () => void;
};

export function AppSidebar({
  staffName,
  staffEmail,
  onSignOut,
  onNavigate,
}: Props) {
  const pathname = usePathname();

  return (
    <div className="bg-sidebar flex h-full w-full flex-col">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="bg-brand-gradient flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white">
          S
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] leading-tight font-semibold">
            SkyMiles
          </p>
          <p className="text-muted-foreground truncate text-[11px] leading-tight">
            Travel OS
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-1">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors md:py-1.5",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                item.comingSoon && "opacity-45",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.comingSoon ? (
                <span className="text-muted-foreground ml-auto text-[10px]">
                  soon
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-sidebar-border border-t px-2 py-2">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold">
            {staffName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] leading-tight font-medium">
              {staffName}
            </p>
            <p className="text-muted-foreground truncate text-[10px] leading-tight">
              {staffEmail}
            </p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="text-muted-foreground hover:text-foreground rounded p-1.5"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
