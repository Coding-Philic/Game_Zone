"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { GAMES, type Game } from "@/config/site";
import { sound } from "@/lib/audio";

interface HUDOverlayProps {
  scrollProgress: number; // 0 to 1
  onSelectGame: (game: Game) => void;
  onJumpToProgress?: (progress: number) => void;
  isIntroActive?: boolean;
  onSkipIntro?: () => void;
}

export default function HUDOverlay({
  scrollProgress,
  onSelectGame,
  onJumpToProgress,
  isIntroActive = false,
  onSkipIntro,
}: HUDOverlayProps) {
  const [isMuted, setIsMuted] = useState(true);

  function handleToggleAudio() {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  }

  // Active game mapping matching camera stops:
  // Card 1: 0.12 - 0.28 (Tekken 8)
  // Card 2: 0.28 - 0.44 (Mortal Kombat 1)
  // Card 3: 0.44 - 0.60 (FIFA 26)
  // Card 4: 0.60 - 0.76 (CODM)
  // Card 5: 0.76 - 0.92 (BGMI)
  const activeGame = useMemo(() => {
    if (scrollProgress >= 0.12 && scrollProgress < 0.28) return { game: GAMES[0], index: 1, next: 0.36 };
    if (scrollProgress >= 0.28 && scrollProgress < 0.44) return { game: GAMES[1], index: 2, next: 0.52 };
    if (scrollProgress >= 0.44 && scrollProgress < 0.60) return { game: GAMES[2], index: 3, next: 0.68 };
    if (scrollProgress >= 0.60 && scrollProgress < 0.76) return { game: GAMES[3], index: 4, next: 0.84 };
    if (scrollProgress >= 0.76 && scrollProgress < 0.92) return { game: GAMES[4], index: 5, next: 0.98 };
    return null;
  }, [scrollProgress]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isIntroActive) {
        onSkipIntro?.();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isIntroActive, onSkipIntro]);

  // Scroll-driven animation for intro gateway logo:
  // When scrolling down (scrollProgress: 0.00 -> 0.10):
  // - Moves upward (y: 0 -> -340px)
  // - Gets smaller (scale: 1.0 -> 0.40)
  // - Fades out smoothly into the top edge
  const introNorm = Math.min(Math.max(scrollProgress / 0.10, 0), 1);
  const logoY = -introNorm * 340;
  const logoScale = 1 - introNorm * 0.60;
  const logoOpacity = Math.max(0, 1 - Math.pow(introNorm, 1.3));
  const promptOpacity = Math.max(0, 1 - introNorm * 3.5);

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-3 md:p-5">
      {/* ------------------------------------------------------------- */}
      {/* 0. CINEMATIC INTRO LETTERBOX & SEISMIC OVERLAY                 */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {isIntroActive && (
          <motion.div
            key="cinematic-intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="pointer-events-none fixed inset-0 z-50 flex flex-col justify-between overflow-hidden"
          >
            {/* Top Widescreen Letterbox Bar */}
            <motion.div
              initial={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="flex h-16 w-full items-center justify-between border-b border-white/10 bg-black/95 px-6 backdrop-blur-xl md:h-20"
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="font-mono text-xs uppercase tracking-widest text-red-400">
                  SEISMIC EMERGENCE IN PROGRESS
                </span>
              </div>
              <button
                onClick={() => {
                  sound.playWarp();
                  onSkipIntro?.();
                }}
                className="pointer-events-auto flex items-center gap-2 rounded-full border border-cyan-400/40 bg-black/80 px-4 py-1.5 font-mono text-xs font-semibold text-cyan-300 backdrop-blur-md transition-all hover:border-amber-400 hover:bg-amber-500/20 hover:text-white"
              >
                <span>SKIP INTRO</span>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-gray-400">ESC</span>
              </button>
            </motion.div>

            {/* Bottom Widescreen Letterbox Bar */}
            <motion.div
              initial={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="flex h-16 w-full items-center justify-center border-t border-white/10 bg-black/95 px-6 backdrop-blur-xl md:h-20"
            >
              <span className="font-mono text-[11px] uppercase tracking-widest text-gray-400">
                STADIUM HYDRAULICS ENGAGED // PREPARE FOR BATTLE
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------- */}
      {/* 1. TOP CONTROLS (Audio & Admin)                               */}
      {/* ------------------------------------------------------------- */}
      <header
        className={`pointer-events-auto flex items-center justify-end px-4 py-2.5 transition-opacity duration-700 ${
          isIntroActive ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        {/* Right: Audio Ambiance & Admin */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              sound.playBeep(660);
              handleToggleAudio();
            }}
            className="flex items-center gap-1.5 rounded-md border border-white/10 bg-black/60 px-2.5 py-1 text-xs text-gray-300 backdrop-blur-md transition-colors hover:border-amber-400/40 hover:text-white"
            title="Toggle cyber ambient audio"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isMuted ? "bg-gray-500" : "bg-green-400 animate-ping"}`} />
            <span className="font-mono text-[11px]">{isMuted ? "AUDIO OFF" : "AUDIO ON"}</span>
          </button>

          <a
            href="/admin"
            className="rounded-md border border-amber-500/30 bg-black/60 px-3 py-1 font-mono text-xs font-semibold text-amber-400 backdrop-blur-md transition-all hover:bg-amber-500 hover:text-black"
          >
            ADMIN
          </a>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2. DYNAMIC SCENE PANELS                                        */}
      {/* ------------------------------------------------------------- */}
      <main className="relative flex flex-1 items-center justify-center">
        <AnimatePresence mode="wait">
          {/* INTRO GATEWAY (0.00 - 0.12) - Appears only after 3D elements have emerged */}
          {scrollProgress < 0.12 && !isIntroActive && (
            <motion.div
              key="scene-intro"
              initial={{ opacity: 0, scale: 0.88, y: 25 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.4, y: -340 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-center flex flex-col items-center justify-center"
            >
              <div
                className="relative mx-auto w-full max-w-[340px] sm:max-w-[460px] md:max-w-[560px] lg:max-w-[620px] px-2 flex flex-col items-center justify-center will-change-transform"
                style={{
                  transform: `translate3d(0, ${logoY}px, 0) scale(${logoScale})`,
                  opacity: logoOpacity,
                }}
              >
                <Image
                  src="/images/gaming_fest_logo.webp"
                  alt="Gaming Fest - The Ultimate Cyber Arena"
                  width={1305}
                  height={672}
                  priority
                  className="w-full h-auto object-contain filter drop-shadow-[0_0_35px_rgba(56,189,248,0.45)] select-none pointer-events-none"
                />
                <h1 className="sr-only">GAMING FEST</h1>
              </div>

              {/* Scroll prompt */}
              <div
                className="mt-5 flex flex-col items-center gap-2 will-change-transform"
                style={{
                  opacity: promptOpacity,
                  transform: `translate3d(0, ${logoY * 0.4}px, 0)`,
                }}
              >
                <span className="font-mono text-[11px] tracking-widest text-amber-400">
                  SCROLL TO ENTER 1ST GAME
                </span>
                <div className="h-9 w-5 rounded-full border border-amber-400/40 p-1">
                  <div className="h-2 w-full rounded-full bg-amber-400 animate-bounce" />
                </div>
              </div>
            </motion.div>
          )}

          {/* ACTIVE GAME CARD HUD PANEL (Right-aligned, leaves center 3D Card 100% visible) */}
          {activeGame && (
            <motion.div
              key={activeGame.game.slug}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.35 }}
              className="pointer-events-auto absolute right-4 md:right-8 top-1/2 -translate-y-1/2 max-w-xs rounded-xl border border-amber-400/30 bg-black/85 p-5 backdrop-blur-2xl shadow-2xl shadow-amber-500/20"
            >
              {/* Header Badge */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-mono text-[11px] font-bold text-amber-400 uppercase">
                  CARD 0{activeGame.index} OF 05
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    activeGame.game.type === "team"
                      ? "bg-cyan-500/20 text-cyan-300"
                      : "bg-amber-500/20 text-amber-300"
                  }`}
                >
                  {activeGame.game.type === "team"
                    ? `Team (${activeGame.game.maxMembers} Players)`
                    : "Solo 1v1"}
                </span>
              </div>

              {/* Title */}
              <h3 className="mt-3 text-2xl font-black uppercase tracking-tight text-white">
                {activeGame.game.name}
              </h3>

              <p className="mt-1.5 text-xs text-gray-300 leading-relaxed">
                Official tournament category. Register your spot to compete for the national title and prize pool.
              </p>

              {/* Action Buttons */}
              <div className="mt-5 space-y-2.5">
                <button
                  onClick={() => {
                    sound.playWarp();
                    onSelectGame(activeGame.game);
                  }}
                  className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 py-2.5 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-amber-500/30 transition-all hover:brightness-110 active:scale-95"
                >
                  Register For {activeGame.game.name}
                </button>

                {activeGame.index < 5 && (
                  <button
                    onClick={() => {
                      sound.playBeep(750);
                      onJumpToProgress?.(activeGame.next);
                    }}
                    className="flex w-full items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 py-1.5 text-[11px] font-mono text-gray-400 transition-colors hover:border-amber-400/30 hover:text-amber-300"
                  >
                    <span>Next Game</span>
                    <span>→</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* THE ZENITH / GRAND ARENA OVERVIEW (0.92 - 1.00) */}
          {scrollProgress >= 0.92 && (
            <motion.div
              key="scene-zenith"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4 }}
              className="pointer-events-auto max-w-3xl rounded-2xl border border-amber-400/40 bg-black/90 p-6 md:p-8 backdrop-blur-2xl shadow-2xl shadow-amber-500/20 text-center"
            >
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-amber-400">
                ARENA ZENITH • ALL 5 TOURNAMENT CATEGORIES
              </span>
              <h2 className="mt-2 text-3xl font-black uppercase text-white md:text-5xl">
                CHOOSE YOUR BATTLEFIELD
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-xs md:text-sm text-gray-300">
                Click any game card below to open its direct registration modal and lock in your team.
              </p>

              {/* 5 Game Cards Grid */}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {GAMES.map((game) => (
                  <button
                    key={game.slug}
                    onClick={() => {
                      sound.playWarp();
                      onSelectGame(game);
                    }}
                    className="group flex flex-col items-center overflow-hidden rounded-xl border border-white/10 bg-white/5 p-2.5 text-center transition-all hover:border-amber-400/60 hover:bg-amber-500/10"
                  >
                    <div className="h-16 w-16 overflow-hidden rounded-lg">
                      <img
                        src={game.posterUrl}
                        alt={game.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-110"
                      />
                    </div>
                    <span className="mt-2 text-xs font-bold text-white">
                      {game.name}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase">
                      {game.type}
                    </span>
                    <span className="mt-2 rounded bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-300">
                      REGISTER
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
