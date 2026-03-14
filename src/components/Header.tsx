"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Flame, LogOut, LayoutDashboard, Shield, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Flame className="h-5 w-5 text-orange-500" />
          <span className="text-gradient-fire">Resume Roaster</span>
        </Link>

        {/* Auth controls */}
        <div className="flex items-center gap-3">
          {status === "loading" && (
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
          )}

          {status === "unauthenticated" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => signIn(undefined, { callbackUrl: "/" })}
            >
              Sign In
            </Button>
          )}

          {status === "authenticated" && session?.user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-full border border-border/40 px-3 py-1.5 text-sm hover:bg-muted transition-colors"
              >
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-orange-500/20 flex items-center justify-center text-xs font-medium text-orange-400">
                    {session.user.name?.[0] || session.user.email?.[0] || "?"}
                  </div>
                )}
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {session.user.name || session.user.email}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-popover shadow-lg py-1">
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    My Roasts
                  </Link>

                  {(session.user as { isAdmin?: boolean }).isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      <Shield className="h-4 w-4" />
                      Admin
                    </Link>
                  )}

                  <hr className="my-1 border-border" />

                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
