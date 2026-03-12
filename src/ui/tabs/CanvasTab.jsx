import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';

// ----------------------------------------------------
// Performance Optimized Instanced Pipes Rendering
// ----------------------------------------------------
const InstancedPipes = () => {
  const getPipes = useStore(state => state.getPipes);
  const pipes = getPipes();
  const meshRef = useRef();

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!meshRef.current || pipes.length === 0) return;

    pipes.forEach((element, i) => {
      const { ep1, ep2, bore } = element;
      if (!ep1 || !ep2) return;

      const vecA = new THREE.Vector3(ep1.x, ep1.y, ep1.z);
      const vecB = new THREE.Vector3(ep2.x, ep2.y, ep2.z);
      const distance = vecA.distanceTo(vecB);
      if (distance === 0) return;

      // Position: Midpoint
      const midPoint = vecA.clone().lerp(vecB, 0.5);
      dummy.position.copy(midPoint);

      // Scale: Y-axis is length in Three.js cylinders
      // For visual clarity, scale the X and Z by bore/2
      const radius = bore ? bore / 2 : 5;
      dummy.scale.set(radius, distance, radius);

      // Orientation: Point from A to B
      const direction = vecB.clone().sub(vecA).normalize();
      // Three.js cylinders point UP (Y-axis) by default
      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
      dummy.quaternion.copy(quaternion);

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [pipes, dummy]);

  if (pipes.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[null, null, pipes.length]}>
      <cylinderGeometry args={[1, 1, 1, 16]} />
      <meshStandardMaterial color="#3b82f6" />
    </instancedMesh>
  );
};

// ----------------------------------------------------
// Gap/Proposal Visualization
// ----------------------------------------------------
const ProposalOverlay = ({ proposal }) => {
  const [clicked, setClicked] = useState(false);
  const [hovered, setHovered] = useState(false);

  const { elementA, elementB, description, vector } = proposal;

  if (!elementA.ep2 || !elementB.ep1) return null;

  const pA = [elementA.ep2.x, elementA.ep2.y, elementA.ep2.z];
  const pB = [elementB.ep1.x, elementB.ep1.y, elementB.ep1.z];

  const midX = (pA[0] + pB[0]) / 2;
  const midY = (pA[1] + pB[1]) / 2;
  const midZ = (pA[2] + pB[2]) / 2;

  // Active Html overlay is expensive, so only show when clicked
  return (
    <group>
      <Line
        points={[pA, pB]}
        color={hovered ? "#fcd34d" : "#ef4444"}
        lineWidth={3}
        dashed={true}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
        onClick={(e) => { e.stopPropagation(); setClicked(!clicked); }}
      />

      {/* Passive Text Label (cheap WebGL) */}
      {!clicked && (
        <Text
          position={[midX, midY + 150, midZ]}
          color="#ef4444"
          fontSize={80}
          anchorX="center"
          anchorY="middle"
        >
          {Math.round(new THREE.Vector3(...pA).distanceTo(new THREE.Vector3(...pB)))}mm
        </Text>
      )}

      {/* Active Html Overlay (expensive DOM) */}
      {clicked && (
        <Html position={[midX, midY, midZ]} center zIndexRange={[100, 0]}>
          <div className="bg-slate-800 p-3 rounded-lg shadow-xl text-xs w-64 border border-red-500/50 backdrop-blur-md">
            <p className="font-bold text-red-400 mb-1 border-b border-slate-700 pb-1">Topology Anomaly</p>
            <p className="mb-3 text-slate-300 leading-relaxed">{description}</p>
            <div className="flex gap-2">
              <button
                className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1.5 rounded w-full transition-colors"
                onClick={() => alert("Action dispatched via Zustand")}
              >
                Auto-Fix
              </button>
              <button
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-1.5 rounded w-full transition-colors"
                onClick={() => setClicked(false)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};


// ----------------------------------------------------
// Main Tab Component
// ----------------------------------------------------
export function CanvasTab() {
  const proposals = useStore(state => state.proposals);

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] w-full overflow-hidden bg-slate-950 rounded-lg border border-slate-800 shadow-inner relative">

      {/* Canvas Overlay UI */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h2 className="text-slate-200 font-bold text-lg drop-shadow-md">3D Topology Canvas</h2>
        <p className="text-slate-400 text-xs mt-1">Right-click pan, Scroll zoom, Left-click rotate</p>
      </div>

      <Canvas camera={{ position: [5000, 5000, 5000], fov: 50, near: 1, far: 100000 }}>
        <color attach="background" args={['#020617']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[1000, 1000, 500]} intensity={1.5} />
        <directionalLight position={[-1000, -1000, -500]} intensity={0.5} />

        <InstancedPipes />

        {proposals.map((prop, idx) => (
          <ProposalOverlay key={`prop-${idx}`} proposal={prop} />
        ))}

        <OrbitControls makeDefault enableDamping dampingFactor={0.1} />

        {/* World Reference */}
        <gridHelper args={[20000, 20, '#1e293b', '#0f172a']} position={[0, -1000, 0]} />
        <axesHelper args={[5000]} />
      </Canvas>
    </div>
  );
}
