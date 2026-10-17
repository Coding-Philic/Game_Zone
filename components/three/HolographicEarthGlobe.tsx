"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface HolographicEarthGlobeProps {
  position?: [number, number, number];
  scale?: number;
}

// Generate a procedural earth texture on canvas — landmasses, cyan coasts, golden grid
function useEarthTextures() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;

    const W = 1024;
    const H = 512;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const context = ctx;

    // Transparent base (ocean)
    ctx.clearRect(0, 0, W, H);

    // Helper: draw organic continent blob
    function blob(
      cx: number,
      cy: number,
      rx: number,
      ry: number,
      points: [number, number][],
      rotation = 0
    ) {
      context.save();
      context.translate(cx, cy);
      context.rotate(rotation);
      context.beginPath();
      const len = points.length;
      context.moveTo(points[0][0] * rx, points[0][1] * ry);
      for (let i = 1; i < len; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        // smooth with quadratic curve
        const mx = (p0[0] + p1[0]) * 0.5;
        const my = (p0[1] + p1[1]) * 0.5;
        context.quadraticCurveTo(p0[0] * rx, p0[1] * ry, mx * rx, my * ry);
      }
      // close
      const last = points[len - 1];
      const first = points[0];
      const mx = (last[0] + first[0]) * 0.5;
      const my = (last[1] + first[1]) * 0.5;
      context.quadraticCurveTo(last[0] * rx, last[1] * ry, mx * rx, my * ry);
      context.closePath();
      context.fill();
      context.restore();
      return new Path2D();
    }

    // Store paths for coastline stroke — we redraw with stroke
    type Poly = { cx: number; cy: number; rx: number; ry: number; pts: [number, number][]; rot: number };
    const continents: Poly[] = [
      // North America
      { cx: 160, cy: 165, rx: 95, ry: 110, rot: -0.18, pts: [[0,-1],[0.7,-0.8],[1,-0.2],[0.85,0.4],[0.4,0.9],[-0.2,1],[-0.7,0.6],[-1,0],[-0.85,-0.5],[-0.5,-0.9]] },
      // South America
      { cx: 250, cy: 355, rx: 48, ry: 95, rot: 0.1, pts: [[0,-1],[0.6,-0.7],[0.8,-0.1],[0.5,0.5],[0.2,1],[-0.4,0.85],[-0.8,0.2],[-0.6,-0.6],[-0.3,-0.9]] },
      // Africa
      { cx: 550, cy: 295, rx: 62, ry: 118, rot: 0.05, pts: [[0,-1],[0.55,-0.75],[0.85,-0.2],[0.7,0.35],[0.3,0.85],[-0.2,1],[-0.65,0.55],[-0.85,-0.1],[-0.6,-0.65]] },
      // Europe
      { cx: 560, cy: 165, rx: 78, ry: 62, rot: 0.12, pts: [[0,-1],[0.7,-0.75],[1,-0.2],[0.6,0.5],[0,0.9],[-0.6,0.7],[-1,0.1],[-0.7,-0.6],[-0.35,-0.92]] },
      // Asia — large
      { cx: 710, cy: 175, rx: 175, ry: 105, rot: 0.04, pts: [[0,-1],[0.6,-0.85],[1,-0.35],[0.9,0.25],[0.5,0.75],[-0.05,1],[-0.55,0.8],[-0.9,0.3],[-1,-0.2],[-0.75,-0.7],[-0.3,-0.95]] },
      // Australia
      { cx: 810, cy: 390, rx: 58, ry: 38, rot: -0.08, pts: [[0,-1],[0.75,-0.65],[1,0],[0.6,0.7],[-0.05,1],[-0.65,0.6],[-1,-0.05],[-0.6,-0.7]] },
      // Greenland
      { cx: 320, cy: 105, rx: 32, ry: 42, rot: 0.2, pts: [[0,-1],[0.65,-0.65],[0.9,0],[0.5,0.65],[-0.15,1],[-0.7,0.5],[-0.9,-0.2],[-0.45,-0.8]] },
      // Japan / islands filler
      { cx: 870, cy: 210, rx: 18, ry: 48, rot: 0.15, pts: [[0,-1],[0.6,-0.6],[0.7,0.1],[0.3,0.75],[-0.3,1],[-0.75,0.3],[-0.5,-0.55]] },
    ];

    // Fill land — dark blue-grey base (will be tinted by material)
    ctx.fillStyle = "#0e2a3a";
    for (const c of continents) {
      ctx.save();
      ctx.translate(c.cx, c.cy);
      ctx.rotate(c.rot);
      ctx.beginPath();
      const pts = c.pts;
      ctx.moveTo(pts[0][0] * c.rx, pts[0][1] * c.ry);
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const mx = (p0[0] + p1[0]) * 0.5;
        const my = (p0[1] + p1[1]) * 0.5;
        ctx.quadraticCurveTo(p0[0] * c.rx, p0[1] * c.ry, mx * c.rx, my * c.ry);
      }
      const last = pts[pts.length - 1];
      const first = pts[0];
      const mx = (last[0] + first[0]) * 0.5;
      const my = (last[1] + first[1]) * 0.5;
      ctx.quadraticCurveTo(last[0] * c.rx, last[1] * c.ry, mx * c.rx, my * c.ry);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Cyan coastline glow — stroke same shapes with neon cyan
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 2.2;
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 10;
    ctx.lineJoin = "round";
    for (const c of continents) {
      ctx.save();
      ctx.translate(c.cx, c.cy);
      ctx.rotate(c.rot);
      ctx.beginPath();
      const pts = c.pts;
      ctx.moveTo(pts[0][0] * c.rx, pts[0][1] * c.ry);
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const mx = (p0[0] + p1[0]) * 0.5;
        const my = (p0[1] + p1[1]) * 0.5;
        ctx.quadraticCurveTo(p0[0] * c.rx, p0[1] * c.ry, mx * c.rx, my * c.ry);
      }
      const last = pts[pts.length - 1];
      const first = pts[0];
      ctx.quadraticCurveTo(last[0] * c.rx, last[1] * c.ry, (last[0]+first[0])*0.5*c.rx, (last[1]+first[1])*0.5*c.ry);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    ctx.shadowBlur = 0;

    // Clip to land and draw golden city grid
    ctx.save();
    // Rebuild clip from continents
    ctx.beginPath();
    for (const c of continents) {
      ctx.save();
      // translate/rotate can't be inside clip path directly, so we transform points
      const cos = Math.cos(c.rot), sin = Math.sin(c.rot);
      const pts = c.pts;
      const tp = pts.map(([x, y]) => [
        c.cx + (x * c.rx * cos - y * c.ry * sin),
        c.cy + (x * c.rx * sin + y * c.ry * cos),
      ] as [number, number]);
      ctx.moveTo(tp[0][0], tp[0][1]);
      for (let i = 1; i < tp.length; i++) {
        const p0 = tp[i - 1], p1 = tp[i];
        const mx = (p0[0] + p1[0]) * 0.5, my = (p0[1] + p1[1]) * 0.5;
        // approximate curve — use mid
        ctx.lineTo(mx, my);
        ctx.lineTo(p1[0], p1[1]);
      }
      ctx.closePath();
      ctx.restore();
    }
    // Use evenodd clip effect via composite
    // Instead draw grid then mask with land alpha
    ctx.restore();

    // Golden grid lines — longitudinal + latitudinal, clipped to land via globalCompositeOperation
    // Create temporary canvas for grid, then mask
    const gridCanvas = document.createElement("canvas");
    gridCanvas.width = W;
    gridCanvas.height = H;
    const gctx = gridCanvas.getContext("2d")!;
    gctx.strokeStyle = "rgba(245, 158, 11, 0.95)";
    gctx.lineWidth = 0.9;
    gctx.shadowColor = "#f59e0b";
    gctx.shadowBlur = 6;

    // Vertical meridians
    for (let x = 0; x < W; x += 42) {
      gctx.beginPath();
      gctx.moveTo(x, 0);
      // Slight curve for projection feel
      gctx.bezierCurveTo(x + 8, H * 0.33, x - 8, H * 0.66, x, H);
      gctx.stroke();
    }
    // Horizontal parallels
    for (let y = 24; y < H; y += 42) {
      gctx.beginPath();
      gctx.moveTo(0, y);
      gctx.lineTo(W, y);
      gctx.stroke();
    }
    // City nodes — golden dots at intersections inside land
    gctx.fillStyle = "#fbbf24";
    gctx.shadowBlur = 10;
    const nodes: [number, number][] = [
      [162, 178], [185, 148], [548, 282], [565, 162], [682, 168],
      [735, 205], [802, 388], [248, 348], [318, 98], [872, 212],
      [660, 250], [590, 310], [710, 315], [430, 195], [300, 220],
    ];
    for (const [x, y] of nodes) {
      gctx.beginPath();
      gctx.arc(x, y, 2.4, 0, Math.PI * 2);
      gctx.fill();
      // outer glow
      gctx.beginPath();
      gctx.fillStyle = "rgba(251,191,36,0.22)";
      gctx.arc(x, y, 6, 0, Math.PI * 2);
      gctx.fill();
      gctx.fillStyle = "#fbbf24";
    }

    // Mask grid to land area only
    ctx.save();
    ctx.globalCompositeOperation = "source-in";
    // Need land mask — recreate land fill as mask
    // Instead we composite gridCanvas onto main where land exists:
    // Draw land alpha mask then use source-in — simpler: draw gridCanvas with destination-in via land
    ctx.drawImage(gridCanvas, 0, 0);
    // Re-apply land alpha: keep only where original land was — we already have land pixels,
    // but gridCanvas on top with source-in will keep overlap only on next draw.
    // Actually we just drew grid on top of existing canvas without clipping correctly.
    // Reset and do proper clip: we need to clip grid to land shape.
    ctx.restore();

    // Correct masking: use compositing trick — draw grid clipped
    // Create mask canvas with land silhouette
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = W;
    maskCanvas.height = H;
    const mctx = maskCanvas.getContext("2d")!;
    mctx.fillStyle = "#fff";
    for (const c of continents) {
      mctx.save();
      mctx.translate(c.cx, c.cy);
      mctx.rotate(c.rot);
      mctx.beginPath();
      const pts = c.pts;
      mctx.moveTo(pts[0][0] * c.rx, pts[0][1] * c.ry);
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1], p1 = pts[i];
        const mx = (p0[0] + p1[0]) * 0.5, my = (p0[1] + p1[1]) * 0.5;
        mctx.quadraticCurveTo(p0[0] * c.rx, p0[1] * c.ry, mx * c.rx, my * c.ry);
      }
      const last2 = pts[pts.length - 1], first2 = pts[0];
      mctx.quadraticCurveTo(last2[0]*c.rx, last2[1]*c.ry, (last2[0]+first2[0])*0.5*c.rx, (last2[1]+first2[1])*0.5*c.ry);
      mctx.closePath();
      mctx.fill();
      mctx.restore();
    }
    // Composite: keep grid only where mask is white
    const finalGrid = document.createElement("canvas");
    finalGrid.width = W;
    finalGrid.height = H;
    const fctx = finalGrid.getContext("2d")!;
    fctx.drawImage(gridCanvas, 0, 0);
    fctx.globalCompositeOperation = "destination-in";
    fctx.drawImage(maskCanvas, 0, 0);
    // Merge back onto main canvas
    ctx.drawImage(finalGrid, 0, 0);

    // Re-stroke cyan coast on top for crispness
    ctx.strokeStyle = "rgba(0, 240, 255, 0.95)";
    ctx.lineWidth = 1.4;
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 8;
    for (const c of continents) {
      ctx.save();
      ctx.translate(c.cx, c.cy);
      ctx.rotate(c.rot);
      ctx.beginPath();
      const pts = c.pts;
      ctx.moveTo(pts[0][0] * c.rx, pts[0][1] * c.ry);
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1], p1 = pts[i];
        const mx = (p0[0] + p1[0]) * 0.5, my = (p0[1] + p1[1]) * 0.5;
        ctx.quadraticCurveTo(p0[0] * c.rx, p0[1] * c.ry, mx * c.rx, my * c.ry);
      }
      const last3 = pts[pts.length - 1], first3 = pts[0];
      ctx.quadraticCurveTo(last3[0]*c.rx, last3[1]*c.ry, (last3[0]+first3[0])*0.5*c.rx, (last3[1]+first3[1])*0.5*c.ry);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    ctx.shadowBlur = 0;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;

    // Emissive version — only coast + grid glow
    const emissiveCanvas = document.createElement("canvas");
    emissiveCanvas.width = W;
    emissiveCanvas.height = H;
    const ectx = emissiveCanvas.getContext("2d")!;
    ectx.clearRect(0, 0, W, H);
    // Coast emissive
    ectx.strokeStyle = "#00f0ff";
    ectx.lineWidth = 2.6;
    ectx.shadowColor = "#00f0ff";
    ectx.shadowBlur = 14;
    for (const c of continents) {
      ectx.save();
      ectx.translate(c.cx, c.cy);
      ectx.rotate(c.rot);
      ectx.beginPath();
      const pts = c.pts;
      ectx.moveTo(pts[0][0] * c.rx, pts[0][1] * c.ry);
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1], p1 = pts[i];
        const mx = (p0[0] + p1[0]) * 0.5, my = (p0[1] + p1[1]) * 0.5;
        ectx.quadraticCurveTo(p0[0] * c.rx, p0[1] * c.ry, mx * c.rx, my * c.ry);
      }
      const last = pts[pts.length - 1], first = pts[0];
      ectx.quadraticCurveTo(last[0]*c.rx, last[1]*c.ry, (last[0]+first[0])*0.5*c.rx, (last[1]+first[1])*0.5*c.ry);
      ectx.closePath();
      ectx.stroke();
      ectx.restore();
    }
    ectx.shadowBlur = 0;
    // Grid emissive clipped
    ectx.drawImage(finalGrid, 0, 0);

    const emissiveTexture = new THREE.CanvasTexture(emissiveCanvas);
    emissiveTexture.colorSpace = THREE.SRGBColorSpace;
    emissiveTexture.needsUpdate = true;

    return { map: texture, emissiveMap: emissiveTexture };
  }, []);
}

