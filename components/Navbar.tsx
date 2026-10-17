"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { SITE } from "@/config/site";

export default function Navbar() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed left-0 right-0 top-0 z-40"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Left: Logo / Name */}
        <a href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-yellow-600 shadow-lg shadow-amber-500/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-black"
            >
              <path d="M6 11h4a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H6z" />
              <path d="M14 7h4a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-4z" />
              <path d="M2 7v10" />
              <path d="M22 7v10" />
            </svg>
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">
              {SITE.name}
            </span>
            <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-400 ring-1 ring-amber-400/20">
              {SITE.edition}
            </span>
          </div>
        </a>

        {/* Center: Nav links */}
        <div className="hidden items-center gap-1 md:flex">
          {SITE.navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right: CTA */}
        <a
          href="#games"
          className="rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 px-5 py-2 text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-amber-500/20 transition-all duration-300 hover:shadow-amber-500/40 hover:brightness-110"
        >
          Join Now
        </a>
      </div>

      {/* Metallic bottom border */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
    </motion.nav>
  );
}
