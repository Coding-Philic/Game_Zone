"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { SITE } from "@/config/site";

const iconPaths: Record<string, string> = {
  instagram:
    "M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Z M16 11.37a4 4 0 1 1-2.73-3.64 M17.5 6.5h.01",
  twitter:
    "M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2Z",
  discord:
    "M18.59 5.89c-1.23-.57-2.54-.99-3.92-1.23-.17.3-.37.71-.5 1.04-1.46-.22-2.91-.22-4.34 0-.14-.33-.34-.74-.51-1.04-1.38.24-2.69.66-3.92 1.23C2.4 10.42 1.52 14.82 1.96 19.16A15.85 15.85 0 0 0 6.74 21c.38-.52.72-1.07 1.01-1.65-.56-.21-1.09-.47-1.59-.77.13-.1.26-.2.39-.3 3.07 1.42 6.41 1.42 9.44 0 .13.1.26.2.39.3-.5.3-1.03.56-1.59.77.29.58.63 1.13 1.01 1.65a15.85 15.85 0 0 0 4.78-2.84c.52-5.39-.88-9.75-3.99-13.11Z",
  youtube:
    "M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17Z M10 15l5-3-5-3z",
};

export default function SocialRail() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 md:flex"
    >
      {SITE.socialLinks.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:border-amber-400/30 hover:bg-amber-500/10"
          aria-label={link.label}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-400 transition-colors group-hover:text-amber-400"
          >
            {iconPaths[link.icon]
              ?.split(" M")
              .map((d, i) => (
                <path key={i} d={i === 0 ? d : `M${d}`} />
              ))}
          </svg>
        </a>
      ))}

      {/* Vertical line */}
      <div className="mx-auto h-16 w-px bg-gradient-to-b from-white/20 to-transparent" />
    </motion.div>
  );
}
