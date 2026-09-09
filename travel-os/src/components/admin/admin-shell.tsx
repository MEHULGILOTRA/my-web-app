"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Menu, Plus, Search } from "lucide-react";

import { AppSidebar } from "@/components/admin/app-sidebar";
import { CommandPalette } from "@/components/admin/command-palette";
import { QuickAddLeadDialog } from "@/components/admin/quick-add-lead-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Props = {
  staffName: string;
  staffEmail: string;
  signOut: () => Promise<void>;
  children: ReactNode;
};

export function AdminShell({ staffName, staffEmail, signOut, children }: Props) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  // "N" from anywhere opens the new-lead dialog, unless the user is typing.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "n" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (typing || paletteOpen || quickAddOpen) return;

      event.preventDefault();
      setQuickAddOpen(true);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [paletteOpen, quickAddOpen]);

  const openQuickAdd = useCallback(() => setQuickAddOpen(true), []);
  const closeNav = useCallback(() => setNavOpen(false), []);

  return (
    <div className="flex h-full min-h-full">
      {/* Desktop: a permanent rail. Below md it would eat half the screen. */}
      <aside className="border-sidebar-border hidden w-56 shrink-0 border-r md:block">
        <AppSidebar
          staffName={staffName}
          staffEmail={staffEmail}
          onSignOut={() => void signOut()}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3 md:px-4">
          {/* Mobile: the same navigation, as a drawer. */}
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open navigation"
                className="hover:bg-accent -ml-1 rounded-md p-1.5 md:hidden"
              >
                <Menu className="size-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <AppSidebar
                staffName={staffName}
                staffEmail={staffEmail}
                onSignOut={() => void signOut()}
                onNavigate={closeNav}
              />
            </SheetContent>
          </Sheet>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="text-muted-foreground hover:bg-accent flex h-7 items-center gap-2 rounded-md border px-2.5 text-[12px]"
          >
            <Search className="size-3.5" />
            {/* The hint text is the first thing worth dropping on a phone. */}
            <span className="hidden sm:inline">Search or jump to…</span>
            <kbd className="bg-muted ml-2 hidden rounded px-1.5 py-0.5 font-mono text-[10px] sm:inline">
              ⌘K
            </kbd>
          </button>

          <Button
            size="sm"
            className="ml-auto h-7 gap-1.5 text-[12px]"
            onClick={openQuickAdd}
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">New lead</span>
            <kbd className="bg-primary-foreground/15 ml-1 hidden rounded px-1 py-0.5 font-mono text-[10px] sm:inline">
              N
            </kbd>
          </Button>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onNewLead={openQuickAdd}
      />
      <QuickAddLeadDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </div>
  );
}
