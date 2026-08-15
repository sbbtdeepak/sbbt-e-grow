import Link from "next/link";

import { cn } from "@/lib/utils";

const footerColumns = [
  {
    title: "Products",
    links: [
      { href: "/catalogue", label: "All Products" },
      { href: "/catalogue/e-grow", label: "E-Grow" },
    ],
  },
  {
    title: "Platform",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/#features", label: "Features" },
      { href: "/#how-it-works", label: "How it works" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/#about", label: "About" },
      { href: "/login", label: "Login" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "mailto:hello@sbbt.in", label: "Contact" },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold text-foreground">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        "text-sm text-muted-foreground transition-colors hover:text-foreground",
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 md:flex-row">
          <div className="flex items-center gap-2">
            <span className="font-heading text-lg font-bold">SBBT</span>
            <span className="text-muted-foreground">Software Platform</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SBBT. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Disclaimer
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
