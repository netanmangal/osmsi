import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { prefersReduced } from "@/lib/anim";
import { cn } from "@/lib/utils";

const INK = "#1a1511";
const COBALT = "#2036c8";
const WASH = "#ccd4f0";
const PAPER = "#f5efe2";
const SHEET = "#fbf7ec";

/* illustration tints: print-like washes of the token families.
   Structures keep ink linework; fills carry the color story. */
const GOLD_PALE = "#f1e0b8";
const GOLD_DEEP = "#e6cd97";
const GOLD_ACC = "#c98a1f";
const GREEN_PALE = "#dde9da";
const GREEN_DEEP = "#bcd6bd";
const GREEN_ACC = "#3f9e6b";
const RUST_PALE = "#f2cfc4";
const RUST_ACC = "#d95c40";
const WASH_PALE = "#e7ebf8";

/** Hidden-line drafting look: a colored solid that occludes,
    plus its edge wireframe in ink. */
function Wire({
  geo,
  color = SHEET,
  edge = INK,
  edgeOpacity = 0.6,
  threshold = 20,
  ...props
}: {
  geo: THREE.BufferGeometry;
  color?: string;
  edge?: string;
  edgeOpacity?: number;
  threshold?: number;
} & React.ComponentProps<"group">) {
  const edges = useMemo(() => new THREE.EdgesGeometry(geo, threshold), [geo, threshold]);
  return (
    <group {...props}>
      <mesh geometry={geo}>
        <meshBasicMaterial
          color={color}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={edge} transparent opacity={edgeOpacity} />
      </lineSegments>
    </group>
  );
}

/** Raw ink line segments from a flat [x,y,z, x,y,z, ...] pair list. */
function Segs({
  pts,
  color = INK,
  opacity = 0.5,
  ...props
}: { pts: number[]; color?: string; opacity?: number } & React.ComponentProps<"group">) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [pts]);
  return (
    <group {...props}>
      <lineSegments geometry={geom}>
        <lineBasicMaterial color={color} transparent opacity={opacity} />
      </lineSegments>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* shared geometry                                                     */
/* ------------------------------------------------------------------ */

const slabGeo = new THREE.CylinderGeometry(1.35, 1.5, 0.3, 6);
const rimGeo = new THREE.CylinderGeometry(1.54, 1.62, 0.15, 6, 1, true);
const groundGeo = new THREE.CylinderGeometry(1.27, 1.27, 0.025, 6);
const plazaGeo = new THREE.CylinderGeometry(0.92, 0.92, 0.03, 6);
const rootGeo = new THREE.ConeGeometry(1.28, 1.05, 6);
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const mastGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.05, 6);
const stemGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.4, 6);
const dishGeo = new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, 0.62);
dishGeo.translate(0, -0.42, 0); /* recenter the cap on its origin so it sits on the stem */
const feedGeo = new THREE.ConeGeometry(0.045, 0.16, 6);
const padGeo = new THREE.CylinderGeometry(0.34, 0.38, 0.09, 6);
const poleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.95, 6);
const thinPoleGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.62, 6);
const beamGeo = new THREE.BoxGeometry(0.56, 0.026, 0.026);
const panGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.016, 12);
const pennantGeo = new THREE.ConeGeometry(0.1, 0.26, 3);
const tipGeo = new THREE.SphereGeometry(0.05, 8, 8);
const sealGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.02, 6);
const debrisGeo = new THREE.CylinderGeometry(0.09, 0.13, 0.1, 6);
const debrisGeoSm = new THREE.CylinderGeometry(0.05, 0.075, 0.07, 6);
const targetGeo = new THREE.BoxGeometry(0.24, 0.28, 0.02);
const craneMastGeo = new THREE.BoxGeometry(0.05, 1.15, 0.05);
const craneJibGeo = new THREE.BoxGeometry(0.78, 0.04, 0.04);
const hookGeo = new THREE.BoxGeometry(0.09, 0.09, 0.09);
const tankGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.13, 10);
const tankCapGeo = new THREE.ConeGeometry(0.085, 0.06, 10);
const roofGeo = new THREE.ConeGeometry(0.27, 0.17, 4);
const hutGeo = new THREE.BoxGeometry(0.36, 0.26, 0.3);
const sockAGeo = new THREE.CylinderGeometry(0.05, 0.065, 0.09, 8);
const sockBGeo = new THREE.CylinderGeometry(0.038, 0.05, 0.08, 8);
const sockCGeo = new THREE.CylinderGeometry(0.026, 0.038, 0.07, 8);
const stepAGeo = new THREE.CylinderGeometry(0.58, 0.64, 0.06, 6);
const stepBGeo = new THREE.CylinderGeometry(0.44, 0.5, 0.06, 6);
const trunkGeo = new THREE.CylinderGeometry(0.024, 0.034, 0.16, 6);
const canopyAGeo = new THREE.ConeGeometry(0.17, 0.26, 7);
const canopyBGeo = new THREE.ConeGeometry(0.125, 0.2, 7);
const orbGeo = new THREE.SphereGeometry(0.05, 10, 10);
const pedGeo = new THREE.BoxGeometry(0.1, 0.12, 0.1);
const spireGeo = new THREE.ConeGeometry(0.05, 0.3, 6);

