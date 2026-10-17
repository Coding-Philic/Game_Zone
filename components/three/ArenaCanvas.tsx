"use client";

import { useState, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import CyberArenaScene from "./CyberArenaScene";
import type { Game } from "@/config/site";

interface ArenaCanvasProps {
  scrollProgress: number;
  onSelectGame: (game: Game) => void;
  isIntroActive?: boolean;
  onIntroComplete?: () => void;
}

export default function ArenaCanvas({
  scrollProgress,
  onSelectGame,
  isIntroActive = true,
  onIntroComplete,
}: ArenaCanvasProps) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      // Normalize mouse to -1 to +1
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMouse({ x, y });
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 -z-0 h-full w-full overflow-hidden bg-[#03040a]">
      <Canvas
        camera={{
          fov: 52,
          near: 0.1,
          far: 200,
          position: [0, 4.8, 54],
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={["#03050c"]} />
        <fogExp2 attach="fog" args={["#03050c", 0.014]} />

        <Suspense fallback={null}>
          <CyberArenaScene
            scrollProgress={scrollProgress}
            mouse={mouse}
            onSelectGame={onSelectGame}
            isIntroActive={isIntroActive}
            onIntroComplete={onIntroComplete}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
