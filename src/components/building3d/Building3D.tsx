import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Edges, Grid, Html, OrbitControls } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

/*
  Architectural model ("maquette") of a building. Not photoreal: matte
  volumes, slabs between floors, crisp edges, soft contact shadow. Floors
  rise with a damped spring when levels are added, so building a property
  in the builder feels like stacking storeys.
*/

export interface Block3D {
  id: string;
  level: number;
  position: number;
  span: number;
  color: string;
  label?: string;
}

export interface Building3DProps {
  levels: number;
  bays: number;
  blocks: Block3D[];
  entrance?: number | null;
  selectedId?: string | null;
  activeLevel?: number | null;
  onSelect?: (id: string) => void;
  onSelectLevel?: (level: number) => void;
  autoRotate?: boolean;
  showGrid?: boolean;
  className?: string;
  palette: Palette3D;
  onInteract?: () => void;
}

export interface Palette3D {
  slab: string;
  core: string;
  edge: string;
  ground: string;
  gridCell: string;
  gridSection: string;
  accent: string;
  door: string;
  glass: string;
}

const BAY = 1;
const DEPTH = 1.7;
const H = 0.62;
const H0 = 0.82;
const SLAB = 0.06;

function levelY(level: number) {
  return level === 0 ? 0 : H0 + SLAB + (level - 1) * (H + SLAB);
}
function levelH(level: number) {
  return level === 0 ? H0 : H;
}

function Floor({
  level,
  bays,
  palette,
  children,
  active,
  onClick,
}: {
  level: number;
  bays: number;
  palette: Palette3D;
  children: React.ReactNode;
  active: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const target = levelY(level);
  // Rise from below on mount.
  const y = useRef(target - 0.9);
  const s = useRef(0.001);
  useFrame((_, dt) => {
    if (!group.current) return;
    y.current = THREE.MathUtils.damp(y.current, target, 9, dt);
    s.current = THREE.MathUtils.damp(s.current, 1, 10, dt);
    group.current.position.y = y.current;
    group.current.scale.y = s.current;
  });
  const width = bays * BAY;
  const h = levelH(level);
  return (
    <group ref={group} onClick={onClick}>
      {/* core volume, recessed */}
      <mesh position={[0, h / 2, -0.06]} castShadow receiveShadow>
        <boxGeometry args={[width - 0.04, h, DEPTH - 0.18]} />
        <meshStandardMaterial color={palette.core} roughness={0.95} />
      </mesh>
      {/* slab on top of the floor */}
      <mesh position={[0, h + SLAB / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.08, SLAB, DEPTH + 0.06]} />
        <meshStandardMaterial color={active ? palette.accent : palette.slab} roughness={0.85} />
        <Edges color={palette.edge} threshold={15} />
      </mesh>
      {children}
    </group>
  );
}

function UnitBox({
  block,
  bays,
  palette,
  selected,
  onSelect,
}: {
  block: Block3D;
  bays: number;
  palette: Palette3D;
  selected: boolean;
  onSelect?: (id: string) => void;
}) {
  const [hover, setHover] = useState(false);
  const mesh = useRef<THREE.Mesh>(null);
  const h = levelH(block.level) - 0.08;
  const w = block.span * BAY - 0.1;
  const x = -((bays * BAY) / 2) + block.position * BAY + (block.span * BAY) / 2;
  const z = useRef(0);
  useFrame((_, dt) => {
    if (!mesh.current) return;
    z.current = THREE.MathUtils.damp(z.current, selected ? 0.12 : hover ? 0.05 : 0, 12, dt);
    mesh.current.position.z = DEPTH / 2 - 0.2 + z.current;
  });
  const color = useMemo(() => new THREE.Color(block.color), [block.color]);
  return (
    <group position={[x, 0.04 + h / 2, 0]}>
      <mesh
        ref={mesh}
        castShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = onSelect ? "pointer" : "";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          if (!onSelect) return;
          e.stopPropagation();
          onSelect(block.id);
        }}
      >
        <boxGeometry args={[w, h, 0.42]} />
        <meshStandardMaterial color={color} roughness={0.55} emissive={color} emissiveIntensity={hover || selected ? 0.18 : 0.04} />
        <Edges color={selected ? "#0b1913" : palette.edge} threshold={15} />
        {/* one window per bay: keeps the facade rhythm readable */}
        {Array.from({ length: block.span }, (_, k) => (
          <mesh key={k} position={[-w / 2 + (k + 0.5) * (w / block.span), h * 0.08, 0.212]}>
            <planeGeometry args={[Math.min(0.46, (w / block.span) * 0.56), h * (block.level === 0 ? 0.6 : 0.5)]} />
            <meshStandardMaterial color={palette.glass} roughness={0.25} transparent opacity={0.42} />
          </mesh>
        ))}
        {(selected || hover) && block.label && (
          <Html center position={[0, h / 2 + 0.16, 0.25]} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
            <span className="whitespace-nowrap rounded-[8px] bg-forest px-2 py-1 font-mono text-[11px] font-medium text-on-forest shadow-[var(--shadow-lift)]">
              {block.label}
            </span>
          </Html>
        )}
      </mesh>
    </group>
  );
}