/* hexagonal line ring (strata, halos, helipads) */
function hexRing(r: number, y: number) {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
  }
  return pts;
}

/* window grid: rectangle outlines on the +z face of a w×h×d block */
function windowPts(w: number, h: number, d: number, cols: number, rows: number) {
  const pts: number[] = [];
  const z = d / 2 + 0.004;
  const mx = w * 0.16;
  const my = h * 0.12;
  const cw = (w - mx * 2) / cols;
  const ch = (h - my * 2) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = -w / 2 + mx + (c + 0.5) * cw;
      const cy = -h / 2 + my + (r + 0.5) * ch;
      const hw = cw * 0.26;
      const hh = ch * 0.24;
      pts.push(
        cx - hw, cy - hh, z, cx + hw, cy - hh, z,
        cx + hw, cy - hh, z, cx + hw, cy + hh, z,
        cx + hw, cy + hh, z, cx - hw, cy + hh, z,
        cx - hw, cy + hh, z, cx - hw, cy - hh, z
      );
    }
  }
  return pts;
}

/* engraved text rows on the stele face */
function inscriptionPts(w: number, h: number, d: number) {
  const pts: number[] = [];
  const z = d / 2 + 0.004;
  for (let r = 0; r < 7; r++) {
    const y = h * 0.32 - r * (h * 0.09);
    const len = w * (r % 3 === 0 ? 0.6 : 0.72);
    pts.push(-len / 2, y, z, len / 2, y, z);
  }
  return pts;
}

/* dimension callout under every island: |——| measured width */
const DIM_PTS = [
  -1.08, -1.34, 0, 1.08, -1.34, 0,
  -1.08, -1.27, 0, -1.08, -1.41, 0,
  1.08, -1.27, 0, 1.08, -1.41, 0,
];

/* streets on the foundry plaza */
const STREET_PTS = [
  -0.06, 0.2, 0, -0.5, 0.2, 0.78,
  0.06, 0.2, 0, -0.34, 0.2, 0.85,
  0.06, 0.2, 0.02, 0.88, 0.2, 0.3,
  0.02, 0.2, -0.08, 0.88, 0.2, 0.16,
];

/* guy cable from mast head to the dish pad, sagging like a real one */
const cablePts = new THREE.QuadraticBezierCurve3(
  new THREE.Vector3(-0.52, 1.14, -0.18),
  new THREE.Vector3(-0.08, 0.52, 0.04),
  new THREE.Vector3(0.42, 0.28, 0.22)
).getPoints(12).map((v) => [v.x, v.y, v.z] as [number, number, number]);

function IslandBase({
  rim,
  ground,
  children,
}: {
  rim: string;
  ground: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Wire geo={slabGeo} color={PAPER} edgeOpacity={0.65} />
      {/* the colored rim band, like a nameplate around the bowl */}
      <Wire geo={rimGeo} color={rim} position={[0, -0.1, 0]} edgeOpacity={0.5} />
      <Wire geo={groundGeo} color={ground} position={[0, 0.165, 0]} edgeOpacity={0.35} />
      <Wire geo={rootGeo} color={ground} position={[0, -0.66, 0]} rotation={[Math.PI, 0, 0]} edgeOpacity={0.45} />
      <Line points={hexRing(1.425, -0.04)} color={INK} lineWidth={1} transparent opacity={0.28} />
      <Segs pts={DIM_PTS} opacity={0.32} />
      {children}
    </>
  );
}

