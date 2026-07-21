"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getIcon } from "@/lib/icons";
import { useProfile } from "@/lib/useProfile";

export function NavBar() {
  const { profile, ready } = useProfile();

  return (
    <header className="sticky top-0 z-30 border-b border-border-soft bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link
          href="/roadmap"
          className="flex items-center gap-2 font-display text-lg font-bold tracking-tight"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-teal text-white shadow-clay">
            <FontAwesomeIcon icon={getIcon("git-alt")} className="h-4 w-4" />
          </span>
          GitШлях
        </Link>

        {ready && profile && (
          <Link
            href="/progress"
            className="clay-card-soft flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground transition hover:shadow-clay"
          >
            <FontAwesomeIcon
              icon={getIcon("circle-user")}
              className="h-4 w-4 text-foreground-muted"
            />
            {profile}
          </Link>
        )}
      </div>
    </header>
  );
}
