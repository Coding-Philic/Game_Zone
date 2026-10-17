"use client";

import { useRef, useMemo, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { GAMES, type Game } from "@/config/site";
import { sound } from "@/lib/audio";

// Preload the real 3D Earth model
useGLTF.preload("/models/earth.glb");

// Deterministic Pseudo-Random Generator (satisfies React 19 / Compiler purity rules)
function createPRNG(initialSeed: number) {
  let s = initialSeed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Cubic easing for heavy cinematic weight
function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

// Generate high-res 3D holographic badges for cards (header & footer)
function createCardHoloBadgeTexture(game: Game, type: "header" | "footer", neonColor: string) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 90;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, 512, 90);

  if (type === "header") {
    // Semi-translucent cyber HUD badge
    ctx.fillStyle = "rgba(6, 10, 20, 0.94)";
    if (ctx.roundRect) {
      ctx.roundRect(6, 6, 500, 78, 14);
    } else {
      ctx.rect(6, 6, 500, 78);
    }
    ctx.fill();

    ctx.lineWidth = 3.5;
    ctx.strokeStyle = neonColor;
    ctx.stroke();

    // Corner cyber tick marks
    ctx.fillStyle = neonColor;
    ctx.fillRect(10, 10, 8, 8);
    ctx.fillRect(494, 10, 8, 8);

    // Title and category
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 24px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${game.name.toUpperCase()} // ARENA QUALIFIER`, 256, 45);
  } else {
    // Register button CTA badge
    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, "rgba(245, 158, 11, 0.95)");
    grad.addColorStop(0.5, "rgba(253, 224, 71, 1)");
    grad.addColorStop(1, "rgba(245, 158, 11, 0.95)");
    ctx.fillStyle = grad;

    if (ctx.roundRect) {
      ctx.roundRect(14, 8, 484, 74, 16);
    } else {
      ctx.rect(14, 8, 484, 74);
    }
    ctx.fill();

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    ctx.fillStyle = "#03060f";
    ctx.font = "900 24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚡ LOCK IN TEAM • CLICK TO REGISTER", 256, 45);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Generate smooth circular radial-glow texture for stars & particles (no square edges)
function createCircleParticleTexture() {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.25, "rgba(255, 255, 255, 0.85)");
  gradient.addColorStop(0.55, "rgba(255, 255, 255, 0.35)");
  gradient.addColorStop(0.85, "rgba(255, 255, 255, 0.08)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// --- CAMERA SPLINE PATHS ---
export const cameraPathPoints = [
  new THREE.Vector3(0, 4.8, 54), // 0.00: Entrance gateway - EXPANSIVE FAR stadium overview
  new THREE.Vector3(0, 4.0, 32), // 0.08: Flying through entrance gateway towards Earth
  new THREE.Vector3(-5, 4.0, 20), // 0.14: Earth begins dispersal, approach Tekken
  new THREE.Vector3(-10, 4.2, 14), // 0.20: LOCKED ON CARD 1 (Tekken 8)
  new THREE.Vector3(-10, 4.2, 14), // 0.24: Front & center view
  new THREE.Vector3(-8.5, 4.0, 4), // 0.30: Moving towards Card 2
  new THREE.Vector3(-8, 4.2, -6), // 0.36: LOCKED ON CARD 2 (Mortal Kombat)
  new THREE.Vector3(-8, 4.2, -6), // 0.40: Front & center view
  new THREE.Vector3(-4, 4.0, -8.5), // 0.46: Moving towards Card 3
  new THREE.Vector3(0, 4.2, -9.5), // 0.52: LOCKED ON CARD 3 (FIFA 26)
  new THREE.Vector3(0, 4.2, -9.5), // 0.56: Front & center view
  new THREE.Vector3(4, 4.0, -8.5), // 0.62: Moving towards Card 4
  new THREE.Vector3(8, 4.2, -6), // 0.68: LOCKED ON CARD 4 (CODM)
  new THREE.Vector3(8, 4.2, -6), // 0.72: Front & center view
  new THREE.Vector3(8.5, 4.0, 4), // 0.78: Moving towards Card 5
  new THREE.Vector3(10, 4.2, 14), // 0.84: LOCKED ON CARD 5 (BGMI)
  new THREE.Vector3(10, 4.2, 14), // 0.88: Front & center view
  new THREE.Vector3(4, 18, 18), // 0.94: Ascending crane shot
  new THREE.Vector3(0, 28, 10), // 1.00: Zenith God-view
];

export const targetLookAtPoints = [
  new THREE.Vector3(0, 3.8, 8), // 0.00: Sweeping wide overview looking into stadium core
  new THREE.Vector3(-5, 4.0, 8), // 0.08: Anticipate Tekken
  new THREE.Vector3(-16, 4.2, 10), // 0.14: Focus on Tekken 8
  new THREE.Vector3(-16, 4.2, 10), // LOCKED ON TEKKEN 8
  new THREE.Vector3(-16, 4.2, 10), // LOCKED ON TEKKEN 8
  new THREE.Vector3(-14, 4.2, -8), // Focus on MK
  new THREE.Vector3(-14, 4.2, -8), // LOCKED ON MK
  new THREE.Vector3(-14, 4.2, -8), // LOCKED ON MK
  new THREE.Vector3(0, 4.2, -18), // Focus on FIFA
  new THREE.Vector3(0, 4.2, -18), // LOCKED ON FIFA
  new THREE.Vector3(0, 4.2, -18), // LOCKED ON FIFA
  new THREE.Vector3(14, 4.2, -8), // Focus on CODM
  new THREE.Vector3(14, 4.2, -8), // LOCKED ON CODM
  new THREE.Vector3(14, 4.2, -8), // LOCKED ON CODM
  new THREE.Vector3(16, 4.2, 10), // Focus on BGMI
  new THREE.Vector3(16, 4.2, 10), // LOCKED ON BGMI
  new THREE.Vector3(16, 4.2, 10), // LOCKED ON BGMI
  new THREE.Vector3(0, 2, 0), // Looking down at stadium
  new THREE.Vector3(0, 0, 0), // Looking down at all cards
];

interface CyberArenaSceneProps {
  scrollProgress: number; // 0 to 1
  mouse: { x: number; y: number };
  onSelectGame: (game: Game) => void;
  isIntroActive?: boolean;
  onIntroComplete?: () => void;
}

export default function CyberArenaScene({
  scrollProgress,
  mouse,
  onSelectGame,
  isIntroActive = false,
  onIntroComplete,
}: CyberArenaSceneProps) {
  const { camera } = useThree();

  const cameraCurve = useMemo(
    () => new THREE.CatmullRomCurve3(cameraPathPoints, false, "catmullrom", 0.5),
    []
  );
  const lookAtCurve = useMemo(
    () => new THREE.CatmullRomCurve3(targetLookAtPoints, false, "catmullrom", 0.5),
    []
  );

  const currentPos = useRef(new THREE.Vector3(0, 4.8, 54));
  const currentLookAt = useRef(new THREE.Vector3(0, 3.8, 8));

  const introTime = useRef(0);
  const audioTriggered = useRef<{ [key: string]: boolean }>({});

  useFrame((_, delta) => {
    // 1. Advance Intro Clock
    if (isIntroActive) {
      introTime.current += delta;
      const t = introTime.current;

      // Audio triggers during intro
      if (t > 0.08 && !audioTriggered.current.rumble) {
        audioTriggered.current.rumble = true;
        sound.playSeismicRumble();
      }
      if (t > 0.65 && !audioTriggered.current.l1) {
        audioTriggered.current.l1 = true;
        sound.playLightning();
      }
      if (t > 1.45 && !audioTriggered.current.l2) {
        audioTriggered.current.l2 = true;
        sound.playLightning();
      }
      if (t > 2.25 && !audioTriggered.current.l3) {
        audioTriggered.current.l3 = true;
        sound.playLightning();
      }
      if (t > 3.0 && !audioTriggered.current.warp) {
        audioTriggered.current.warp = true;
        sound.playWarp();
      }

      if (t >= 3.8) {
        onIntroComplete?.();
      }
    } else {
      introTime.current = 10;
    }

    const t = introTime.current;
    const clampedProgress = THREE.MathUtils.clamp(scrollProgress, 0, 1);

    if (t < 3.8) {
      // Seismic Camera Shake & Cinematic Intro Track
      const p = Math.min(1, t / 3.8);
      const easeP = easeOutCubic(p);

      // Camera starts at dramatic low angle [0, 3.2, 46], pulls back to [0, 4.8, 54]
      const startX = 0;
      const startY = 3.2;
      const startZ = 46;

      const endX = cameraPathPoints[0].x;
      const endY = cameraPathPoints[0].y;
      const endZ = cameraPathPoints[0].z;

      const camX = THREE.MathUtils.lerp(startX, endX, easeP);
      const camY = THREE.MathUtils.lerp(startY, endY, easeP);
      const camZ = THREE.MathUtils.lerp(startZ, endZ, easeP);

      // Violent earthquake camera rumble
      const shakeDecay = Math.max(0, 1 - t / 3.2);
      const shakeAmountX = (Math.sin(t * 36) + Math.cos(t * 51)) * 0.45 * shakeDecay;
      const shakeAmountY = (Math.sin(t * 42) + Math.cos(t * 29)) * 0.35 * shakeDecay;

      currentPos.current.set(camX + shakeAmountX, camY + shakeAmountY, camZ);
      currentLookAt.current.set(0, 3.8 + Math.sin(t * 30) * 0.2 * shakeDecay, 8);
    } else {
      // Normal interactive camera navigation
      const targetPos = cameraCurve.getPoint(clampedProgress);
      const targetLook = lookAtCurve.getPoint(clampedProgress);

      const parallaxX = mouse.x * 0.35;
      const parallaxY = -mouse.y * 0.2;

      targetPos.x += parallaxX;
      targetPos.y += parallaxY;

      currentPos.current.lerp(targetPos, Math.min(delta * 5.0, 1));
      currentLookAt.current.lerp(targetLook, Math.min(delta * 5.0, 1));
    }

    camera.position.copy(currentPos.current);
    camera.lookAt(currentLookAt.current);
  });

  return (
    <>
      {/* Enhanced Stadium Lighting */}
      <StadiumLighting scrollProgress={scrollProgress} />

      {/* Cinematic Lightning Strikes & Sky Flares */}
      <CinematicLightning introTimeRef={introTime} />

      {/* 1. Natural Cyber Stadium Environment */}
      <ArenaStadiumGround />
      <LandCracksFissures introTimeRef={introTime} />
      <StadiumGrandstands />
      <OverheadStadiumArches />
      <StadiumFloodlightTowers introTimeRef={introTime} />

      {/* 2. Blockbuster Sci-Fi Movie Gateway Pillars */}
      <SciFiMovieGateway introTimeRef={introTime} />

      {/* 3. Real 3D Earth with Particle Dispersal */}
      <DispersingEarth scrollProgress={scrollProgress} introTimeRef={introTime} />

      {/* 4. Techfest 3D Game Station Monoliths */}
      <GameStations onSelectGame={onSelectGame} introTimeRef={introTime} />

      {/* 5. Glowing Circular Multi-Colored Twinkling Stars */}
      <GlowingCircularStars count={1600} />
    </>
  );
}

// -------------------------------------------------------------
// 0. ENHANCED STADIUM LIGHTING SETUP
// -------------------------------------------------------------
function StadiumLighting({ scrollProgress }: { scrollProgress: number }) {
  const spotRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);

  useFrame(() => {
    if (spotRef.current && targetRef.current) {
      // Dynamic spotlight follows the active game station
      if (scrollProgress < 0.26) {
        targetRef.current.position.set(-16, 4.2, 10); // Tekken 8
      } else if (scrollProgress < 0.42) {
        targetRef.current.position.set(-14, 4.2, -8); // Mortal Kombat
      } else if (scrollProgress < 0.58) {
        targetRef.current.position.set(0, 4.2, -18); // FIFA 26
      } else if (scrollProgress < 0.74) {
        targetRef.current.position.set(14, 4.2, -8); // CODM
      } else if (scrollProgress < 0.9) {
        targetRef.current.position.set(16, 4.2, 10); // BGMI
      } else {
        targetRef.current.position.set(0, 2, 0); // Center pitch
      }
      spotRef.current.target = targetRef.current;
    }
  });

  return (
    <>
      {/* Deep Cyber Arena Ambient Tone */}
      <ambientLight intensity={0.7} color="#0c1328" />

      {/* Stadium Key Floodlight (Warm Golden Sun/Arena Flood) */}
      <directionalLight
        position={[25, 45, 30]}
        intensity={2.0}
        color="#fff5db"
      />

      {/* Cyber Rim Light (Cool Cyber Cyan from opposite side) */}
      <directionalLight
        position={[-30, 35, -25]}
        intensity={1.5}
        color="#00e5ff"
      />

      {/* Center Court Core Point Light */}
      <pointLight position={[0, 8, 0]} intensity={4.5} color="#f59e0b" distance={45} />

      {/* Dynamic Active-Target Stadium Follow-Spot */}
      <object3D ref={targetRef} position={[-16, 4.2, 10]} />
      <spotLight
        ref={spotRef}
        position={[0, 32, 12]}
        angle={0.45}
        penumbra={0.7}
        intensity={5.0}
        color="#38bdf8"
        distance={65}
      />
    </>
  );
}