/** researchers: the test range (cobalt family) */
function RangeIsland() {
  return (
    <IslandBase rim={WASH} ground={WASH_PALE}>
      <Wire geo={padGeo} position={[0.42, 0.2, 0.22]} />
      <Wire geo={stemGeo} position={[0.42, 0.42, 0.22]} />
      <Wire
        geo={dishGeo}
        threshold={30}
        position={[0.42, 0.68, 0.22]}
        rotation={[-0.95, 0.35, 0]}
        color={WASH}
        edge={COBALT}
        edgeOpacity={0.85}
      >
        <Wire geo={feedGeo} color={WASH} edge={COBALT} position={[0, 0.14, 0]} edgeOpacity={0.8} />
      </Wire>
      {/* mast with crossbars, beacon and a sagging guy cable */}
      <Wire geo={mastGeo} position={[-0.52, 0.67, -0.18]} />
      <Wire geo={boxGeo} scale={[0.5, 0.035, 0.035]} position={[-0.52, 1.06, -0.18]} />
      <Wire geo={boxGeo} scale={[0.32, 0.03, 0.03]} position={[-0.52, 0.9, -0.18]} rotation={[0, 0.5, 0]} />
      <Wire geo={tipGeo} color={RUST_ACC} edge={RUST_ACC} position={[-0.52, 1.22, -0.18]} edgeOpacity={0.9} />
      <Line points={cablePts} color={INK} lineWidth={1} transparent opacity={0.4} />
      {/* instrument hut with a pyramid roof */}
      <group position={[-0.15, 0.31, 0.72]} rotation={[0, -0.4, 0]}>
        <Wire geo={hutGeo} color={WASH_PALE} />
        <Wire geo={roofGeo} color={WASH} position={[0, 0.21, 0]} rotation={[0, Math.PI / 4, 0]} />
        <Segs pts={[0.06, -0.13, 0.155, 0.06, 0.05, 0.155, -0.08, -0.02, 0.155, -0.08, 0.02, 0.155]} opacity={0.5} />
      </group>
      {/* windsock, striped for visibility */}
      <group position={[1.0, 0.15, 0.5]}>
        <Wire geo={thinPoleGeo} position={[0, 0.31, 0]} />
        <group position={[0.02, 0.62, 0]} rotation={[0, 0, -1.35]}>
          <Wire geo={sockAGeo} color={RUST_ACC} edge={RUST_ACC} edgeOpacity={0.7} position={[0, -0.05, 0]} />
          <Wire geo={sockBGeo} color={PAPER} position={[0, -0.13, 0]} />
          <Wire geo={sockCGeo} color={RUST_ACC} edge={RUST_ACC} edgeOpacity={0.7} position={[0, -0.2, 0]} />
        </group>
      </group>
      {/* helipad marking */}
      <Line points={hexRing(0.34, 0.185)} color={COBALT} lineWidth={1.2} transparent opacity={0.55} position={[-0.72, 0, 0.28]} />
      <Segs pts={[-0.82, 0.185, 0.28, -0.62, 0.185, 0.28, -0.72, 0.185, 0.18, -0.72, 0.185, 0.38]} color={COBALT} opacity={0.55} />
      {/* range target board, cross-marked */}
      <group position={[0.92, 0.3, -0.55]} rotation={[0, -0.55, 0]}>
        <Wire geo={targetGeo} />
        <Segs
          pts={[-0.08, -0.09, 0.015, 0.08, 0.09, 0.015, -0.08, 0.09, 0.015, 0.08, -0.09, 0.015]}
          color={COBALT}
          opacity={0.75}
        />
        <Wire geo={thinPoleGeo} position={[0, -0.35, 0]} scale={[1, 0.7, 1]} />
      </group>
      <Wire geo={debrisGeo} position={[-1.55, -0.85, 0.35]} rotation={[0.3, 0.5, 0.2]} edgeOpacity={0.4} />
      <Wire geo={debrisGeoSm} position={[1.45, -1.15, -0.2]} rotation={[0.2, 0.2, 0.4]} edgeOpacity={0.35} />
    </IslandBase>
  );
}

