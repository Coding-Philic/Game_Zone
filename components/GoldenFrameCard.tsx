"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GoldenFrameCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  onClick?: () => void;
}

export default function GoldenFrameCard({
  children,
  className = "",
  delay = 0,
  onClick,
}: GoldenFrameCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      whileHover={{
        y: -10,
        rotateY: 3,
        rotateX: 2,
        transition: { type: "spring", stiffness: 300, damping: 20 },
      }}
      onClick={onClick}
      className={`group relative cursor-pointer [perspective:1000px] [transform-style:preserve-3d] ${className}`}
    >
      {/* Outer glow on hover */}
      <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-amber-500/0 via-yellow-400/0 to-amber-500/0 opacity-0 blur-xl transition-all duration-500 group-hover:from-amber-500/30 group-hover:via-yellow-400/40 group-hover:to-amber-500/30 group-hover:opacity-100" />

      {/* Card container */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
        {/* Content */}
        <div className="relative h-full w-full">{children}</div>

        {/* Golden frame overlay */}
        <div className="pointer-events-none absolute inset-0 z-10">
          {/* Frame image overlay */}
          <img
            src="/frames/frame-gold.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-fill opacity-80 mix-blend-screen transition-opacity duration-300 group-hover:opacity-100"
          />
        </div>

        {/* Inner border glow */}
        <div className="pointer-events-none absolute inset-[6%] z-20 rounded-sm border border-amber-400/20 transition-colors duration-300 group-hover:border-amber-400/50" />

        {/* Corner accents */}
        <div className="pointer-events-none absolute left-[5%] top-[5%] z-20 h-4 w-4 border-l-2 border-t-2 border-amber-400/60 transition-colors duration-300 group-hover:border-amber-300" />
        <div className="pointer-events-none absolute right-[5%] top-[5%] z-20 h-4 w-4 border-r-2 border-t-2 border-amber-400/60 transition-colors duration-300 group-hover:border-amber-300" />
        <div className="pointer-events-none absolute bottom-[5%] left-[5%] z-20 h-4 w-4 border-b-2 border-l-2 border-amber-400/60 transition-colors duration-300 group-hover:border-amber-300" />
        <div className="pointer-events-none absolute bottom-[5%] right-[5%] z-20 h-4 w-4 border-b-2 border-r-2 border-amber-400/60 transition-colors duration-300 group-hover:border-amber-300" />

        {/* Shimmer effect on hover */}
        <div className="pointer-events-none absolute inset-0 z-30 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      </div>
    </motion.div>
  );
}