// -------------------------------------------------------------
// CINEMATIC LIGHTNING STRIKES & 3D JAGGED BOLTS
// -------------------------------------------------------------
function CinematicLightning({ introTimeRef }: { introTimeRef: { current: number } }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const flashLightRef = useRef<THREE.DirectionalLight>(null);
  const boltsRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const t = introTimeRef.current;
    let flash = 0;
    let boltsVisible = false;

    // Strike 1: Ground fissure strike
    if (t > 0.6 && t < 0.78) {
      flash = Math.sin((t - 0.6) * Math.PI * 5) > 0.15 ? 26 : 0;
      boltsVisible = true;
    }
    // Strike 2: Left/Right Pillars Eruption Strike
    else if (t > 1.4 && t < 1.68) {
      flash = Math.sin((t - 1.4) * Math.PI * 10) > 0.2 ? 35 : 0;
      boltsVisible = true;
    }
    // Strike 3: Arena Power Surge Strike
    else if (t > 2.2 && t < 2.45) {
      flash = Math.sin((t - 2.2) * Math.PI * 8) > 0.2 ? 38 : 0;
      boltsVisible = true;
    }
    // Strike 4: Grand Power-Grid Ignition
    else if (t > 2.9 && t < 3.1) {
      flash = 28;
      boltsVisible = true;
    }

    if (lightRef.current) {
      lightRef.current.intensity = flash;
    }
    if (flashLightRef.current) {
      flashLightRef.current.intensity = flash * 0.7;
    }
    if (boltsRef.current) {
      boltsRef.current.visible = boltsVisible;
    }
  });

  return (
    <group>
      {/* High-Intensity Strobe Point Light */}
      <pointLight
        ref={lightRef}
        position={[0, 18, 14]}
        color="#cffafe"
        distance={120}
        intensity={0}
      />
      {/* Sky Flash Directional Light */}
      <directionalLight
        ref={flashLightRef}
        position={[0, 45, 10]}
        color="#e0f2fe"
        intensity={0}
      />

      {/* 3D Visual Jagged Lightning Bolts */}
      <group ref={boltsRef} visible={false}>
        <LightningBolt startPoint={[0, 42, 10]} endPoint={[0, 0, 0]} color="#00f0ff" seed={111} />
        <LightningBolt startPoint={[-8, 42, 20]} endPoint={[-11, 0, 26]} color="#f59e0b" seed={222} />
        <LightningBolt startPoint={[8, 42, 20]} endPoint={[11, 0, 26]} color="#00e5ff" seed={333} />
        <LightningBolt startPoint={[-12, 42, 0]} endPoint={[-16, 0, 10]} color="#38bdf8" seed={444} />
        <LightningBolt startPoint={[12, 42, 0]} endPoint={[16, 0, 10]} color="#a855f7" seed={555} />
      </group>
    </group>
  );
}