/** developers: the deploy city (gold family, the grand one) */
function FoundryIsland() {
  const blocks: [number, number, number, number, number, number, number, number, string][] = [
    /* x, z, w, h, d, yaw, windowCols, windowRows, fill */
    [0.62, 0.3, 0.4, 0.72, 0.42, -0.15, 2, 3, GOLD_PALE],
    [-0.62, 0.28, 0.45, 0.98, 0.4, 0.22, 2, 4, GOLD_DEEP],
    [-0.18, 0.62, 0.34, 0.5, 0.3, 0, 2, 2, GOLD_PALE],
    [-0.6, -0.5, 0.32, 0.66, 0.32, -0.2, 2, 3, GOLD_PALE],
    [0.28, 0.72, 0.26, 0.34, 0.26, 0.3, 0, 0, GOLD_DEEP],
  ];
  return (
    <IslandBase rim={GOLD_DEEP} ground={WASH_PALE}>
      {/* the moat reads as water; the plaza rises out of it */}
      <Wire geo={plazaGeo} color={GOLD_PALE} position={[0, 0.19, 0]} edgeOpacity={0.4} />
      <Segs pts={STREET_PTS} opacity={0.35} />
      {/* the landmark tower, ringed like the instrument itself */}
      <group position={[0.02, 0, -0.12]} rotation={[0, 0.1, 0]}>
        <Wire geo={boxGeo} scale={[0.56, 0.36, 0.56]} position={[0, 0.38, 0]} color={GOLD_DEEP} />
        <group position={[0, 1.18, 0]}>
          <Wire geo={boxGeo} scale={[0.38, 1.28, 0.38]} color={GOLD_PALE} />
          <Segs pts={windowPts(0.38, 1.28, 0.38, 2, 6)} opacity={0.45} />
          <Segs pts={windowPts(0.38, 1.28, 0.38, 2, 6)} opacity={0.45} rotation={[0, Math.PI / 2, 0]} />
        </group>
        <Wire geo={boxGeo} scale={[0.26, 0.24, 0.26]} position={[0, 1.94, 0]} color={GOLD_DEEP} />
        <Wire geo={spireGeo} position={[0, 2.2, 0]} color={GOLD_DEEP} edgeOpacity={0.7} />
        <Wire geo={tipGeo} color={COBALT} edge={COBALT} position={[0, 2.38, 0]} edgeOpacity={0.9} />
        {/* the hex halo */}
        <group rotation={[0.42, 0, -0.08]} position={[0, 1.78, 0]}>
          <Line points={hexRing(0.62, 0)} color={GOLD_ACC} lineWidth={2} transparent opacity={0.9} />
          <Line points={hexRing(0.55, 0)} color={GOLD_ACC} lineWidth={1} transparent opacity={0.45} />
        </group>
        {/* one window burns cobalt: somebody is shipping tonight */}
        <Segs
          pts={[-0.1, 1.05, 0.196, 0.0, 1.05, 0.196, 0.0, 1.05, 0.196, 0.0, 1.17, 0.196, 0.0, 1.17, 0.196, -0.1, 1.17, 0.196, -0.1, 1.17, 0.196, -0.1, 1.05, 0.196]}
          color={COBALT}
          opacity={0.95}
        />
      </group>
      {/* the district */}
      {blocks.map(([x, z, w, h, d, yaw, wc, wr, fill], i) => (
        <group key={i} position={[x, 0.19 + h / 2, z]} rotation={[0, yaw, 0]}>
          <Wire geo={boxGeo} scale={[w, h, d]} color={fill} />
          {wc > 0 && <Segs pts={windowPts(w, h, d, wc, wr)} opacity={0.42} />}
        </group>
      ))}
      {/* rooftop furniture: tank and vents */}
      <group position={[-0.62, 0.72, 0.28]} rotation={[0, 0.22, 0]}>
        <Wire geo={tankGeo} position={[0.08, 0.06, 0.05]} color={GOLD_PALE} />
        <Wire geo={tankCapGeo} position={[0.08, 0.16, 0.05]} color={GOLD_DEEP} />
        <Wire geo={boxGeo} scale={[0.09, 0.06, 0.09]} position={[-0.12, 0.03, -0.08]} color={GOLD_DEEP} />
      </group>
      {/* signboard with the office hex */}
      <group position={[0.62, 0.78, 0.3]} rotation={[0, -0.15, 0]}>
        <Wire geo={boxGeo} scale={[0.3, 0.14, 0.03]} position={[0, 0.05, 0.2]} color={PAPER} />
        <Wire geo={sealGeo} color={WASH} edge={COBALT} edgeOpacity={0.85} position={[-0.07, 0.05, 0.225]} rotation={[Math.PI / 2, 0, 0]} scale={0.7} />
        <Segs pts={[0.0, 0.03, 0.222, 0.1, 0.03, 0.222, 0.0, 0.07, 0.222, 0.1, 0.07, 0.222]} opacity={0.6} />
      </group>
      {/* tower crane, still building the next block */}
      <group position={[0.68, 0, -0.58]} rotation={[0, 0.5, 0]}>
        <Wire geo={craneMastGeo} position={[0, 0.72, 0]} color={RUST_PALE} />
        <Wire geo={craneJibGeo} position={[0.24, 1.3, 0]} color={RUST_PALE} />
        <Wire geo={boxGeo} scale={[0.16, 0.08, 0.08]} position={[-0.2, 1.3, 0]} color={RUST_PALE} />
        <Wire geo={boxGeo} scale={[0.045, 0.18, 0.045]} position={[0, 1.4, 0]} color={RUST_PALE} />
        <Segs pts={[0.55, 1.28, 0, 0.55, 0.86, 0]} opacity={0.5} />
        <Wire geo={hookGeo} position={[0.55, 0.8, 0]} color={RUST_ACC} edge={RUST_ACC} edgeOpacity={0.8} />
        <Segs pts={[0, 1.49, 0, 0.55, 1.32, 0, 0, 1.49, 0, -0.26, 1.34, 0]} opacity={0.45} />
      </group>
      <Wire geo={debrisGeoSm} position={[-1.5, -0.95, -0.3]} rotation={[0.4, 0.1, 0.3]} edgeOpacity={0.35} />
      <Wire geo={debrisGeo} position={[1.58, -0.8, 0.3]} rotation={[0.1, 0.6, 0.25]} edgeOpacity={0.4} />
    </IslandBase>
  );
}

