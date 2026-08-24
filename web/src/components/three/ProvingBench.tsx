import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { prefersReduced } from "@/lib/anim";

/* ------------------------------------------------------------------ */
/*  The proving bench.                                                 */
/*  The harness drawn as a machine: a specimen clamped on a hex deck,  */
/*  six instrument arms around it, one per safety dimension. Each arm  */
/*  swings in, runs its suite, lights its lamp and retracts. When all  */
/*  six lamps are lit the specimen is swapped and the bench starts     */
/*  over, which is the whole product in one loop.                      */
/* ------------------------------------------------------------------ */

const INK = "#1a1511";
const PAPER = "#f5efe2";
const SHEET = "#fbf7ec";
const WASH = "#dbe2f4";
const COBALT = "#2036c8";

/* the six dimensions, in index order: JBR CAP INJ CAL AGT INT */
const HUES = ["#2036c8", "#d95c40", "#c98a1f", "#2f8f8a", "#a05893", "#3f9e6b"];
/* each arm is washed in its own dimension: pale for the structure,
   a half-step deeper for the collars and hardware that read as metal */
const PALE = ["#e2e6f8", "#f8e4dd", "#f6eacf", "#deeeec", "#f0e2ee", "#e1efe8"];
const MID = ["#c3cbef", "#f0c9bd", "#ecd8ab", "#c1dedb", "#e0c9dd", "#c4dfd2"];

const TEST = 2.0; /* seconds an arm spends on its suite */
const RESET = 1.6; /* the beat where the specimen is swapped */
const LOOP = TEST * 6 + RESET;

const smooth = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** hidden-line drafting: a paper solid that occludes, plus its ink edges */
function Wire({
  geo,
  color = SHEET,
  edge = INK,
  edgeOpacity = 0.62,
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

/* ---------------- geometry ---------------- */
const deckGeo = new THREE.CylinderGeometry(1.72, 1.88, 0.26, 6);
const rimGeo = new THREE.CylinderGeometry(1.93, 2.0, 0.15, 6, 1, true);
const faceGeo = new THREE.CylinderGeometry(1.62, 1.62, 0.03, 6);
const rootGeo = new THREE.ConeGeometry(1.66, 1.35, 6);
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const postGeo = new THREE.CylinderGeometry(0.06, 0.085, 0.44, 6);
const shoulderGeo = new THREE.BoxGeometry(0.17, 0.15, 0.17);
const boomGeo = new THREE.BoxGeometry(0.46, 0.06, 0.06);
const foreGeo = new THREE.BoxGeometry(0.34, 0.05, 0.05);
const plinthGeo = new THREE.CylinderGeometry(0.3, 0.38, 0.2, 6);
const specGeo = new THREE.BoxGeometry(0.46, 0.46, 0.46);
const lampGeo = new THREE.SphereGeometry(0.052, 10, 10);
const dialGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.03, 14);
const flaskGeo = new THREE.ConeGeometry(0.09, 0.17, 10);
const needleGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.2, 6);
const hammerGeo = new THREE.BoxGeometry(0.15, 0.1, 0.1);
const loupeGeo = new THREE.TorusGeometry(0.085, 0.016, 8, 16);
const jawGeo = new THREE.BoxGeometry(0.11, 0.028, 0.045);
const cabinetGeo = new THREE.BoxGeometry(0.36, 0.34, 0.26);
const tankGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.34, 12);
const tankCapGeo = new THREE.ConeGeometry(0.15, 0.1, 12);
const blockGeo = new THREE.BoxGeometry(0.42, 0.18, 0.3);
const stepGeo = new THREE.CylinderGeometry(0.52, 0.6, 0.08, 6);
const flangeGeo = new THREE.CylinderGeometry(0.135, 0.16, 0.055, 8);
const collarGeo = new THREE.CylinderGeometry(0.058, 0.058, 0.105, 10);
const wristGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.075, 8);
const weightGeo = new THREE.BoxGeometry(0.13, 0.11, 0.11);
const bandGeo = new THREE.CylinderGeometry(0.078, 0.084, 0.055, 6);
const strutGeo = new THREE.BoxGeometry(0.2, 0.03, 0.03);