function Scene(props: Building3DProps) {
  const { levels, bays, blocks, entrance, selectedId, activeLevel, onSelect, onSelectLevel, palette, showGrid } = props;
  const height = levelY(levels - 1) + levelH(levels - 1) + SLAB;
  const byLevel = useMemo(() => {
    const m = new Map<number, Block3D[]>();
    for (const b of blocks) m.set(b.level, [...(m.get(b.level) ?? []), b]);
    return m;
  }, [blocks]);

  return (
    <>
      <hemisphereLight args={["#ffffff", "#c9d6cd", 1.9]} />
      <directionalLight position={[6, 10, 7]} intensity={1.7} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-6, 4, -3]} intensity={0.3} />
      <group position={[0, 0, 0]}>
        {Array.from({ length: levels }, (_, level) => (
          <Floor
            key={level}
            level={level}
            bays={bays}
            palette={palette}
            active={activeLevel === level}
            onClick={
              onSelectLevel
                ? (e) => {
                    e.stopPropagation();
                    onSelectLevel(level);
                  }
                : undefined
            }
          >
            {(byLevel.get(level) ?? []).map((b) => (
              <UnitBox key={b.id} block={b} bays={bays} palette={palette} selected={selectedId === b.id} onSelect={onSelect} />
            ))}
            {level === 0 && entrance !== null && entrance !== undefined && (
              <mesh position={[-((bays * BAY) / 2) + entrance * BAY + BAY / 2, 0.3, DEPTH / 2 - 0.08]}>
                <boxGeometry args={[0.42, 0.6, 0.06]} />
                <meshStandardMaterial color={palette.door} roughness={0.6} />
              </mesh>
            )}
          </Floor>
        ))}
        {/* rooftop volume: stair core + water tank, the Dakar skyline detail */}
        <RoofKit y={height} bays={bays} palette={palette} />
      </group>
      <ContactShadows position={[0, -0.001, 0]} opacity={0.38} scale={14} blur={2.4} far={6} color="#0b2a1f" />
      {showGrid && (
        <Grid
          position={[0, -0.002, 0]}
          args={[30, 30]}
          cellSize={0.5}
          cellThickness={0.6}
          cellColor={palette.gridCell}
          sectionSize={2}
          sectionThickness={1}
          sectionColor={palette.gridSection}
          fadeDistance={18}
          fadeStrength={1.4}
          infiniteGrid
        />
      )}
    </>
  );
}

function RoofKit({ y, bays, palette }: { y: number; bays: number; palette: Palette3D }) {
  const group = useRef<THREE.Group>(null);
  const cur = useRef(y);
  useFrame((_, dt) => {
    if (!group.current) return;
    cur.current = THREE.MathUtils.damp(cur.current, y, 9, dt);
    group.current.position.y = cur.current;
  });
  const w = bays * BAY;
  return (
    <group ref={group}>
      <mesh position={[w / 2 - 0.45, 0.22, -0.3]} castShadow>
        <boxGeometry args={[0.6, 0.44, 0.7]} />
        <meshStandardMaterial color={palette.slab} roughness={0.9} />
        <Edges color={palette.edge} threshold={15} />
      </mesh>
      <mesh position={[-w / 2 + 0.4, 0.2, -0.35]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.4, 20]} />
        <meshStandardMaterial color={palette.core} roughness={0.8} />
      </mesh>
    </group>
  );
}

export function Building3D(props: Building3DProps) {
  const height = levelY(props.levels - 1) + levelH(props.levels - 1);
  const span = Math.max(props.bays * BAY, height);
  const dist = 5.6 + span * 1.55;
  return (
    <div className={props.className}>
      <Canvas
        shadows
        flat
        dpr={[1, 2]}
        camera={{ position: [dist * 0.62, height * 0.75 + 2.4, dist * 0.92], fov: 32 }}
        onPointerMissed={() => (document.body.style.cursor = "")}
      >
        <Scene {...props} />
        <OrbitControls
          target={[0, height * 0.45, 0]}
          enablePan={false}
          minDistance={4}
          maxDistance={dist * 1.8}
          minPolarAngle={0.35}
          maxPolarAngle={Math.PI / 2.08}
          autoRotate={props.autoRotate}
          autoRotateSpeed={0.6}
          enableDamping
          onStart={props.onInteract}
        />
      </Canvas>
    </div>
  );
}