/** policymakers: the standards archive (green family) */
function ArchiveIsland() {
  return (
    <IslandBase rim={GREEN_DEEP} ground={GREEN_PALE}>
      {/* stepped plinth, then the engraved stele with its seal */}
      <Wire geo={stepAGeo} position={[-0.3, 0.21, -0.05]} rotation={[0, 0.42, 0]} />
      <Wire geo={stepBGeo} position={[-0.3, 0.27, -0.05]} rotation={[0, 0.42, 0]} />
      <group position={[-0.3, 0.975, -0.05]} rotation={[0, 0.42, 0]}>
        <Wire geo={boxGeo} scale={[0.55, 1.35, 0.3]} />
        <Segs pts={inscriptionPts(0.55, 1.35, 0.3)} opacity={0.42} />
        <Wire
          geo={sealGeo}
          color={WASH}
          edge={COBALT}
          edgeOpacity={0.85}
          position={[0, -0.42, 0.16]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      </group>
      {/* the filing: five sheets, one sliding loose */}
      {[0, 1, 2, 3].map((i) => (
        <Wire
          key={i}
          geo={boxGeo}
          scale={[0.85, 0.05, 0.6]}
          position={[0.52, 0.21 + i * 0.058, 0.28]}
          rotation={[0, [0.18, -0.14, 0.38, 0.05][i], 0]}
        />
      ))}
      <Wire geo={boxGeo} scale={[0.85, 0.05, 0.6]} position={[0.66, 0.47, 0.34]} rotation={[0.06, 0.55, -0.08]} />
      {/* courtyard trees, two shades of green */}
      {([[-0.95, 0.42], [1.02, -0.12]] as const).map(([x, z], i) => (
        <group key={i} position={[x, 0.18, z]}>
          <Wire geo={trunkGeo} position={[0, 0.08, 0]} />
          <Wire geo={canopyAGeo} color={GREEN_DEEP} position={[0, 0.28, 0]} edgeOpacity={0.5} />
          <Wire geo={canopyBGeo} color={GREEN_PALE} position={[0, 0.44, 0]} edgeOpacity={0.5} />
        </group>
      ))}
      {/* the reference orb: a standard you can hold */}
      <group position={[0.35, 0.18, 0.78]}>
        <Wire geo={pedGeo} position={[0, 0.06, 0]} />
        <Wire geo={orbGeo} color={GOLD_ACC} edge={GOLD_ACC} position={[0, 0.17, 0]} edgeOpacity={0.85} />
      </group>
      {/* the balance: standards are for weighing things */}
      <group position={[-0.02, 0.03, 0.72]}>
        <Wire geo={thinPoleGeo} position={[0, 0.46, 0]} />
        <Wire geo={beamGeo} position={[0, 0.78, 0]} rotation={[0, 0, 0.05]} />
        <Segs pts={[-0.27, 0.795, 0, -0.27, 0.62, 0, 0.27, 0.765, 0, 0.27, 0.59, 0]} opacity={0.5} />
        <Wire geo={panGeo} position={[-0.27, 0.61, 0]} />
        <Wire geo={panGeo} position={[0.27, 0.58, 0]} />
        <Wire geo={boxGeo} scale={[0.07, 0.07, 0.07]} position={[-0.27, 0.655, 0]} edge={COBALT} edgeOpacity={0.85} />
      </group>
      {/* flag of the institute */}
      <Wire geo={poleGeo} position={[0.45, 0.66, -0.62]} />
      <Wire
        geo={pennantGeo}
        color={GREEN_ACC}
        edge={GREEN_ACC}
        edgeOpacity={0.9}
        position={[0.56, 1.09, -0.62]}
        rotation={[0, 0, -Math.PI / 2]}
      />
      <Wire geo={debrisGeo} position={[-1.45, -1.05, -0.25]} rotation={[0.5, 0.3, 0.1]} edgeOpacity={0.4} />
      <Wire geo={debrisGeoSm} position={[1.5, -0.75, 0.4]} rotation={[0.2, 0.7, 0.3]} edgeOpacity={0.35} />
    </IslandBase>
  );
}

const BASE_YAW = [-0.35, 0.2, 0.5];

function Scene({
  still,
  compact,
  order,
  onSwap,
}: {
  still: boolean;
  compact: boolean;
  order: number[];
  onSwap: (idx: number) => void;
}) {
  const world = useRef<THREE.Group>(null);
  const islands = useRef<(THREE.Group | null)[]>([]);
  const pointer = useRef({ x: 0, y: 0 });
  const hoverCenter = useRef(false);
  const spinSpeed = useRef(1);
  const orderRef = useRef(order);
  const { viewport, camera, gl } = useThree();
  /* one island at a time on a phone: three at 110px each reads as nothing */
  const spread = compact ? 0 : viewport.width * 0.345;

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    camera.lookAt(0, 0.1, 0);
    if (still) {
      islands.current.forEach((g, i) => {
        if (!g) return;
        g.position.y = [0.02, -0.04, 0.0][i];
        if (compact) {
          g.visible = order.indexOf(i) === 1;
          g.position.x = 0;
          g.scale.setScalar(1.42);
        }
      });
    }
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    if (!still) window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [camera, still, compact, order]);

  useFrame((state, rawDt) => {
    if (still) return;
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;

    const k = 1 - Math.pow(0.004, dt); /* slot-change glide */

    /* the center island turns like a display model; hover holds it */
    spinSpeed.current += ((hoverCenter.current ? 0 : 1) - spinSpeed.current) * (1 - Math.pow(0.012, dt));
    islands.current.forEach((g, i) => {
      if (!g) return;
      const slot = orderRef.current.indexOf(i);
      const isCenter = slot === 1;
      const targetX = (slot - 1) * spread;
      const targetY = Math.sin(t * [0.55, 0.48, 0.62][i] + i * 2.1) * (isCenter ? 0.055 : 0.085);
      const targetS = isCenter ? (compact ? 1.42 : 1.06) : 0.82;
      if (compact) g.visible = isCenter;
      g.position.x += (targetX - g.position.x) * k;
      g.position.y += (targetY - g.position.y) * k;
      g.scale.setScalar(g.scale.x + (targetS - g.scale.x) * k);
      if (isCenter) {
        g.rotation.y += dt * 0.34 * spinSpeed.current;
      } else {
        const targetRot = BASE_YAW[slot] + Math.sin(t * 0.12 + i * 1.7) * 0.07;
        g.rotation.y += (targetRot - g.rotation.y) * k;
      }
    });
    if (world.current) {
      const tx = pointer.current.y * 0.045;
      const ty = pointer.current.x * 0.09;
      world.current.rotation.x += (tx - world.current.rotation.x) * (1 - Math.pow(0.02, dt));
      world.current.rotation.y += (ty - world.current.rotation.y) * (1 - Math.pow(0.02, dt));
    }
  });

  /* a side island was picked: bring the spun angle home, then trade slots */
  const requestSwap = (i: number) => {
    const slot = orderRef.current.indexOf(i);
    if (slot === 1) return;
    const leaving = islands.current[orderRef.current[1]];
    if (leaving) {
      const target = BASE_YAW[slot];
      let ny = leaving.rotation.y % (Math.PI * 2);
      while (ny - target > Math.PI) ny -= Math.PI * 2;
      while (target - ny > Math.PI) ny += Math.PI * 2;
      leaving.rotation.y = ny;
    }
    hoverCenter.current = false;
    gl.domElement.style.cursor = "grab";
    onSwap(i);
  };

  return (
    <group ref={world} position={[0, -0.32, 0]}>
      {[RangeIsland, FoundryIsland, ArchiveIsland].map((Island, i) => {
        /* animated mode: props hold the INITIAL layout and never change
           (the frame loop glides transforms); still mode: props follow slots */
        const slot = still || compact ? order.indexOf(i) : i;
        return (
          <group
            key={i}
            ref={(el) => {
              islands.current[i] = el;
            }}
            position={[compact ? 0 : (slot - 1) * spread, 0, 0]}
            rotation={[0.06, slot === 1 ? 0.2 : BASE_YAW[slot], 0]}
            scale={slot === 1 ? (compact ? 1.42 : 1.06) : 0.82}
            onPointerOver={(e) => {
              e.stopPropagation();
              if (still) return;
              if (orderRef.current.indexOf(i) === 1) {
                hoverCenter.current = true;
                gl.domElement.style.cursor = "grab";
              } else {
                gl.domElement.style.cursor = "pointer";
              }
            }}
            onPointerOut={() => {
              if (still) return;
              hoverCenter.current = false;
              gl.domElement.style.cursor = "";
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (still) onSwap(i);
              else requestSwap(i);
            }}
          >
            <Island />
          </group>
        );
      })}
    </group>
  );
}