function hexRing(r: number, y: number) {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
  }
  return pts;
}

/** one distinct instrument per dimension, so the six read as different suites */
function ToolHead({ i, hue, pale }: { i: number; hue: string; pale: string }) {
  if (i === 0)
    return <Wire geo={hammerGeo} color={pale} edge={hue} edgeOpacity={0.95} position={[0.06, 0, 0]} />;
  if (i === 1)
    return (
      <Wire
        geo={flaskGeo}
        color={pale}
        edge={hue}
        edgeOpacity={0.95}
        position={[0.04, -0.04, 0]}
        rotation={[0, 0, Math.PI]}
      />
    );
  if (i === 2)
    return (
      <group position={[0.04, -0.06, 0]}>
        <Wire geo={boxGeo} scale={[0.11, 0.1, 0.09]} color={pale} edge={hue} edgeOpacity={0.9} />
        <Wire geo={needleGeo} color={pale} edge={hue} edgeOpacity={0.95} position={[0, -0.14, 0]} />
      </group>
    );
  if (i === 3)
    return (
      <Wire
        geo={dialGeo}
        color={pale}
        edge={hue}
        edgeOpacity={0.95}
        position={[0.05, -0.02, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
    );
  if (i === 4)
    return (
      <group position={[0.06, -0.03, 0]}>
        <Wire geo={jawGeo} color={pale} edge={hue} edgeOpacity={0.95} rotation={[0, 0, 0.34]} position={[0, 0.035, 0]} />
        <Wire geo={jawGeo} color={pale} edge={hue} edgeOpacity={0.95} rotation={[0, 0, -0.34]} position={[0, -0.035, 0]} />
      </group>
    );
  return (
    <group position={[0.06, -0.03, 0]}>
      <Wire geo={loupeGeo} color={pale} edge={hue} edgeOpacity={0.95} rotation={[0, Math.PI / 2, 0]} />
    </group>
  );
}

/** Fires once the renderer has genuinely submitted a frame. onCreated only
    tells you the canvas exists, which is why the bench used to pop in after
    the loader had already gone. */
function FirstFrame() {
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current) return;
    fired.current = true;
    requestAnimationFrame(() =>
      window.dispatchEvent(new CustomEvent("osmsi:hero-ready"))
    );
  });
  return null;
}

