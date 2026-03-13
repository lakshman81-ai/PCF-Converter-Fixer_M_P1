import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { useAppContext } from '../../store/AppContext';
import { applyFixes } from '../../engine/FixApplicator';
import { createLogger } from '../../utils/Logger';

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

  const [selectedId, setSelectedId] = useState(null);
  const [selectedGeom, setSelectedGeom] = useState(null);

  const handlePointerDown = (e) => {
      e.stopPropagation();
      const instanceId = e.instanceId;
      if (instanceId !== undefined && pipes[instanceId]) {
          const pipe = pipes[instanceId];
          setSelectedId(instanceId);
          if (pipe.ep1 && pipe.ep2) {
              const midX = (pipe.ep1.x + pipe.ep2.x) / 2;
              const midY = (pipe.ep1.y + pipe.ep2.y) / 2;
              const midZ = (pipe.ep1.z + pipe.ep2.z) / 2;

              const vecA = new THREE.Vector3(pipe.ep1.x, pipe.ep1.y, pipe.ep1.z);
              const vecB = new THREE.Vector3(pipe.ep2.x, pipe.ep2.y, pipe.ep2.z);
              const distance = vecA.distanceTo(vecB);
              const radius = pipe.bore ? pipe.bore / 2 : 5;
              const direction = vecB.clone().sub(vecA).normalize();
              const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

              setSelectedGeom({ pos: [midX, midY, midZ], dist: distance, radius, quat: quaternion });

              window.dispatchEvent(new CustomEvent('canvas-focus-point', { detail: { x: midX, y: midY, z: midZ, dist: distance } }));
          }
      }
  };

  if (pipes.length === 0) return null;

  return (
    <group>
        <instancedMesh ref={meshRef} args={[null, null, pipes.length]} onPointerDown={handlePointerDown}>
          <cylinderGeometry args={[1, 1, 1, 16]} />
          <meshStandardMaterial color="#3b82f6" />
        </instancedMesh>

        {/* Highlight Overlay */}
        {selectedGeom && (
             <mesh position={selectedGeom.pos} quaternion={selectedGeom.quat}>
                 <cylinderGeometry args={[selectedGeom.radius * 1.5, selectedGeom.radius * 1.5, selectedGeom.dist, 16]} />
                 <meshBasicMaterial color="#eab308" wireframe={true} />
             </mesh>
        )}
    </group>
  );
};