export default function HolographicEarthGlobe({
  position = [0, 10.5, -2],
  scale = 1.22,
}: HolographicEarthGlobeProps) {
  const globeGroupRef = useRef<THREE.Group>(null);
  const ringsRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);

  const textures = useEarthTextures();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (globeGroupRef.current) {
      globeGroupRef.current.rotation.y = t * 0.12;
      // slight axial tilt wobble
      globeGroupRef.current.rotation.x = Math.sin(t * 0.15) * 0.04;
    }
    if (ringsRef.current) {
      ringsRef.current.rotation.y = -t * 0.28;
      ringsRef.current.rotation.z = Math.sin(t * 0.22) * 0.06;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y = t * 0.9;
      coreRef.current.rotation.x = t * 0.4;
      const s = 1 + Math.sin(t * 1.6) * 0.06;
      coreRef.current.scale.set(s, s, s);
    }
    if (atmosphereRef.current) {
      const mat = atmosphereRef.current.material as THREE.ShaderMaterial;
      if (mat.uniforms?.time) mat.uniforms.time.value = t;
    }
  });

  // Atmospheric fresnel shader — soft cyan rim glow
  const atmosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        colorA: { value: new THREE.Color("#00f0ff") },
        colorB: { value: new THREE.Color("#f59e0b") },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPositionW;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vPositionW = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 colorA;
        uniform vec3 colorB;
        varying vec3 vNormal;
        varying vec3 vPositionW;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vPositionW);
          float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.8);
          float pulse = 0.65 + 0.35 * sin(time * 1.4);
          // mix cyan → amber at rim
          vec3 col = mix(colorA, colorB, fresnel * 0.35);
          float alpha = fresnel * 0.55 * pulse;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    });
  }, []);

  // Data rune texture for orbital ring — canvas with repeating glyphs
  const runeTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 64;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, 512, 64);
    ctx.fillStyle = "#00f0ff";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 8;
    ctx.font = "600 22px monospace";
    const glyphs = ["◈", "⬡", "⬢", "⟐", "⟡", "⬔", "⬣", "⟠", "◬", "⬓"];
    ctx.textBaseline = "middle";
    for (let i = 0; i < 16; i++) {
      const g = glyphs[i % glyphs.length];
      const x = i * 32 + 8;
      ctx.fillText(g, x, 32);
      // tiny binary beneath
      ctx.font = "400 7px monospace";
      ctx.fillStyle = "rgba(245,158,11,0.9)";
      ctx.fillText(Math.random() > 0.5 ? "01" : "10", x + 4, 48);
      ctx.font = "600 22px monospace";
      ctx.fillStyle = i % 2 === 0 ? "#00f0ff" : "#f59e0b";
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(3, 1);
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <group position={position} scale={scale}>
      {/* Inner digital core — self-illuminated icosahedron wireframe */}
      <mesh ref={coreRef} position={[0, 0, 0]}>
        <icosahedronGeometry args={[1.05, 3]} />
        <meshStandardMaterial
          color="#021018"
          emissive="#00f0ff"
          emissiveIntensity={1.15}
          wireframe
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Inner core glow sphere */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.82, 32, 32]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.08} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.18, 32, 32]} />
        <meshBasicMaterial
          color="#f59e0b"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Obsidian ocean sphere — transparent dark PBR */}
      <mesh>
        <sphereGeometry args={[2.0, 64, 64]} />
        <meshPhysicalMaterial
          color="#040a18"
          roughness={0.14}
          metalness={0.92}
          transparent
          opacity={0.52}
          transmission={0.18}
          thickness={0.9}
          clearcoat={1}
          clearcoatRoughness={0.18}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* Specular highlight shell — slightly larger for gleam */}
      <mesh>
        <sphereGeometry args={[2.015, 64, 64]} />
        <meshPhysicalMaterial
          color="#061426"
          roughness={0.08}
          metalness={0.96}
          transparent
          opacity={0.14}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Continental landmasses with neon coast & golden city grid */}
      {textures && (
        <mesh>
          <sphereGeometry args={[2.03, 64, 64]} />
          <meshStandardMaterial
            map={textures.map}
            emissiveMap={textures.emissiveMap}
            emissive="#ffffff"
            emissiveIntensity={1.35}
            roughness={0.42}
            metalness={0.78}
            transparent
            opacity={1}
          />
        </mesh>
      )}

      {/* Golden wireframe lat/long overlay — subtle second shell for PBR metallic sheen */}
      <mesh>
        <sphereGeometry args={[2.035, 32, 32]} />
        <meshBasicMaterial
          color="#f59e0b"
          wireframe
          transparent
          opacity={0.035}
        />
      </mesh>

      {/* Fresnel atmosphere — cyan→amber rim */}
      <mesh ref={atmosphereRef} scale={[1.18, 1.18, 1.18]}>
        <sphereGeometry args={[2.04, 64, 64]} />
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh>

      {/* Floating concentric orbital rings — equator */}
      <group ref={ringsRef}>
        {/* Primary cyan ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.58, 0.025, 16, 128]} />
          <meshStandardMaterial
            color="#0a0a0a"
            emissive="#00f0ff"
            emissiveIntensity={2.2}
            roughness={0.2}
            metalness={0.9}
          />
        </mesh>

        {/* Secondary amber ring — tilted 8deg */}
        <mesh rotation={[Math.PI / 2 + 0.14, 0, 0]}>
          <torusGeometry args={[2.82, 0.018, 16, 128]} />
          <meshStandardMaterial
            color="#0a0a0a"
            emissive="#f59e0b"
            emissiveIntensity={2.0}
            roughness={0.2}
            metalness={0.9}
          />
        </mesh>

        {/* Outer thin cyan ring */}
        <mesh rotation={[Math.PI / 2, 0, 0.18]}>
          <torusGeometry args={[3.06, 0.013, 16, 128]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.9} />
        </mesh>

        {/* Data runes band — thin torus with rune texture */}
        {runeTexture && (
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <cylinderGeometry args={[2.59, 2.59, 0.09, 64, 1, true]} />
            <meshBasicMaterial
              map={runeTexture}
              transparent
              opacity={0.92}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        )}

        {/* Orbital tick marks — small amber notches */}
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const r = 2.58;
          return (
            <mesh
              key={`tick-${i}`}
              position={[Math.cos(a) * r, 0, Math.sin(a) * r]}
              rotation={[0, -a, 0]}
            >
              <boxGeometry args={[0.07, 0.015, 0.025]} />
              <meshBasicMaterial color={i % 3 === 0 ? "#f59e0b" : "#00f0ff"} />
            </mesh>
          );
        })}

        {/* Floating data nodes on outer ring */}
        {[0, 72, 144, 216, 288].map((deg, idx) => {
          const a = (deg * Math.PI) / 180;
          const r = 3.06;
          return (
            <group
              key={`node-${idx}`}
              position={[Math.cos(a) * r, Math.sin(a * 0.6) * 0.12, Math.sin(a) * r]}
            >
              <mesh>
                <octahedronGeometry args={[0.08, 0]} />
                <meshStandardMaterial
                  color="#ffffff"
                  emissive={idx % 2 === 0 ? "#00f0ff" : "#f59e0b"}
                  emissiveIntensity={2.4}
                />
              </mesh>
              <mesh>
                <sphereGeometry args={[0.13, 12, 12]} />
                <meshBasicMaterial
                  color={idx % 2 === 0 ? "#00f0ff" : "#f59e0b"}
                  transparent
                  opacity={0.14}
                />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* Top/bottom polar caps — subtle holographic poles */}
      <mesh position={[0, 2.02, 0]} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.08, 0.22, 32]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -2.02, 0]} rotation={[Math.PI, 0, 0]}>
        <ringGeometry args={[0.08, 0.22, 32]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.42} side={THREE.DoubleSide} />
      </mesh>

      {/* Contact shadow — soft disc beneath */}
      <mesh position={[0, -2.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.9, 3.0, 64]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.07} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