function LightningBolt({
  startPoint,
  endPoint,
  color = "#00f0ff",
  seed = 100,
}: {
  startPoint: [number, number, number];
  endPoint: [number, number, number];
  color?: string;
  seed?: number;
}) {
  const curve = useMemo(() => {
    const prng = createPRNG(seed);
    const pts: THREE.Vector3[] = [];
    const segments = 10;
    const start = new THREE.Vector3(...startPoint);
    const end = new THREE.Vector3(...endPoint);

    for (let i = 0; i <= segments; i++) {
      const alpha = i / segments;
      const pt = new THREE.Vector3().lerpVectors(start, end, alpha);
      if (i > 0 && i < segments) {
        pt.x += (prng() - 0.5) * 3.2;
        pt.z += (prng() - 0.5) * 3.2;
      }
      pts.push(pt);
    }
    return new THREE.CatmullRomCurve3(pts);
  }, [startPoint, endPoint, seed]);

  return (
    <mesh>
      <tubeGeometry args={[curve, 20, 0.15, 4, false]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

// -------------------------------------------------------------
// SEISMIC LAND CRACKS & GLOWING GROUND FISSURES
// -------------------------------------------------------------
function LandCracksFissures({ introTimeRef }: { introTimeRef: { current: number } }) {
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const cracksGroupRef = useRef<THREE.Group>(null);
  const sparksRef = useRef<THREE.Points>(null);
  const sparkGeoRef = useRef<THREE.BufferAttribute>(null);
  const epicenterGlowRef = useRef<THREE.PointLight>(null);

  const starTexture = useMemo(() => createCircleParticleTexture(), []);

  // Straight laser-aligned energy conduits radiating across the battlefield
  const crackCurves = useMemo(() => {
    const targetEndPoints: { pt: [number, number, number]; color: string }[] = [
      { pt: [-11, 0.05, 26], color: "#f59e0b" },  // Towards left gateway pillar
      { pt: [11, 0.05, 26], color: "#00e5ff" },   // Towards right gateway pillar
      { pt: [-16, 0.05, 10], color: "#f59e0b" },  // Towards Tekken 8
      { pt: [-14, 0.05, -8], color: "#ef4444" },  // Towards MK 1
      { pt: [0, 0.05, -18], color: "#10b981" },   // Towards FIFA 26
      { pt: [14, 0.05, -8], color: "#f97316" },   // Towards CODM
      { pt: [16, 0.05, 10], color: "#8b5cf6" },   // Towards BGMI
      { pt: [0, 0.05, 38], color: "#00e5ff" },    // Towards entrance ramp
    ];

    return targetEndPoints.map(({ pt: [tx, ty, tz], color }) => {
      const start = new THREE.Vector3(0, ty, 0);
      const end = new THREE.Vector3(tx, ty, tz);
      return {
        curve: new THREE.CatmullRomCurve3([start, end]),
        color,
      };
    });
  }, []);

  // Precompute 150 crack eruption spark particles
  const sparkData = useMemo(() => {
    const prng = createPRNG(5544);
    const count = 150;
    const initialPos = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = prng() * Math.PI * 2;
      const dist = prng() * 18;
      initialPos[i * 3] = Math.cos(angle) * dist;
      initialPos[i * 3 + 1] = 0.06;
      initialPos[i * 3 + 2] = Math.sin(angle) * dist;

      velocities[i * 3] = (prng() - 0.5) * 1.6;
      velocities[i * 3 + 1] = 2.8 + prng() * 5.0; // Upward velocity out of earth crack
      velocities[i * 3 + 2] = (prng() - 0.5) * 1.6;
    }
    return { initialPos, velocities, count };
  }, []);

  const particlePositions = useMemo(() => new Float32Array(sparkData.initialPos), [sparkData]);

  useFrame(() => {
    const t = introTimeRef.current;

    // 1. Shockwave expansion
    if (shockwaveRef.current) {
      if (t > 0.2 && t < 3.2) {
        shockwaveRef.current.visible = true;
        const p = (t - 0.2) / 3.0;
        const scale = 1 + p * 44;
        shockwaveRef.current.scale.set(scale, scale, 1);
        const mat = shockwaveRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 0.75 * (1 - p));
      } else {
        shockwaveRef.current.visible = false;
      }
    }

    // 2. Cracks scale / expansion & glowing intensity
    if (cracksGroupRef.current) {
      if (t < 0.2) {
        cracksGroupRef.current.visible = false;
      } else if (t < 1.8) {
        cracksGroupRef.current.visible = true;
        const p = easeOutCubic((t - 0.2) / 1.6);
        cracksGroupRef.current.scale.set(p, 1, p);
      } else {
        cracksGroupRef.current.visible = true;
        cracksGroupRef.current.scale.set(1, 1, 1);
      }
    }

    // 3. Epicenter subterranean glow
    if (epicenterGlowRef.current) {
      if (t > 0.2 && t < 3.2) {
        const pulse = 6 + Math.sin(t * 12) * 5;
        epicenterGlowRef.current.intensity = pulse;
      } else {
        epicenterGlowRef.current.intensity = 0;
      }
    }

    // 4. Fissure eruption sparks
    if (sparksRef.current && sparkGeoRef.current) {
      if (t > 0.4 && t < 3.2) {
        sparksRef.current.visible = true;
        const dt = t - 0.4;
        const pos = sparkGeoRef.current.array as Float32Array;
        for (let i = 0; i < sparkData.count; i++) {
          const idx = i * 3;
          const cycle = (dt * 1.4 + i * 0.08) % 1.2;
          pos[idx] = sparkData.initialPos[idx] + sparkData.velocities[idx] * cycle;
          pos[idx + 1] = sparkData.initialPos[idx + 1] + sparkData.velocities[idx + 1] * cycle;
          pos[idx + 2] = sparkData.initialPos[idx + 2] + sparkData.velocities[idx + 2] * cycle;
        }
        sparkGeoRef.current.needsUpdate = true;
      } else {
        sparksRef.current.visible = false;
      }
    }
  });

  return (
    <group position={[0, 0.02, 0]}>
      {/* Expanding Seismic Shockwave Disc */}
      <mesh ref={shockwaveRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.8, 1.8, 48]} />
        <meshBasicMaterial
          color="#00f0ff"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Subterranean Epicenter Glow Light */}
      <pointLight
        ref={epicenterGlowRef}
        position={[0, 1.2, 0]}
        color="#00f0ff"
        distance={28}
        intensity={0}
      />

      {/* Straight Laser Conduits Radiating Across the Land */}
      <group ref={cracksGroupRef} visible={false}>
        {crackCurves.map((c, i) => (
          <mesh key={i}>
            <tubeGeometry args={[c.curve, 8, 0.12, 6, false]} />
            <meshBasicMaterial
              color={c.color}
              transparent
              opacity={0.88}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>

      {/* Upward Erupting Seismic Sparks & Molten Embers */}
      <points ref={sparksRef} visible={false}>
        <bufferGeometry>
          <bufferAttribute
            ref={sparkGeoRef}
            attach="attributes-position"
            args={[particlePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.22}
          color="#f59e0b"
          transparent
          opacity={0.9}
          map={starTexture ?? undefined}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

// -------------------------------------------------------------
// 1. REAL 3D EARTH WITH PARTICLE DISPERSAL & MORPH ANIMATION
// -------------------------------------------------------------
function DispersingEarth({
  scrollProgress,
  introTimeRef,
}: {
  scrollProgress: number;
  introTimeRef: { current: number };
}) {
  const gltf = useGLTF("/models/earth.glb");
  const mainGroupRef = useRef<THREE.Group>(null);
  const earthRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const starTexture = useMemo(() => createCircleParticleTexture(), []);

  // Precompute 2,500 particles with deterministic PRNG (React 19 pure)
  const particleCount = 2500;
  const [initialPos, disperseDirections] = useMemo(() => {
    const prng = createPRNG(4242);
    const pos = new Float32Array(particleCount * 3);
    const dirs = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const u = prng();
      const v = prng();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = Math.cbrt(prng()) * 0.3 + 1.6;

      const sinPhi = Math.sin(phi);
      const x = r * sinPhi * Math.cos(theta);
      const y = r * sinPhi * Math.sin(theta);
      const z = r * Math.cos(phi);

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      dirs[i * 3] = x * (2.8 + prng() * 4.0);
      dirs[i * 3 + 1] = y * (2.8 + prng() * 4.0) + (prng() - 0.5) * 2.0;
      dirs[i * 3 + 2] = z * (2.8 + prng() * 4.0);
    }
    return [pos, dirs];
  }, [particleCount]);

  const dynamicPos = useMemo(() => new Float32Array(initialPos), [initialPos]);
  const posAttributeRef = useRef<THREE.BufferAttribute>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const introT = introTimeRef.current;

    // Seismic Emergence from beneath the cracked land
    if (mainGroupRef.current) {
      if (introT < 3.8) {
        const p = THREE.MathUtils.clamp((introT - 0.65) / 1.8, 0, 1);
        const easeEmerge = easeOutCubic(p);
        mainGroupRef.current.position.y = 4.2 - 16 * (1 - easeEmerge);
        const scale = Math.min(1, Math.max(0.01, easeEmerge));
        mainGroupRef.current.scale.set(scale, scale, scale);
      } else {
        mainGroupRef.current.position.y = 4.2;
        mainGroupRef.current.scale.set(1, 1, 1);
      }
    }

    if (earthRef.current) {
      earthRef.current.rotation.y = t * 0.2;

      const disperseFactor = THREE.MathUtils.clamp((scrollProgress - 0.06) / 0.22, 0, 1);
      const scale = THREE.MathUtils.lerp(1.6, 0.01, disperseFactor);
      earthRef.current.scale.set(scale, scale, scale);
      earthRef.current.visible = disperseFactor < 0.96;

      if (posAttributeRef.current) {
        const positions = posAttributeRef.current.array as Float32Array;
        const ease = disperseFactor * disperseFactor;

        for (let i = 0; i < particleCount; i++) {
          const idx = i * 3;
          positions[idx] =
            initialPos[idx] +
            disperseDirections[idx] * ease +
            Math.sin(t * 1.5 + i) * 0.08 * ease;
          positions[idx + 1] =
            initialPos[idx + 1] +
            disperseDirections[idx + 1] * ease +
            Math.cos(t * 1.5 + i) * 0.08 * ease;
          positions[idx + 2] =
            initialPos[idx + 2] +
            disperseDirections[idx + 2] * ease;
        }
        posAttributeRef.current.needsUpdate = true;
      }

      if (particlesRef.current) {
        particlesRef.current.rotation.y = t * 0.08;
        const mat = particlesRef.current.material as THREE.PointsMaterial;
        mat.opacity =
          disperseFactor > 0.01 && disperseFactor < 0.98
            ? 0.95
            : (1 - disperseFactor) * 0.6;
      }
    }
  });

  return (
    <group ref={mainGroupRef} position={[0, 4.2, 0]}>
      {/* Real 3D GLB Earth Model */}
      <group ref={earthRef}>
        <primitive object={gltf.scene} />
      </group>

      {/* Dispersal Particle Cloud (Smooth Glowing Circular Sprites) */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            ref={posAttributeRef}
            attach="attributes-position"
            args={[dynamicPos, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.24}
          color="#00f0ff"
          transparent
          opacity={0.65}
          map={starTexture ?? undefined}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Concentric Gimbal Orbital Rings */}
      <OrbitalGimbalRings scrollProgress={scrollProgress} />
    </group>
  );
}

function OrbitalGimbalRings({ scrollProgress }: { scrollProgress: number }) {
  const innerRef = useRef<THREE.Group>(null);
  const outerRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (innerRef.current) {
      innerRef.current.rotation.x = t * 0.7;
      innerRef.current.rotation.y = t * 0.5;
    }
    if (outerRef.current) {
      outerRef.current.rotation.y = -t * 0.6;
      outerRef.current.rotation.z = t * 0.4;
    }
  });

  const disperseFactor = THREE.MathUtils.clamp((scrollProgress - 0.06) / 0.22, 0, 1);
  const ringScale = THREE.MathUtils.lerp(1.0, 2.8, disperseFactor);
  const ringOpacity = THREE.MathUtils.lerp(0.9, 0.0, disperseFactor);

  if (disperseFactor > 0.95) return null;

  return (
    <group scale={ringScale}>
      <group ref={innerRef}>
        <mesh>
          <torusGeometry args={[2.4, 0.06, 16, 64]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={ringOpacity} />
        </mesh>
      </group>
      <group ref={outerRef}>
        <mesh>
          <torusGeometry args={[3.0, 0.08, 16, 64]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={ringOpacity} />
        </mesh>
      </group>
    </group>
  );
}

// -------------------------------------------------------------
// 2. BLOCKBUSTER SCI-FI MOVIE PILLARS & ARCHITECTURAL GATEWAY
// -------------------------------------------------------------
function SciFiMovieGateway({ introTimeRef }: { introTimeRef: { current: number } }) {
  const gatewayGroupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const t = introTimeRef.current;
    if (gatewayGroupRef.current) {
      if (t < 3.8) {
        // Pillars and gateway emerge bottom to up out of the cracked land
        const p = THREE.MathUtils.clamp((t - 0.45) / 1.85, 0, 1);
        const yOffset = -26 * (1 - easeOutCubic(p));
        gatewayGroupRef.current.position.y = yOffset;
      } else {
        gatewayGroupRef.current.position.y = 0;
      }
    }
  });

  return (
    <group ref={gatewayGroupRef}>
      {/* Primary Gateway Entrance Monoliths (Framing the far entrance view) */}
      <SciFiMoviePillar position={[-11, 0, 26]} accentColor="#f59e0b" />
      <SciFiMoviePillar position={[11, 0, 26]} accentColor="#f59e0b" />

      {/* Massive Overhead Gateway Rafter Truss */}
      <group position={[0, 20.5, 26]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[24, 1.2, 2.4]} />
          <meshStandardMaterial color="#0b101c" roughness={0.25} metalness={0.85} />
        </mesh>
        {/* Gateway Neon Header Line */}
        <mesh position={[0, -0.4, 1.25]}>
          <boxGeometry args={[22, 0.2, 0.1]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
        <mesh position={[0, 0.4, 1.25]}>
          <boxGeometry args={[20, 0.12, 0.1]} />
          <meshBasicMaterial color="#00e5ff" />
        </mesh>
      </group>

      {/* Flanking Stadium Perimeter Sci-Fi Monoliths */}
      <SciFiMoviePillar position={[-28, 0, 0]} accentColor="#00e5ff" />
      <SciFiMoviePillar position={[28, 0, 0]} accentColor="#00e5ff" />
    </group>
  );
}

function SciFiMoviePillar({
  position,
  accentColor = "#f59e0b",
}: {
  position: [number, number, number];
  accentColor?: string;
}) {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Floating magnetic rings oscillate and spin
    if (ring1Ref.current) {
      ring1Ref.current.rotation.y = t * 0.8;
      ring1Ref.current.position.y = 8.5 + Math.sin(t * 1.8) * 0.4;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = -t * 0.6;
      ring2Ref.current.position.y = 14.5 + Math.cos(t * 1.5) * 0.4;
    }

    // Glowing energy pulse travelling up and down the conduit
    if (pulseRef.current) {
      pulseRef.current.position.y = 10 + Math.sin(t * 2.2) * 7.5;
    }

    // Reactor core subtle breathing glow
    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 2.2 + Math.sin(t * 3.0) * 0.8;
    }
  });

  return (
    <group position={position}>
      {/* 1. Heavy Stepped Octagonal Foundation (Y=0 anchored) */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[3.2, 3.8, 0.8, 8]} />
        <meshStandardMaterial color="#080c14" roughness={0.35} metalness={0.8} />
      </mesh>
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[2.5, 3.2, 0.6, 8]} />
        <meshStandardMaterial color="#0f1626" roughness={0.25} metalness={0.9} />
      </mesh>

      {/* Foundation Ground Illumination Ring */}
      <mesh position={[0, 1.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.2, 2.45, 8]} />
        <meshBasicMaterial color={accentColor} side={THREE.DoubleSide} />
      </mesh>

      {/* 4 Diagonal Hydraulic Support Struts (Anchoring the pillar like a movie launchpad) */}
      {([0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2] as const).map((angle, i) => {
        const dist = 2.3;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        return (
          <group key={i} position={[x, 1.8, z]} rotation={[0, -angle, 0]}>
            {/* Hydraulic Piston Base */}
            <mesh rotation={[0, 0, 0.4]}>
              <cylinderGeometry args={[0.2, 0.25, 2.4, 8]} />
              <meshStandardMaterial color="#1f293d" metalness={0.9} roughness={0.2} />
            </mesh>
            {/* Hydraulic Accent Ring */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.3, 0.3, 0.3]} />
              <meshBasicMaterial color={accentColor} />
            </mesh>
          </group>
        );
      })}

      {/* 2. Inner Glowing Plasma Reactor Core */}
      <mesh ref={coreRef} position={[0, 10.5, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 17.5, 16]} />
        <meshStandardMaterial
          color="#00e5ff"
          emissive="#00e5ff"
          emissiveIntensity={2.5}
          roughness={0.1}
          metalness={0.2}
        />
      </mesh>

      {/* 3. Slotted Outer Armor Exoskeleton (Beveled Carbon & Alloy Plates) */}
      <mesh position={[0, 10.5, 0]}>
        <cylinderGeometry args={[1.7, 1.9, 18, 8, 1, true]} />
        <meshStandardMaterial
          color="#060911"
          roughness={0.2}
          metalness={0.95}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Vertical Neon Conduit Channels running up the 4 faces */}
      <mesh position={[0, 10.5, 1.72]}>
        <boxGeometry args={[0.25, 17.5, 0.08]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      <mesh position={[0, 10.5, -1.72]}>
        <boxGeometry args={[0.25, 17.5, 0.08]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      <mesh position={[1.72, 10.5, 0]}>
        <boxGeometry args={[0.08, 17.5, 0.25]} />
        <meshBasicMaterial color="#00e5ff" />
      </mesh>
      <mesh position={[-1.72, 10.5, 0]}>
        <boxGeometry args={[0.08, 17.5, 0.25]} />
        <meshBasicMaterial color="#00e5ff" />
      </mesh>

      {/* Traveling Energy Pulse Node */}
      <mesh ref={pulseRef} position={[0, 10.5, 1.76]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* 4. Levitating Magnetic Torque Rings */}
      <mesh ref={ring1Ref} position={[0, 8.5, 0]}>
        <torusGeometry args={[2.5, 0.12, 12, 32]} />
        <meshStandardMaterial
          color="#00e5ff"
          emissive="#00e5ff"
          emissiveIntensity={1.8}
          metalness={0.9}
        />
      </mesh>
      <mesh ref={ring2Ref} position={[0, 14.5, 0]}>
        <torusGeometry args={[2.3, 0.1, 12, 32]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={1.8}
          metalness={0.9}
        />
      </mesh>

      {/* 5. Crown Capital Emitter Head (Top) */}
      <group position={[0, 20.0, 0]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[2.8, 2.0, 1.4, 8]} />
          <meshStandardMaterial color="#0f1629" roughness={0.2} metalness={0.9} />
        </mesh>
        {/* Projector Lens Ring */}
        <mesh position={[0, 0.72, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.9, 16]} />
          <meshBasicMaterial color="#00e5ff" side={THREE.DoubleSide} />
        </mesh>

        {/* Vertical Sci-Fi Laser Guide Beam shooting skyward */}
        <mesh position={[0, 12, 0]}>
          <cylinderGeometry args={[0.08, 0.45, 24, 16, 1, true]} />
          <meshBasicMaterial
            color="#00e5ff"
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Localized Point Light Casting Glow on Ground & Pillars */}
      <pointLight
        position={[0, 6, 0]}
        intensity={3.5}
        color={accentColor}
        distance={18}
      />
    </group>
  );
}

