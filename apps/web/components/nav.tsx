"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Matrix" },
  { href: "/runs", label: "Runs" },
  { href: "/jobs", label: "Jobs" },
];

export function DeskNav() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="Desk">
      {LINKS.map((link) => {
        const current = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link key={link.href} href={link.href} aria-current={current ? "page" : undefined}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