const CAPTIONS = [
  "researchers · the range",
  "developers · the foundry",
  "policymakers · the archive",
];

/** Three floating drafting dioramas, one per audience, drawn as hidden-line
    blueprint models: whichever one you click glides to the center and turns
    there until caught by the cursor. */
export default function FloatingIslands() {
  const wrap = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(true);
  const [order, setOrder] = useState([0, 1, 2]);
  const [compact, setCompact] = useState(false);
  const still = prefersReduced();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const swap = (idx: number) =>
    setOrder((prev) => {
      const from = prev.indexOf(idx);
      if (from === 1) return prev;
      const next = [...prev];
      next[from] = next[1];
      next[1] = idx;
      return next;
    });

  useEffect(() => {
    if (!wrap.current || still) return;
    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0.05 });
    io.observe(wrap.current);
    return () => io.disconnect();
  }, [still]);

  return (
    <div>
      <div ref={wrap} aria-hidden="true" className="h-[300px] w-full sm:h-[360px] lg:h-[430px]">
        <Canvas
          flat
          dpr={[1, 1.5]}
          frameloop={still ? "demand" : running ? "always" : "never"}
          camera={{ position: [0, 1.55, 9.6], fov: 30 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        >
          <Scene still={still} compact={compact} order={order} onSwap={swap} />
        </Canvas>
      </div>
      {compact ? (
        /* no room for three dioramas on a phone, so the captions do the steering */
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {CAPTIONS.map((c, idx) => (
            <button
              key={c}
              type="button"
              onClick={() => swap(idx)}
              aria-pressed={order[1] === idx}
              className={cn(
                "press cursor-pointer rounded-lg border px-3 py-2 font-mono text-[0.6rem] font-medium tracking-[0.12em] uppercase",
                order[1] === idx
                  ? "press-ink border-ink bg-cobalt text-paper"
                  : "press-wash text-ink border-(--line-strong)"
              )}
            >
              {c.split(" · ")[1]}
            </button>
          ))}
        </div>
      ) : (
        <div aria-hidden="true" className="grid grid-cols-3">
          {order.map((idx) => (
            <p key={idx} className="mono-label cap-swap text-center text-[0.62rem]">
              {CAPTIONS[idx]}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