// -------------------------------------------------------------
// 3. TOURNAMENT PITCH FLOOR & ARENA CIRCUITRY LINES
// -------------------------------------------------------------
function ArenaStadiumGround() {
  const ringsRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ringsRef.current) {
      ringsRef.current.rotation.z = state.clock.getElapsedTime() * 0.03;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Mirror-Polished Obsidian Stadium Pitch Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[220, 220, 1, 1]} />
        <meshStandardMaterial
          color="#03050a"
          roughness={0.15}
          metalness={0.92}
        />
      </mesh>

      {/* High-Tech Tactical Arena Grid */}
      <gridHelper
        args={[220, 110, "#f59e0b", "#0d1b2e"]}
        position={[0, 0.02, 0]}
      />

      {/* Tournament Center Stage Octagon Platform */}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.5, 4.8, 8]} />
        <meshBasicMaterial color="#f59e0b" side={THREE.DoubleSide} />
      </mesh>

      {/* Concentric Stadium Arena Energy Rings */}
      <group ref={ringsRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {[10, 18, 28, 40, 55].map((radius, i) => (
          <mesh key={i}>
            <ringGeometry args={[radius, radius + 0.28, 64]} />
            <meshBasicMaterial
              color={i % 2 === 0 ? "#f59e0b" : "#00f0ff"}
              transparent
              opacity={0.38 - i * 0.05}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>

      {/* 5 Glowing Cyber Circuitry Conduits connecting Center Court to Game Stations */}
      <StadiumEnergyConduits />
    </group>
  );
}

function StadiumEnergyConduits() {
  // Destination points corresponding to the 5 game stations
  const stations = [
    { pt: [-16, 0, 10], color: "#f59e0b" }, // Tekken 8 (Gold)
    { pt: [-14, 0, -8], color: "#ef4444" }, // MK 1 (Crimson)
    { pt: [0, 0, -18], color: "#10b981" },  // FIFA 26 (Emerald)
    { pt: [14, 0, -8], color: "#f97316" },  // CODM (Tactical Orange)
    { pt: [16, 0, 10], color: "#8b5cf6" },  // BGMI (Violet)
  ] as const;

  return (
    <group position={[0, 0.06, 0]}>
      {stations.map(({ pt: [x, , z], color }, i) => {
        const length = Math.sqrt(x * x + z * z);
        const angle = Math.atan2(x, z);
        return (
          <group key={i} rotation={[-Math.PI / 2, 0, -angle + Math.PI / 2]}>
            {/* Glowing Ground Circuit Line */}
            <mesh position={[length / 2, 0, 0]}>
              <planeGeometry args={[length, 0.25]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.7}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// -------------------------------------------------------------
// 4. NATURAL STADIUM GRANDSTANDS & SPECTATOR CROWD LIGHTS
// -------------------------------------------------------------
function StadiumGrandstands() {
  const tiers = [
    { radius: 46, height: 3.2, y: 1.6, color: "#00e5ff" },
    { radius: 53, height: 6.8, y: 3.4, color: "#f59e0b" },
    { radius: 60, height: 10.5, y: 5.25, color: "#8b5cf6" },
    { radius: 68, height: 14.5, y: 7.25, color: "#10b981" },
  ];

  return (
    <group position={[0, 0, 0]}>
      {/* Tiered Architectural Bleacher Amphitheater */}
      {tiers.map((tier, idx) => (
        <group key={idx}>
          {/* Bleacher Tier Risers */}
          <mesh position={[0, tier.y, 0]}>
            <cylinderGeometry
              args={[tier.radius, tier.radius + 6, tier.height, 48, 1, true]}
            />
            <meshStandardMaterial
              color="#070b14"
              roughness={0.4}
              metalness={0.8}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Glowing LED Ribbon Board running along the tier fascia */}
          <mesh position={[0, tier.y + tier.height / 2, 0]}>
            <cylinderGeometry
              args={[tier.radius + 0.1, tier.radius + 0.1, 0.45, 48, 1, true]}
            />
            <meshBasicMaterial color={tier.color} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* Thousands of Glowing Spectator Digital Audience Lights */}
      <StadiumSpectatorLightNodes />
    </group>
  );
}

function StadiumSpectatorLightNodes() {
  const starTexture = useMemo(() => createCircleParticleTexture(), []);

  // Precompute 1,200 spectator lights across the 4 grandstand tiers
  const [positions, colors] = useMemo(() => {
    const prng = createPRNG(9876);
    const count = 1200;
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);

    const palette = [
      new THREE.Color("#00f0ff"), // Cyan
      new THREE.Color("#f59e0b"), // Amber
      new THREE.Color("#a855f7"), // Violet
      new THREE.Color("#f43f5e"), // Pink
      new THREE.Color("#ffffff"), // Pure light
    ];

    for (let i = 0; i < count; i++) {
      const tierIndex = Math.floor(prng() * 4);
      const baseR = 47 + tierIndex * 6.5 + prng() * 5.0;
      const angle = prng() * Math.PI * 2;
      const y = 2.0 + tierIndex * 3.6 + prng() * 1.5;

      pos[i * 3] = Math.cos(angle) * baseR;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(angle) * baseR;

      const c = palette[Math.floor(prng() * palette.length)];
      cols[i * 3] = c.r;
      cols[i * 3 + 1] = c.g;
      cols[i * 3 + 2] = c.b;
    }

    return [pos, cols];
  }, []);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (pointsRef.current) {
      const t = state.clock.getElapsedTime();
      const mat = pointsRef.current.material as THREE.PointsMaterial;
      // Gentle stadium wave pulsation
      mat.opacity = 0.75 + Math.sin(t * 2.0) * 0.2;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.35}
        vertexColors
        transparent
        opacity={0.8}
        map={starTexture ?? undefined}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// -------------------------------------------------------------
// 5. MONUMENTAL OVERHEAD STADIUM ARCH TRUSSES
// -------------------------------------------------------------
function OverheadStadiumArches() {
  const archAngles = [-Math.PI * 0.25, 0, Math.PI * 0.25];

  return (
    <group position={[0, 0, 0]}>
      {archAngles.map((angle, i) => (
        <group key={i} rotation={[0, angle, 0]}>
          {/* Monumental Arched Steel Canopy Girder */}
          <mesh position={[0, 18, 0]}>
            <torusGeometry args={[52, 0.9, 12, 48, Math.PI]} />
            <meshStandardMaterial
              color="#0d1424"
              roughness={0.25}
              metalness={0.85}
            />
          </mesh>
          {/* Glowing Arch Neon Trim */}
          <mesh position={[0, 18, 0]}>
            <torusGeometry args={[52.6, 0.15, 8, 48, Math.PI]} />
            <meshBasicMaterial color={i % 2 === 0 ? "#00f0ff" : "#f59e0b"} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// -------------------------------------------------------------
// 6. STADIUM FLOODLIGHT TOWERS & VOLUMETRIC GOD RAYS
// -------------------------------------------------------------
function StadiumFloodlightTowers({ introTimeRef }: { introTimeRef: { current: number } }) {
  const towersGroupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const introT = introTimeRef.current;
    if (towersGroupRef.current) {
      if (introT < 3.8) {
        const p = THREE.MathUtils.clamp((introT - 0.85) / 1.85, 0, 1);
        const yOffset = -25 * (1 - easeOutCubic(p));
        towersGroupRef.current.position.y = yOffset;
      } else {
        towersGroupRef.current.position.y = 0;
      }
    }
  });

  return (
    <group ref={towersGroupRef}>
      {/* The 3 Monumental Triangular Sky-Blue Spire Pillars on the behind of the arena */}
      <TriangularSkyBluePillar position={[-34, 0, -22]} rotationY={Math.PI * 0.3} />
      <TriangularSkyBluePillar position={[0, 0, -42]} rotationY={0} />
      <TriangularSkyBluePillar position={[34, 0, -22]} rotationY={-Math.PI * 0.3} />

      {/* Flanking Front Stadium Entrance Floodlight Towers */}
      <FrontStadiumTower position={[-28, 0, 32]} color="#00e5ff" />
      <FrontStadiumTower position={[28, 0, 32]} color="#00e5ff" />
    </group>
  );
}

// -------------------------------------------------------------
// MONUMENTAL TRIANGULAR SKY-BLUE SCI-FI SPIRE PILLAR
// -------------------------------------------------------------
function TriangularSkyBluePillar({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  const ring1Ref = useRef<THREE.Group>(null);
  const ring2Ref = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const sparksRef = useRef<THREE.Points>(null);

  const starTexture = useMemo(() => createCircleParticleTexture(), []);

  // Precompute 30 sparkling cyber embers orbiting the pillar
  const sparkCoords = useMemo(() => {
    const prng = createPRNG(Math.abs(position[0] * 100 + position[2]));
    const pos = new Float32Array(30 * 3);
    for (let i = 0; i < 30; i++) {
      const angle = prng() * Math.PI * 2;
      const radius = 1.6 + prng() * 2.2;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = 2 + prng() * 25;
      pos[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return pos;
  }, [position]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // 1. Counter-rotating magnetic triangular rings
    if (ring1Ref.current) {
      ring1Ref.current.rotation.y = t * 0.75;
      ring1Ref.current.position.y = 9.5 + Math.sin(t * 1.5) * 0.45;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = -t * 0.55;
      ring2Ref.current.position.y = 18.5 + Math.cos(t * 1.3) * 0.45;
    }

    // 2. High-speed traveling lightning surge node
    if (pulseRef.current) {
      pulseRef.current.position.y = 14 + Math.sin(t * 2.5) * 11.5;
    }

    // 3. Core breathing luminescence
    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissiveIntensity = 3.5 + Math.sin(t * 4.0) * 1.2;
      }
    }

    // 4. Orbiting spark embers
    if (sparksRef.current) {
      sparksRef.current.rotation.y = t * 0.15;
    }
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* 1. Heavy Stepped Triangular Foundation Pedestal */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[3.2, 4.2, 0.8, 3]} />
        <meshStandardMaterial color="#08101e" roughness={0.2} metalness={0.92} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[2.5, 3.2, 0.5, 3]} />
        <meshStandardMaterial color="#0e1f36" roughness={0.15} metalness={0.95} />
      </mesh>

      {/* Triangular Foundation Neon Trim */}
      <mesh position={[0, 1.22, 0]}>
        <cylinderGeometry args={[2.52, 2.52, 0.08, 3, 1, true]} />
        <meshBasicMaterial color="#00f0ff" side={THREE.DoubleSide} />
      </mesh>

      {/* 2. Inner Radiant Sky-Blue Plasma Reactor Core */}
      <mesh ref={coreRef} position={[0, 14.5, 0]}>
        <cylinderGeometry args={[0.7, 0.9, 27, 3]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#00e5ff"
          emissiveIntensity={4.0}
          roughness={0.08}
          metalness={0.15}
        />
      </mesh>

      {/* 3. Main Triangular Outer Monolith Armor Shaft */}
      <mesh position={[0, 14.5, 0]}>
        <cylinderGeometry args={[1.2, 2.0, 27.5, 3, 1, true]} />
        <meshStandardMaterial
          color="#061224"
          roughness={0.14}
          metalness={0.95}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 4. Glowing Sky-Blue Neon Rails along the 3 Sharp Corners */}
      {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle, i) => {
        const r = 1.62;
        const x = Math.cos(angle + Math.PI / 6) * r;
        const z = Math.sin(angle + Math.PI / 6) * r;
        return (
          <group key={i} position={[x, 14.5, z]}>
            {/* Corner Neon Tube */}
            <mesh>
              <cylinderGeometry args={[0.09, 0.12, 27.2, 8]} />
              <meshBasicMaterial color="#00f0ff" />
            </mesh>
            {/* Outer Accent Fin */}
            <mesh position={[x * 0.1, 0, z * 0.1]}>
              <boxGeometry args={[0.08, 27.2, 0.35]} />
              <meshStandardMaterial color="#38bdf8" roughness={0.1} metalness={0.9} />
            </mesh>
          </group>
        );
      })}

      {/* 5. Floating Magnetic Triangular Rings */}
      <group ref={ring1Ref} position={[0, 9.5, 0]}>
        <mesh>
          <cylinderGeometry args={[2.5, 2.5, 0.28, 3, 1, true]} />
          <meshBasicMaterial color="#00f0ff" side={THREE.DoubleSide} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[2.55, 2.55, 0.12, 3, 1, true]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      </group>

      <group ref={ring2Ref} position={[0, 18.5, 0]}>
        <mesh>
          <cylinderGeometry args={[2.0, 2.0, 0.25, 3, 1, true]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[2.05, 2.05, 0.1, 3, 1, true]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* 6. High-Speed Traveling Energy Node */}
      <group ref={pulseRef} position={[0, 14, 0]}>
        <mesh>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.85, 16, 16]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.65} blending={THREE.AdditiveBlending} />
        </mesh>
        <pointLight color="#00f0ff" intensity={12} distance={20} decay={1.8} />
      </group>

      {/* 7. Dedicated Real Point Lights (Casting Sky-Blue Glow) */}
      <pointLight position={[0, 15, 0]} color="#38bdf8" intensity={18} distance={38} decay={1.6} />
      <pointLight position={[0, 28, 0]} color="#7dd3fc" intensity={25} distance={50} decay={1.4} />

      {/* 8. Triangular Crown Head & Volumetric Sky-Blue Light Cone */}
      <group position={[0, 28.5, 0]}>
        {/* Crown Structure */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[2.0, 1.2, 1.8, 3]} />
          <meshStandardMaterial color="#0a192e" roughness={0.15} metalness={0.95} />
        </mesh>
        {/* Sky-Blue Lens Ring */}
        <mesh position={[0, 0.95, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 1.4, 16]} />
          <meshBasicMaterial color="#00f0ff" side={THREE.DoubleSide} />
        </mesh>

        {/* Vertical Skyward Laser Guide Beam shooting into space */}
        <mesh position={[0, 25, 0]}>
          <cylinderGeometry args={[0.1, 0.7, 50, 16, 1, true]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Volumetric Stage Spotlight Cone Pointing Down into Arena */}
        <mesh position={[0, -2, 0]}>
          <cylinderGeometry args={[0.5, 6.2, 54, 16, 1, true]} />
          <meshBasicMaterial
            color="#00f0ff"
            transparent
            opacity={0.34}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* 9. Orbiting Cyber Spark Embers */}
      <points ref={sparksRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sparkCoords, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.24}
          color="#38bdf8"
          transparent
          opacity={0.85}
          map={starTexture ?? undefined}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

function FrontStadiumTower({
  position,
  color = "#00f0ff",
}: {
  position: [number, number, number];
  color?: string;
}) {
  return (
    <group position={position}>
      {/* Tower Foundation Pad */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[1.5, 2.0, 0.8, 16]} />
        <meshStandardMaterial color="#0c101c" roughness={0.4} metalness={0.8} />
      </mesh>

      {/* Steel Lattice Mast */}
      <mesh position={[0, 12, 0]}>
        <cylinderGeometry args={[0.4, 0.7, 24, 6]} />
        <meshStandardMaterial color="#1a2233" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Floodlight Head Fixture */}
      <mesh position={[0, 24.2, 0]}>
        <boxGeometry args={[3.0, 1.2, 1.4]} />
        <meshStandardMaterial color="#0a0d17" roughness={0.2} metalness={0.9} />
      </mesh>
      <mesh position={[0, 24.2, 0.75]}>
        <boxGeometry args={[2.8, 0.9, 0.1]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Volumetric Stage Spotlight Cone Pointing into the Arena */}
      <mesh position={[0, 24, 0]}>
        <cylinderGeometry args={[0.35, 4.5, 48, 16, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// -------------------------------------------------------------
// 7. GLOWING CIRCULAR MULTI-COLORED TWINKLING STARS
// -------------------------------------------------------------
function GlowingCircularStars({ count = 1600 }: { count?: number }) {
  const starTexture = useMemo(() => createCircleParticleTexture(), []);

  // Multi-color palette for vibrant celestial stadium cosmos
  const [coords, colors, sizes] = useMemo(() => {
    const prng = createPRNG(777);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);

    const palette = [
      new THREE.Color("#00f0ff"), // Cyber Cyan
      new THREE.Color("#fbbf24"), // Amber Gold
      new THREE.Color("#a855f7"), // Neon Violet
      new THREE.Color("#34d399"), // Emerald Green
      new THREE.Color("#f43f5e"), // Electric Pink
      new THREE.Color("#ffffff"), // Bright White Star
    ];

    for (let i = 0; i < count; i++) {
      // Cylindrical distribution filling the whole stadium atmosphere
      const angle = prng() * Math.PI * 2;
      const radius = prng() * 95;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = prng() * 42 + 0.5; // From ground up to high sky
      pos[i * 3 + 2] = Math.sin(angle) * radius;

      const c = palette[Math.floor(prng() * palette.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;

      siz[i] = 0.18 + prng() * 0.28;
    }
    return [pos, col, siz];
  }, [count]);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (pointsRef.current) {
      // Gentle cosmic orbital rotation
      pointsRef.current.rotation.y = t * 0.015;

      // Continuous glowing shimmer & twinkle
      const mat = pointsRef.current.material as THREE.PointsMaterial;
      mat.size = 0.26 + Math.sin(t * 2.5) * 0.05;
      mat.opacity = 0.8 + Math.cos(t * 3.0) * 0.15;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[coords, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.28}
        vertexColors
        transparent
        opacity={0.85}
        map={starTexture ?? undefined}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// -------------------------------------------------------------
// 8. TECHFEST 3D SCI-FI CARD FRAMES (The 5 Game Posters)
// -------------------------------------------------------------
interface StationConfig {
  game: Game;
  position: [number, number, number];
  rotation: [number, number, number];
  neonColor: string;
}

function GameStations({
  onSelectGame,
  introTimeRef,
}: {
  onSelectGame: (g: Game) => void;
  introTimeRef: { current: number };
}) {
  const stations: StationConfig[] = useMemo(() => {
    return [
      {
        game: GAMES[0], // Tekken 8
        position: [-16, 0, 10],
        rotation: [0, Math.PI * 0.35, 0],
        neonColor: "#f59e0b", // Gold
      },
      {
        game: GAMES[1], // Mortal Kombat 1
        position: [-14, 0, -8],
        rotation: [0, Math.PI * 0.15, 0],
        neonColor: "#ef4444", // Crimson
      },
      {
        game: GAMES[2], // FIFA 26
        position: [0, 0, -18],
        rotation: [0, 0, 0],
        neonColor: "#10b981", // Emerald
      },
      {
        game: GAMES[3], // CODM
        position: [14, 0, -8],
        rotation: [0, -Math.PI * 0.15, 0],
        neonColor: "#f97316", // Tactical Orange
      },
      {
        game: GAMES[4], // BGMI
        position: [16, 0, 10],
        rotation: [0, -Math.PI * 0.35, 0],
        neonColor: "#8b5cf6", // Violet
      },
    ];
  }, []);

  return (
    <group>
      {stations.map((st, i) => (
        <Techfest3DCardFrame
          key={st.game.slug}
          config={st}
          index={i}
          introTimeRef={introTimeRef}
          onSelect={() => onSelectGame(st.game)}
        />
      ))}
    </group>
  );
}

function Techfest3DCardFrame({
  config,
  index,
  introTimeRef,
  onSelect,
}: {
  config: StationConfig;
  index: number;
  introTimeRef: { current: number };
  onSelect: () => void;
}) {
  const { game, position, rotation, neonColor } = config;
  const cardStationRef = useRef<THREE.Group>(null);
  const tiltChassisRef = useRef<THREE.Group>(null);
  const scanlineRef = useRef<THREE.Mesh>(null);
  const sparksRef = useRef<THREE.Points>(null);

  const [hovered, setHovered] = useState(false);
  const pointerPos = useRef({ x: 0, y: 0 });

  const starTexture = useMemo(() => createCircleParticleTexture(), []);

  const posterTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load(game.posterUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
  }, [game.posterUrl]);

  const headerBadgeTexture = useMemo(
    () => createCardHoloBadgeTexture(game, "header", neonColor),
    [game, neonColor]
  );
  const footerBadgeTexture = useMemo(
    () => createCardHoloBadgeTexture(game, "footer", neonColor),
    [game, neonColor]
  );

  // Precompute 24 local floating energy sparks
  const sparkCoords = useMemo(() => {
    const prng = createPRNG(game.slug.length * 100);
    const pos = new Float32Array(24 * 3);
    for (let i = 0; i < 24; i++) {
      pos[i * 3] = (prng() - 0.5) * 5.0;
      pos[i * 3 + 1] = prng() * 6.5;
      pos[i * 3 + 2] = (prng() - 0.5) * 2.0;
    }
    return pos;
  }, [game.slug]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const introT = introTimeRef.current;

    let cardYOffset = 0;
    let cardScale = 1;
    if (introT < 3.8) {
      const emergeP = THREE.MathUtils.clamp((introT - 0.85 - index * 0.12) / 1.5, 0, 1);
      const easeEmerge = easeOutCubic(emergeP);
      cardYOffset = -14 * (1 - easeEmerge);
      cardScale = Math.min(1, Math.max(0.01, easeEmerge));
    }

    // 1. Idle Gentle Floating + Intro emergence from the cracked stadium floor
    if (cardStationRef.current) {
      cardStationRef.current.position.y = 4.2 + cardYOffset + Math.sin(t * 1.5 + position[0]) * 0.12;
      cardStationRef.current.scale.set(cardScale, cardScale, cardScale);
    }

    // 2. Interactive 3D Cursor Tilt with Spring Physics
    if (tiltChassisRef.current) {
      const targetRotX = hovered ? pointerPos.current.y * 0.32 : 0;
      const targetRotY = hovered ? -pointerPos.current.x * 0.42 : 0;
      const targetScale = hovered ? 1.06 : 1.0;

      tiltChassisRef.current.rotation.x = THREE.MathUtils.lerp(
        tiltChassisRef.current.rotation.x,
        targetRotX,
        Math.min(delta * 9.0, 1)
      );
      tiltChassisRef.current.rotation.y = THREE.MathUtils.lerp(
        tiltChassisRef.current.rotation.y,
        targetRotY,
        Math.min(delta * 9.0, 1)
      );
      tiltChassisRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        Math.min(delta * 8.0, 1)
      );
    }

    // 3. Holographic Scanline Motion
    if (scanlineRef.current) {
      scanlineRef.current.position.y = Math.sin(t * 3.2 + position[0]) * 2.7;
    }

    // 4. Local Floating Sparks
    if (sparksRef.current) {
      sparksRef.current.rotation.y = t * 0.2;
    }
  });

  const cardWidth = 4.2;
  const cardHeight = 5.8;

  return (
    <group position={position} rotation={rotation}>
      {/* Heavy Cyber Ground Station Pedestal (Bottom Rings Preserved) */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.0, 2.6, 32]} />
        <meshBasicMaterial color={neonColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.3, 1.55, 32]} />
        <meshBasicMaterial color="#f59e0b" side={THREE.DoubleSide} />
      </mesh>

      {/* Floating Vertical Light Beam Column */}
      <mesh position={[0, 1.8, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 3.6, 8]} />
        <meshBasicMaterial color={neonColor} transparent opacity={0.65} />
      </mesh>

      {/* Local Ambient Cyber Energy Sparks */}
      <points ref={sparksRef} position={[0, 1.2, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sparkCoords, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.16}
          color={neonColor}
          transparent
          opacity={hovered ? 0.9 : 0.5}
          map={starTexture ?? undefined}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* 3D INTERACTIVE TILT CHASSIS */}
      <group ref={cardStationRef} position={[0, 4.2, 0]}>
        <group
          ref={tiltChassisRef}
          onPointerMove={(e) => {
            e.stopPropagation();
            if (e.point) {
              const uvX = e.uv ? (e.uv.x - 0.5) * 2 : 0;
              const uvY = e.uv ? (e.uv.y - 0.5) * 2 : 0;
              pointerPos.current = { x: uvX, y: uvY };
            }
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = "pointer";
            sound.playBeep(980, 0.05);
          }}
          onPointerOut={() => {
            setHovered(false);
            pointerPos.current = { x: 0, y: 0 };
            document.body.style.cursor = "auto";
          }}
          onClick={(e) => {
            e.stopPropagation();
            sound.playWarp();
            onSelect();
          }}
        >
          {/* Layer 1: Outer Heavy Carbon Armor Backplate with Rear Heat Fins */}
          <mesh position={[0, 0, -0.05]}>
            <boxGeometry args={[cardWidth + 0.5, cardHeight + 0.5, 0.24]} />
            <meshStandardMaterial
              color="#070a13"
              roughness={0.2}
              metalness={0.92}
            />
          </mesh>

          {/* Layer 2: 24K Mirror Gold Beveled Frame */}
          <mesh position={[0, 0, 0.08]}>
            <boxGeometry args={[cardWidth + 0.28, cardHeight + 0.28, 0.06]} />
            <meshStandardMaterial
              color={hovered ? "#fef08a" : "#f59e0b"}
              metalness={0.98}
              roughness={0.08}
              emissive={hovered ? "#b45309" : "#000000"}
              emissiveIntensity={hovered ? 0.4 : 0}
            />
          </mesh>

          {/* Layer 3: Radiant Neon Perimeter Trench */}
          <mesh position={[0, 0, 0.11]}>
            <boxGeometry args={[cardWidth + 0.1, cardHeight + 0.1, 0.02]} />
            <meshBasicMaterial color={neonColor} />
          </mesh>

          {/* Layer 4: 100% Full High-Fidelity Poster Face */}
          <mesh position={[0, 0, 0.13]}>
            <planeGeometry args={[cardWidth, cardHeight]} />
            <meshBasicMaterial map={posterTexture} toneMapped={false} />
          </mesh>

          {/* Layer 5: Active Holographic Laser Scanline */}
          <mesh ref={scanlineRef} position={[0, 0, 0.15]}>
            <planeGeometry args={[cardWidth - 0.04, 0.06]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Layer 6: Specular Hologram Acrylic Glass Cover */}
          <mesh position={[0, 0, 0.17]}>
            <planeGeometry args={[cardWidth, cardHeight]} />
            <meshStandardMaterial
              color="#ffffff"
              roughness={0.04}
              metalness={0.1}
              transparent
              opacity={0.12}
            />
          </mesh>

          {/* Layer 7: 4 Heavy Golden Cyber Corner Clamps */}
          <mesh position={[-cardWidth / 2 + 0.32, cardHeight / 2 - 0.32, 0.19]}>
            <boxGeometry args={[0.64, 0.64, 0.06]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.96} roughness={0.12} />
          </mesh>
          <mesh position={[cardWidth / 2 - 0.32, cardHeight / 2 - 0.32, 0.19]}>
            <boxGeometry args={[0.64, 0.64, 0.06]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.96} roughness={0.12} />
          </mesh>
          <mesh position={[-cardWidth / 2 + 0.32, -cardHeight / 2 + 0.32, 0.19]}>
            <boxGeometry args={[0.64, 0.64, 0.06]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.96} roughness={0.12} />
          </mesh>
          <mesh position={[cardWidth / 2 - 0.32, -cardHeight / 2 + 0.32, 0.19]}>
            <boxGeometry args={[0.64, 0.64, 0.06]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.96} roughness={0.12} />
          </mesh>

          {/* Micro-LED Corner Screws */}
          {[
            [-cardWidth / 2 + 0.32, cardHeight / 2 - 0.32],
            [cardWidth / 2 - 0.32, cardHeight / 2 - 0.32],
            [-cardWidth / 2 + 0.32, -cardHeight / 2 + 0.32],
            [cardWidth / 2 - 0.32, -cardHeight / 2 + 0.32],
          ].map(([cx, cy], i) => (
            <mesh key={i} position={[cx, cy, 0.23]}>
              <cylinderGeometry args={[0.07, 0.07, 0.04, 8]} />
              <meshBasicMaterial color={neonColor} />
            </mesh>
          ))}

          {/* Layer 8: Floating 3D Holographic Title Badge (Top, Parallax Z=0.25) */}
          <group position={[0, cardHeight / 2 + 0.55, 0.25]}>
            <mesh>
              <planeGeometry args={[cardWidth * 0.92, 0.52]} />
              <meshBasicMaterial
                map={headerBadgeTexture ?? undefined}
                transparent
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>

          {/* Layer 9: Interactive Floating 3D Register Button (Bottom, Parallax Z=0.25) */}
          <group
            position={[0, -cardHeight / 2 - 0.58, 0.25]}
            scale={hovered ? 1.08 : 1.0}
          >
            <mesh>
              <planeGeometry args={[cardWidth * 0.95, 0.62]} />
              <meshBasicMaterial
                map={footerBadgeTexture ?? undefined}
                transparent
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Glowing Emissive Underglow Ring */}
            <mesh position={[0, 0, -0.02]}>
              <planeGeometry args={[cardWidth * 0.98, 0.66]} />
              <meshBasicMaterial
                color={neonColor}
                transparent
                opacity={hovered ? 0.75 : 0.3}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
