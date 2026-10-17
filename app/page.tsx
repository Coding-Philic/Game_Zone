"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Game } from "@/config/site";
import RegistrationDialog from "@/components/RegistrationDialog";
import HUDOverlay from "@/components/three/HUDOverlay";

// Dynamically import ArenaCanvas with SSR disabled
const ArenaCanvas = dynamic(() => import("@/components/three/ArenaCanvas"), {
  ssr: false,
});

export default function HomePage() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isIntroActive, setIsIntroActive] = useState(false);

  const targetProgress = useRef(0);
  const currentProgress = useRef(0);
  const touchStartY = useRef(0);
  const isUpdatingFromScroll = useRef(false);

  const handleSkipIntro = useCallback(() => {
    setIsIntroActive(false);
  }, []);

  // Smooth RAF lerp loop
  useEffect(() => {
    let rafId: number;

    function tick() {
      // Smooth lerp: currentProgress -> targetProgress
      const diff = targetProgress.current - currentProgress.current;
      if (Math.abs(diff) > 0.0001) {
        currentProgress.current += diff * 0.12;
        setScrollProgress(currentProgress.current);
      } else if (currentProgress.current !== targetProgress.current) {
        currentProgress.current = targetProgress.current;
        setScrollProgress(currentProgress.current);
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // 1. Native Window Scroll Listener
  useEffect(() => {
    function onNativeScroll() {
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 10) {
        isUpdatingFromScroll.current = true;
        const p = Math.min(1, Math.max(0, scrollY / maxScroll));
        targetProgress.current = p;
        setTimeout(() => {
          isUpdatingFromScroll.current = false;
        }, 50);
      }
    }

    window.addEventListener("scroll", onNativeScroll, { passive: true });
    return () => window.removeEventListener("scroll", onNativeScroll);
  }, []);

  // 2. Wheel Event Listener (Smooth Direct Wheel Input)
  useEffect(() => {
    function onWheel(e: WheelEvent) {
      // Normalize wheel delta (e.g. trackpad vs mousewheel)
      const delta = e.deltaY;
      const sensitivity = 0.00085;
      const next = Math.min(1, Math.max(0, targetProgress.current + delta * sensitivity));

      targetProgress.current = next;

      // Sync native scrollbar so page position and scrollbar stay in sync
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 10 && !isUpdatingFromScroll.current) {
        window.scrollTo({
          top: next * maxScroll,
          behavior: "instant" as ScrollBehavior,
        });
      }
    }

    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  // 3. Touch Gestures for Mobile & Tablets
  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length > 0) {
        touchStartY.current = e.touches[0].clientY;
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length > 0) {
        const currentY = e.touches[0].clientY;
        const deltaY = touchStartY.current - currentY;
        touchStartY.current = currentY;

        const sensitivity = 0.002;
        const next = Math.min(1, Math.max(0, targetProgress.current + deltaY * sensitivity));
        targetProgress.current = next;

        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        if (maxScroll > 10) {
          window.scrollTo({
            top: next * maxScroll,
            behavior: "instant" as ScrollBehavior,
          });
        }
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  // 4. Keyboard Arrow Navigation
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (["ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        const next = Math.min(1, targetProgress.current + 0.06);
        targetProgress.current = next;
        syncScroll(next);
      } else if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        const next = Math.max(0, targetProgress.current - 0.06);
        targetProgress.current = next;
        syncScroll(next);
      }
    }

    function syncScroll(p: number) {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 10) {
        window.scrollTo({ top: p * maxScroll, behavior: "smooth" });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Jump to specific progress (e.g. from bottom timeline buttons)
  const handleJumpToProgress = useCallback((progress: number) => {
    targetProgress.current = Math.min(1, Math.max(0, progress));
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll > 10) {
      window.scrollTo({
        top: progress * maxScroll,
        behavior: "smooth",
      });
    }
  }, []);

  return (
    <div className="relative min-h-screen bg-[#03040a]">
      {/* 1. Full-screen 3D Scene Canvas */}
      <ArenaCanvas
        scrollProgress={scrollProgress}
        onSelectGame={setSelectedGame}
        isIntroActive={isIntroActive}
        onIntroComplete={handleSkipIntro}
      />

      {/* 2. Cinematic Sci-Fi HUD Overlay */}
      <HUDOverlay
        scrollProgress={scrollProgress}
        onSelectGame={setSelectedGame}
        onJumpToProgress={handleJumpToProgress}
        isIntroActive={isIntroActive}
        onSkipIntro={handleSkipIntro}
      />

      {/* 3. Physical Scroll Track (6000px provides consistent, reliable scroll range across all viewports) */}
      <div
        className="relative w-full pointer-events-none"
        style={{ height: "6000px", minHeight: "6000px" }}
      >
        <div id="entrance" className="absolute top-[500px]" />
        <div id="trophy" className="absolute top-[1800px]" />
        <div id="games" className="absolute top-[3600px]" />
        <div id="zenith" className="absolute top-[5400px]" />
      </div>

      {/* 4. Registration Dialog Modal */}
      <RegistrationDialog
        game={selectedGame}
        onClose={() => setSelectedGame(null)}
      />
    </div>
  );
}