function Bench({ still }: { still: boolean }) {
  const world = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Group>(null);
  const specimen = useRef<THREE.Group>(null);
  const booms = useRef<(THREE.Group | null)[]>([]);
  const fores = useRef<(THREE.Group | null)[]>([]);
  const lamps = useRef<(THREE.Mesh | null)[]>([]);
  const pointer = useRef({ x: 0, y: 0 });
  const lampC = useRef(new THREE.Color());
  const paperC = useMemo(() => new THREE.Color(PAPER), []);
  const hueC = useMemo(() => HUES.map((h) => new THREE.Color(h)), []);

  useEffect(() => {
    if (still) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [still]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = still ? TEST * 2.6 : state.clock.elapsedTime;
    const phase = t % LOOP;
    const active = Math.floor(phase / TEST); /* 6 means the reset beat */
    const local = (phase % TEST) / TEST;

    /* an arm rises, holds on the specimen, then retracts */
    let engage = 0;
    if (active < 6) {
      engage =
        local < 0.32
          ? smooth(local / 0.32)
          : local < 0.68
            ? 1
            : 1 - smooth(clamp01((local - 0.68) / 0.32));
    }

    for (let i = 0; i < 6; i++) {
      const e = i === active ? engage : 0;
      const b = booms.current[i];
      const f = fores.current[i];
      /* parked at rest, swung down and inward under test */
      /* waiting just clear of the specimen, then reaching straight in */
      if (b) b.rotation.z = 1.5 - e * 1.48;
      if (f) f.rotation.z = -e * 0.08;

      /* the lamp holds once its suite has run, and clears on reset */
      const lit = active === 6 ? 1 - smooth(clamp01(local)) : i < active ? 1 : i === active ? smooth(clamp01((local - 0.4) / 0.25)) : 0;
      const m = lamps.current[i]?.material as THREE.MeshBasicMaterial | undefined;
      if (m) {
        lampC.current.copy(paperC).lerp(hueC[i], lit);
        m.color.copy(lampC.current);
      }
    }

    /* the specimen turns on its plinth, and flinches on contact */
    if (specimen.current) {
      specimen.current.rotation.y += dt * 0.5;
      const hit = active < 6 && engage > 0.92 ? 1 : 0;
      const s = 1 - hit * 0.045;
      specimen.current.scale.setScalar(
        specimen.current.scale.x + (s - specimen.current.scale.x) * (1 - Math.pow(0.02, dt))
      );
      /* a fresh specimen drops in on the reset beat */
      if (active === 6) specimen.current.position.y = 0.62 + (1 - smooth(clamp01(local * 1.4))) * 1.5;
      else specimen.current.position.y = 0.62;
    }

    if (still) return;
    if (spin.current) spin.current.rotation.y += dt * 0.12;
    if (halo.current) halo.current.rotation.y -= dt * 0.3;
    if (world.current) {
      const tx = 0.1 + pointer.current.y * 0.07;
      const ty = pointer.current.x * 0.16;
      world.current.rotation.x += (tx - world.current.rotation.x) * (1 - Math.pow(0.02, dt));
      world.current.rotation.y += (ty - world.current.rotation.y) * (1 - Math.pow(0.02, dt));
      world.current.position.y = -0.15 + Math.sin(t * 0.5) * 0.055;
    }
  });

  return (
    <group ref={world} rotation={[0.1, 0, 0]}>
      <group ref={spin}>
        {/* the deck */}
        <Wire geo={deckGeo} color={PAPER} edgeOpacity={0.7} />
        <Wire geo={rimGeo} color={WASH} position={[0, -0.09, 0]} edgeOpacity={0.55} />
        <Wire geo={faceGeo} color={SHEET} position={[0, 0.145, 0]} edgeOpacity={0.4} />
        <Wire geo={rootGeo} color={PAPER} position={[0, -0.82, 0]} rotation={[Math.PI, 0, 0]} edgeOpacity={0.5} />
        <Line points={hexRing(1.8, -0.02)} color={INK} lineWidth={1} transparent opacity={0.3} />
        <Line points={hexRing(1.2, 0.163)} color={COBALT} lineWidth={1} transparent opacity={0.32} />

        {/* the specimen under test */}
        <Wire geo={plinthGeo} color={SHEET} position={[0, 0.26, 0]} />
        <group ref={specimen} position={[0, 0.62, 0]}>
          <Wire geo={specGeo} color={SHEET} edgeOpacity={0.85} />
          <Wire geo={boxGeo} scale={[0.48, 0.03, 0.03]} color={SHEET} position={[0, 0.1, 0]} edgeOpacity={0.4} />
          <Wire geo={boxGeo} scale={[0.03, 0.03, 0.48]} color={SHEET} position={[0, 0.1, 0]} edgeOpacity={0.4} />
          <Wire geo={lampGeo} color={COBALT} edge={COBALT} edgeOpacity={0.9} position={[0, 0.3, 0]} />
        </group>

        {/* six instrument stations, one per dimension */}
        {HUES.map((hue, i) => {
          const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
          const r = 1.16;
          const pale = PALE[i];
          const mid = MID[i];
          return (
            <group key={i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]} rotation={[0, -a + Math.PI, 0]}>
              {/* bolted-down base, then the column in its own wash */}
              <Wire geo={flangeGeo} color={mid} edge={hue} edgeOpacity={0.5} position={[0, 0.19, 0]} />
              <Wire geo={postGeo} color={pale} edge={hue} edgeOpacity={0.55} position={[0, 0.38, 0]} />
              <Wire geo={bandGeo} color={mid} edge={hue} edgeOpacity={0.6} position={[0, 0.3, 0]} />
              <Wire geo={strutGeo} color={pale} edge={hue} edgeOpacity={0.4} position={[0.12, 0.26, 0]} rotation={[0, 0, -0.7]} />
              <Wire geo={shoulderGeo} color={pale} edge={hue} edgeOpacity={0.6} position={[0, 0.62, 0]} />
              {/* the lamp that records this suite has run */}
              <mesh
                ref={(el) => {
                  lamps.current[i] = el;
                }}
                geometry={lampGeo}
                position={[0, 0.2, 0.17]}
              >
                <meshBasicMaterial color={PAPER} />
              </mesh>
              <group position={[0, 0.62, 0]}>
                {/* shoulder pivot */}
                <Wire geo={collarGeo} color={mid} edge={hue} edgeOpacity={0.7} rotation={[Math.PI / 2, 0, 0]} />
                <group
                  ref={(el) => {
                    booms.current[i] = el;
                  }}
                >
                  <Wire geo={weightGeo} color={mid} edge={hue} edgeOpacity={0.6} position={[-0.11, 0, 0]} />
                  <Wire geo={boomGeo} color={pale} edge={hue} edgeOpacity={0.62} position={[0.23, 0, 0]} />
                  <group position={[0.46, 0, 0]}>
                    {/* elbow */}
                    <Wire geo={collarGeo} color={mid} edge={hue} edgeOpacity={0.7} rotation={[Math.PI / 2, 0, 0]} scale={0.85} />
                    <group
                      ref={(el) => {
                        fores.current[i] = el;
                      }}
                    >
                      <Wire geo={foreGeo} color={pale} edge={hue} edgeOpacity={0.62} position={[0.17, 0, 0]} />
                      <group position={[0.34, 0, 0]}>
                        {/* wrist, then the instrument itself */}
                        <Wire geo={wristGeo} color={mid} edge={hue} edgeOpacity={0.7} rotation={[0, 0, Math.PI / 2]} />
                        <ToolHead i={i} hue={hue} pale={pale} />
                      </group>
                    </group>
                  </group>
                </group>
              </group>
            </group>
          );
        })}

        {/* deck equipment: the bench needs mass, not just linework */}
        <Wire geo={cabinetGeo} color={SHEET} position={[1.0, 0.33, 0]} rotation={[0, -0.3, 0]} />
        <Wire geo={boxGeo} scale={[0.2, 0.02, 0.14]} color={WASH} position={[1.0, 0.51, 0]} rotation={[0, -0.3, 0]} edgeOpacity={0.5} />
        <group position={[-0.5, 0, 0.87]}>
          <Wire geo={tankGeo} color={SHEET} position={[0, 0.33, 0]} />
          <Wire geo={tankCapGeo} color={WASH} position={[0, 0.55, 0]} />
        </group>
        <Wire geo={blockGeo} color={SHEET} position={[-0.5, 0.25, -0.87]} rotation={[0, 0.5, 0]} />
        <Wire geo={stepGeo} color={SHEET} position={[0, 0.19, 0]} edgeOpacity={0.45} />
      </group>

      {/* the index hexagon, orbiting the specimen it describes */}
      <group ref={halo} position={[0, 0.64, 0]} rotation={[0.46, 0, 0]}>
        <Line points={hexRing(0.6, 0)} color={COBALT} lineWidth={1.6} transparent opacity={0.6} />
        <Line points={hexRing(0.52, 0)} color={COBALT} lineWidth={1} transparent opacity={0.25} />
      </group>
    </group>
  );
}

export default function ProvingBench() {
  const wrap = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(true);
  const still = prefersReduced();

  useEffect(() => {
    if (!wrap.current || still) return;
    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0.02 });
    io.observe(wrap.current);
    return () => io.disconnect();
  }, [still]);

  return (
    <div ref={wrap} aria-hidden="true" className="absolute inset-0">
      <Canvas
        flat
        dpr={[1, 1.7]}
        frameloop={still ? "demand" : running ? "always" : "never"}
        camera={{ position: [0, 1.15, 6.7], fov: 34 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ camera }) => camera.lookAt(0, 0.52, 0)}
      >
        <FirstFrame />
        <Bench still={still} />
      </Canvas>
    </div>
  );
}
