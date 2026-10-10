"use client";

import { signOut } from "next-auth/react";

export function TopBar({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: { href: string; label: string };
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-surface px-4 py-3">
      <div className="min-w-0">
        {onBack && (
          <a href={onBack.href} className="block text-xs text-muted hover:text-primary">
            ← {onBack.label}
          </a>
        )}
        <h1 className="truncate text-base font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="tap-target flex-none rounded-md px-2 text-sm text-muted hover:bg-background"
      >
        Sair
      </button>
    </header>
  );
}