// ----------------------------------------------------
// Gap/Proposal Visualization
// ----------------------------------------------------
const ProposalOverlay = ({ proposal }) => {
  const [clicked, setClicked] = useState(false);
  const [hovered, setHovered] = useState(false);
  const setProposalStatus = useStore(state => state.setProposalStatus);
  const setTable = useStore(state => state.setDataTable);
  const { state: appState, dispatch } = useAppContext();

  const { elementA, elementB, description, vector, _fixApproved } = proposal;

  const handleApproveAndMutate = (e) => {
      e.stopPropagation();
      setProposalStatus(elementA._rowIndex, true);

      const updatedTable = appState.stage2Data.map(r =>
          r._rowIndex === elementA._rowIndex ? { ...r, _fixApproved: true } : r
      );

      const logger = new Logger();
      const result = applyFixes(updatedTable, appState.smartFix.chains, appState.config, logger.getLog ? logger : { push: () => {}, getLog: () => [] });
      const tableToApply = result.updatedTable || result.table || result;

      dispatch({ type: "SET_STAGE_2_DATA", payload: tableToApply });
      dispatch({ type: "SET_SMART_FIX_STATUS", status: "applied" });
      setTable(tableToApply);
      setClicked(false);
  };

  const handleReject = (e) => {
      e.stopPropagation();
      setProposalStatus(elementA._rowIndex, false);
      setClicked(false);
  };

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
          <div className={`p-3 rounded-lg shadow-xl text-xs w-64 border backdrop-blur-md ${
             _fixApproved === true ? 'bg-green-900 border-green-500/50' :
             _fixApproved === false ? 'bg-slate-900 border-slate-500/50' :
             'bg-slate-800 border-red-500/50'
          }`}>
            <p className={`font-bold mb-1 border-b pb-1 ${
                _fixApproved === true ? 'text-green-400 border-green-700' :
                _fixApproved === false ? 'text-slate-400 border-slate-700' :
                'text-red-400 border-slate-700'
            }`}>
                {_fixApproved === true ? 'Proposal Approved' : _fixApproved === false ? 'Proposal Rejected' : 'Topology Anomaly'}
            </p>
            <p className={`mb-3 leading-relaxed ${_fixApproved === false ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{description}</p>
            <div className="flex gap-2">
              <button
                className={`text-white px-2 py-1.5 rounded w-full transition-colors ${
                    _fixApproved === true ? 'bg-green-600 hover:bg-green-500' : 'bg-slate-700 hover:bg-green-600'
                }`}
                onClick={handleApproveAndMutate}
              >
                ✓ Approve & Snap
              </button>
              <button
                className={`text-white px-2 py-1.5 rounded w-full transition-colors ${
                    _fixApproved === false ? 'bg-red-600 hover:bg-red-500' : 'bg-slate-700 hover:bg-red-600'
                }`}
                onClick={handleReject}
              >
                ✗ Reject
              </button>
            </div>
            <button className="mt-2 text-slate-400 hover:text-slate-200 text-[10px] w-full text-right" onClick={(e) => { e.stopPropagation(); setClicked(false); }}>Close</button>
          </div>
        </Html>
      )}
    </group>
  );
};


// ----------------------------------------------------
// Main Tab Component
// ----------------------------------------------------
const ControlsAutoCenter = () => {
    const controlsRef = useRef();
    const getPipes = useStore(state => state.getPipes);

    // Add custom event listener for auto-center
    useEffect(() => {
        const handleFocus = (e) => {
            if (!controlsRef.current) return;
            const { x, y, z, dist } = e.detail;
            controlsRef.current.target.set(x, y, z);
            // Move camera closer to object based on its length/dist
            const zoomDist = Math.max(dist * 2, 500);
            controlsRef.current.object.position.set(x + zoomDist, y + zoomDist, z + zoomDist);
            controlsRef.current.update();
        };

        const handleCenter = () => {
            const pipes = getPipes();
            if (pipes.length === 0 || !controlsRef.current) return;

            // Calculate bounding box of all pipes
            let minX = Infinity, minY = Infinity, minZ = Infinity;
            let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

            pipes.forEach(p => {
                if (p.ep1) {
                    minX = Math.min(minX, p.ep1.x); minY = Math.min(minY, p.ep1.y); minZ = Math.min(minZ, p.ep1.z);
                    maxX = Math.max(maxX, p.ep1.x); maxY = Math.max(maxY, p.ep1.y); maxZ = Math.max(maxZ, p.ep1.z);
                }
                if (p.ep2) {
                    minX = Math.min(minX, p.ep2.x); minY = Math.min(minY, p.ep2.y); minZ = Math.min(minZ, p.ep2.z);
                    maxX = Math.max(maxX, p.ep2.x); maxY = Math.max(maxY, p.ep2.y); maxZ = Math.max(maxZ, p.ep2.z);
                }
            });

            if (minX !== Infinity) {
                const centerX = (minX + maxX) / 2;
                const centerY = (minY + maxY) / 2;
                const centerZ = (minZ + maxZ) / 2;

                // Set target of OrbitControls
                controlsRef.current.target.set(centerX, centerY, centerZ);
                // Adjust camera position relative to center
                const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
                controlsRef.current.object.position.set(centerX + maxDim, centerY + maxDim, centerZ + maxDim);
                controlsRef.current.update();
            }
        };

        window.addEventListener('canvas-auto-center', handleCenter);
        window.addEventListener('canvas-focus-point', handleFocus);
        return () => {
            window.removeEventListener('canvas-auto-center', handleCenter);
            window.removeEventListener('canvas-focus-point', handleFocus);
        };
    }, [getPipes]);

    return <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.1} />;
};

export function CanvasTab() {
  const proposals = useStore(state => state.proposals);

  const handleAutoCenter = () => {
      window.dispatchEvent(new CustomEvent('canvas-auto-center'));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] w-full overflow-hidden bg-slate-950 rounded-lg border border-slate-800 shadow-inner relative">

      {/* Canvas Overlay UI */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h2 className="text-slate-200 font-bold text-lg drop-shadow-md">3D Topology Canvas</h2>
        <p className="text-slate-400 text-xs mt-1">Right-click pan, Scroll zoom, Left-click rotate</p>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <button
            onClick={handleAutoCenter}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded border border-slate-700 shadow flex items-center gap-2 text-sm transition-colors"
            title="Auto Center Camera"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h6"/><path d="M3 3v6"/><path d="M21 3h-6"/><path d="M21 3v6"/><path d="M3 21h6"/><path d="M3 21v-6"/><path d="M21 21h-6"/><path d="M21 21v-6"/></svg>
            Auto Center
        </button>
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

        <ControlsAutoCenter />

        {/* World Reference */}
        <gridHelper args={[20000, 20, '#1e293b', '#0f172a']} position={[0, -1000, 0]} />
      </Canvas>

      {/* Small Axis Reference Overlay */}
      <div className="absolute bottom-4 right-4 w-24 h-24 pointer-events-none">
        <Canvas orthographic camera={{ position: [20, 20, 20], zoom: 5 }}>
            <ambientLight intensity={1} />
            <axesHelper args={[10]} />
            <Text position={[12, 0, 0]} color="red" fontSize={4}>X</Text>
            <Text position={[0, 12, 0]} color="green" fontSize={4}>Y</Text>
            <Text position={[0, 0, 12]} color="blue" fontSize={4}>Z</Text>
        </Canvas>
      </div>
    </div>
  );
}
