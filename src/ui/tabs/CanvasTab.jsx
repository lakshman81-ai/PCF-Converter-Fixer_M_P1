import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
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
    meshRef.current.computeBoundingSphere();
  }, [pipes, dummy]);

  const [selectedGeom, setSelectedGeom] = useState(null);

  const handlePointerDown = (e) => {
      e.stopPropagation();
      const instanceId = e.instanceId;
      if (instanceId !== undefined && pipes[instanceId]) {
          const pipe = pipes[instanceId];
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

              useStore.getState().setSelected(pipe._rowIndex);

              window.dispatchEvent(new CustomEvent('canvas-focus-point', { detail: { x: midX, y: midY, z: midZ, dist: distance } }));
          }
      }
  };

  const handlePointerMissed = () => {
      setSelectedGeom(null);
      useStore.getState().setSelected(null);
  };

  if (pipes.length === 0) return null;

  return (
    <group onPointerMissed={handlePointerMissed}>
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
// Gap/Proposal Map Pin Visualization
// ----------------------------------------------------
const IssueMapPin = () => {
  const { state: appState } = useAppContext();
  const proposals = useStore(state => state.proposals);
  const mapPins = [];

  // Generate pins for validation issues
  const validationIssues = (appState.stage2Data || []).filter(r =>
      r.fixingAction && (r.fixingAction.includes('ERROR') || r.fixingAction.includes('WARNING'))
  );

  validationIssues.forEach(row => {
      const pt = row.ep2 || row.cp || row.ep1;
      if (!pt) return;
      // Check if a proposal already covers this row to avoid double pinning
      if (proposals.some(p => p.elementA._rowIndex === row._rowIndex)) return;

      mapPins.push({
          rowIdx: row._rowIndex,
          pos: [pt.x, pt.y, pt.z],
          color: row.fixingAction.includes('ERROR') ? '#ef4444' : '#f59e0b',
          label: `Row ${row._rowIndex}`
      });
  });

  return (
      <group>
          {mapPins.map((pin, i) => (
              <Html key={`pin-${i}`} position={pin.pos} center zIndexRange={[100, 0]} distanceFactor={3000}>
                  <div className="flex flex-col items-center pointer-events-none drop-shadow-lg" style={{ transform: 'translateY(-100%)' }}>
                      <div className="bg-white border-4 border-red-600 rounded-full px-3 py-1 font-bold text-slate-900 text-lg shadow-xl relative z-10 min-w-max">
                          {pin.label}
                      </div>
                      <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[24px] border-l-transparent border-r-transparent border-t-red-600 -mt-1 relative z-0 filter drop-shadow"></div>
                  </div>
              </Html>
          ))}
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

  const { elementA, elementB, description, _fixApproved, ptA, ptB } = proposal;

  const handleApproveAndMutate = (e) => {
      e.stopPropagation();

      // 1. Mark as approved in Zustand visual store
      setProposalStatus(elementA._rowIndex, true);

      // 2. Mark as approved in global AppContext — geometry NOT mutated yet
      //    Geometry changes happen only when user clicks "Apply Fixes ✓" in the status bar
      const updatedTable = appState.stage2Data.map(r =>
          r._rowIndex === elementA._rowIndex ? { ...r, _fixApproved: true } : r
      );
      dispatch({ type: "SET_STAGE_2_DATA", payload: updatedTable });

      // 3. Log the approval
      dispatch({ type: "ADD_LOG", payload: {
         stage: "FIXING",
         type: "Approved",
         row: elementA._rowIndex,
         message: `3D Canvas: Approved Fix for row ${elementA._rowIndex}`
      }});

      setClicked(false);
  };

  const handleReject = (e) => {
      e.stopPropagation();
      setProposalStatus(elementA._rowIndex, false);
      setClicked(false);
  };

  // Default to ep2/ep1 if ptA/ptB aren't explicitly provided by engine
  const pointA = ptA || elementA.ep2 || elementA.ep1;
  const pointB = ptB || elementB.ep1 || elementB.ep2;

  if (!pointA || !pointB) return null;

  const vecA = new THREE.Vector3(pointA.x, pointA.y, pointA.z);
  const vecB = new THREE.Vector3(pointB.x, pointB.y, pointB.z);
  const distance = vecA.distanceTo(vecB);

  const midPoint = vecA.clone().lerp(vecB, 0.5);
  const midX = midPoint.x;
  const midY = midPoint.y;
  const midZ = midPoint.z;

  const direction = vecB.clone().sub(vecA).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);

  // Determine if it's a pipe-to-pipe connection
  const isPipeA = (elementA.type || "").toUpperCase() === 'PIPE';
  const isPipeB = (elementB.type || "").toUpperCase() === 'PIPE';

  const isGap = distance > 1; // Assuming 1mm tolerance

  const bore = elementA.bore || elementB.bore || 10;
  const radius = bore / 2;

  // Active Html overlay is expensive, so only show when clicked
  return (
    <group>
      {isPipeA && isPipeB && distance > 0 ? (
          // Draw translucent pipe
          <mesh
            position={[midX, midY, midZ]}
            quaternion={quaternion}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
            onClick={(e) => { e.stopPropagation(); setClicked(!clicked); }}
          >
              <cylinderGeometry args={[radius, radius, distance, 16]} />
              <meshStandardMaterial
                  color={isGap ? (hovered ? "#f87171" : "#ef4444") : (hovered ? "#60a5fa" : "#3b82f6")}
                  transparent={true}
                  opacity={0.6}
                  depthWrite={false}
              />
          </mesh>
      ) : (
          // Draw Line for non-pipe elements
          <Line
            points={[[vecA.x, vecA.y, vecA.z], [vecB.x, vecB.y, vecB.z]]}
            color={hovered ? "#fcd34d" : "#ef4444"}
            lineWidth={3}
            dashed={true}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
            onClick={(e) => { e.stopPropagation(); setClicked(!clicked); }}
          />
      )}

      {/* Fallback Icon for non-pipe elements */}
      {(!isPipeA || !isPipeB) && (
          <mesh
            position={[midX, midY, midZ]}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
            onClick={(e) => { e.stopPropagation(); setClicked(!clicked); }}
          >
              <sphereGeometry args={[radius * 2, 16, 16]} />
              <meshStandardMaterial color={hovered ? "#fcd34d" : "#ef4444"} transparent={true} opacity={0.8} />
          </mesh>
      )}

      {/* Passive Text Label (cheap WebGL) */}
      {!clicked && distance > 0 && (
        <Text
          position={[midX, midY + radius * 3 + 50, midZ]}
          color="#ef4444"
          fontSize={80}
          anchorX="center"
          anchorY="middle"
        >
          {Math.round(distance)}mm
        </Text>
      )}

      {/* Visual Indicator of Proposal status instead of HTML popups */}
      {clicked && (
         <Html position={[midX, midY, midZ]} center zIndexRange={[100, 0]}>
             <div className="bg-slate-900 text-white px-3 py-2 rounded text-xs whitespace-nowrap border border-slate-700 shadow-lg pointer-events-auto flex flex-col gap-2">
                 <div className="font-semibold text-slate-300 border-b border-slate-700 pb-1 mb-1">Proposed Fix</div>
                 <div>{description}</div>
                 <div className="flex gap-2 mt-1">
                     <button className="flex-1 bg-green-600 hover:bg-green-500 text-white text-[10px] py-1 px-2 rounded" onClick={handleApproveAndMutate}>Approve</button>
                     <button className="flex-1 bg-red-600 hover:bg-red-500 text-white text-[10px] py-1 px-2 rounded" onClick={handleReject}>Reject</button>
                 </div>
             </div>
         </Html>
      )}
    </group>
  );
};


// ----------------------------------------------------
// Stage-2 Errors/Warnings Panel
// ----------------------------------------------------
const IssuesPanel = () => {
    const proposals = useStore(state => state.proposals);
    const setProposalStatus = useStore(state => state.setProposalStatus);
    const { state: appState, dispatch } = useAppContext();

    const handleFocusIssue = (prop) => {
        if (!prop.elementA || (!prop.elementA.ep2 && !prop.elementA.ep1)) return;
        const pt = prop.elementA.ep2 || prop.elementA.ep1;
        useStore.getState().setSelected(prop.elementA._rowIndex);
        window.dispatchEvent(new CustomEvent('canvas-focus-point', { detail: { x: pt.x, y: pt.y, z: pt.z, dist: 1500 } }));
    };

    const handleFocusRow = (e, row) => {
        e.stopPropagation();
        if (!row.ep2 && !row.cp && !row.ep1) return;
        const pt = row.ep2 || row.cp || row.ep1;
        useStore.getState().setSelected(row._rowIndex);
        window.dispatchEvent(new CustomEvent('canvas-focus-point', { detail: { x: pt.x, y: pt.y, z: pt.z, dist: 1500 } }));
    };

    const handleApprove = (e, prop) => {
        e.stopPropagation();
        setProposalStatus(prop.elementA._rowIndex, true);
        const updatedTable = appState.stage2Data.map(r =>
            r._rowIndex === prop.elementA._rowIndex ? { ...r, _fixApproved: true } : r
        );
        dispatch({ type: "SET_STAGE_2_DATA", payload: updatedTable });
        dispatch({ type: "ADD_LOG", payload: {
           stage: "FIXING", type: "Applied",
           row: prop.elementA._rowIndex,
           message: `User Approved Fix: ${prop.description}`
        }});
    };

    const handleReject = (e, prop) => {
        e.stopPropagation();
        setProposalStatus(prop.elementA._rowIndex, false);
        const updatedTable = appState.stage2Data.map(r =>
            r._rowIndex === prop.elementA._rowIndex ? { ...r, _fixApproved: false } : r
        );
        dispatch({ type: "SET_STAGE_2_DATA", payload: updatedTable });
        dispatch({ type: "ADD_LOG", payload: {
           stage: "FIXING", type: "Warning",
           row: prop.elementA._rowIndex,
           message: `User Rejected Fix: ${prop.description}`
        }});
    };

    // Validation errors/warnings from stage2Data
    const validationIssues = (appState.stage2Data || []).filter(r =>
        r.fixingAction && (r.fixingAction.includes('ERROR') || r.fixingAction.includes('WARNING'))
    );

    const activeProposals = proposals.filter(p => p._fixApproved !== true);
    const hasAnything = validationIssues.length > 0 || activeProposals.length > 0;

    if (!hasAnything) return null;

    return (
        <div className="absolute top-4 right-32 z-10 w-80 max-h-[70vh] overflow-y-auto bg-slate-900/90 border border-red-500/30 rounded-lg shadow-2xl backdrop-blur text-sm pointer-events-auto flex flex-col">
            <div className="bg-red-900/50 p-2 border-b border-red-500/30 sticky top-0 flex justify-between items-center">
                <span className="text-red-300 font-bold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    Stage 2 Issues ({validationIssues.length + activeProposals.length})
                </span>
            </div>

            <div className="p-2 flex flex-col gap-2">
                {/* Validation Errors / Warnings */}
                {validationIssues.length > 0 && (
                    <>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Validation Issues</div>
                        {validationIssues.map((row, idx) => (
                            <div key={`val-${idx}`} className={`p-2 rounded border text-xs ${
                                row.fixingAction.includes('ERROR') ? 'bg-red-950/60 border-red-700' : 'bg-orange-950/60 border-orange-700'
                            }`}>
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold text-slate-200 flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                        Row {row._rowIndex} — {row.type}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button onClick={(e) => handleFocusRow(e, row)} className="text-slate-400 hover:text-white transition-colors" title="Zoom to issue">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                                        </button>
                                        <span className={`text-[10px] px-1 rounded border ${
                                            row.fixingAction.includes('ERROR') ? 'text-red-400 bg-red-900/30 border-red-800' : 'text-orange-400 bg-orange-900/30 border-orange-800'
                                        }`}>{row.fixingAction.includes('ERROR') ? 'ERROR' : 'WARN'}</span>
                                    </div>
                                </div>
                                <p className={`text-xs mb-2 ${row._fixApproved === false ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{row.fixingAction}</p>
                                {row._fixApproved === true ? (
                                    <div className="text-green-500 font-bold text-xs mt-1">✓ Approved</div>
                                ) : row._fixApproved === false ? (
                                    <div className="text-blue-500 line-through font-bold text-xs mt-1">✓ Rejected</div>
                                ) : (
                                    <>
                                        {/* Remove inappropriate Approve/Reject buttons for pure validation messages without proposals */}
                                    </>
                                )}
                            </div>
                        ))}
                    </>
                )}

                {/* Smart Fix Proposals */}
                {activeProposals.length > 0 && (
                    <>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 mt-1">Smart Fix Proposals</div>
                        {activeProposals.map((prop, idx) => {
                            return (
                                <div
                                    key={idx}
                                    className="bg-slate-800/80 p-2 rounded border border-slate-700 hover:border-amber-500/50 cursor-pointer transition-colors"
                                    onClick={() => handleFocusIssue(prop)}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className="font-semibold text-slate-200 flex items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                            Row {prop.elementA?._rowIndex} — {prop.elementA?.type}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); handleFocusIssue(prop); }} className="text-slate-400 hover:text-white transition-colors" title="Zoom to issue">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                                            </button>
                                        </div>
                                    </div>

                                    {(() => {
                                        let validationMsg = '';
                                        let actionMsg = prop.description || "";

                                        const passMatch = actionMsg.match(/^\[(Pass\s*\w+)\]/i);
                                        let passPrefix = "[1st Pass]";
                                        if (passMatch) {
                                            const pMatch = passMatch[1].toLowerCase();
                                            if (pMatch.includes('pass 2')) passPrefix = "[2nd Pass]";
                                            else if (pMatch.includes('pass 3')) passPrefix = "[3rd Pass]";
                                        }

                                        if (actionMsg.includes('[Issue]') && actionMsg.includes('[Proposal]')) {
                                            const parts = actionMsg.split('\n[Proposal]');
                                            validationMsg = parts[0].replace(/^\[Pass\s*\w+\]\s*/i, '').replace('[Issue]', '').trim();
                                            actionMsg = parts[1] ? parts[1].trim() : "";
                                        }

                                        // Ensure we don't accidentally remove essential numbers when stripping scores
                                        if (actionMsg) {
                                            actionMsg = actionMsg.replace(/\(Score:\s*[\d.]+\)/g, '').trim();
                                            actionMsg = actionMsg.replace(/Score\s*[\d.]+\[[^\]]+\]/gi, '').trim();
                                        }

                                        return (
                                            <div className="mt-2 text-xs font-mono">
                                                <div className="font-semibold mb-1 flex items-start text-slate-300">
                                                    <span className="text-slate-500 mr-1 whitespace-nowrap">{passPrefix}</span>
                                                    <span className="flex-1">
                                                        {validationMsg && <span className="text-slate-400 mr-1 font-bold">[Issue]</span>}
                                                        {validationMsg}
                                                    </span>
                                                </div>
                                                {actionMsg && (
                                                    <div className="mt-1 pl-2 border-l-2 border-amber-500/50 text-amber-200/80">
                                                        <span className="font-bold mr-1">[Proposal]</span>
                                                        <span className={prop._fixApproved === false ? "line-through opacity-70 text-slate-500" : ""}>{actionMsg}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    <div className="mt-3">
                                        {prop._fixApproved === true ? (
                                            <div className="text-green-500 font-bold text-xs mt-1">✓ Approved</div>
                                        ) : prop._fixApproved === false ? (
                                            <div className="text-blue-500 line-through font-bold text-xs mt-1">✓ Rejected</div>
                                        ) : (
                                            <div className="flex gap-2 items-center">
                                                <button className="flex-1 bg-green-800 hover:bg-green-700 text-white text-xs py-1 rounded transition flex items-center justify-center gap-1" onClick={(e) => handleApprove(e, prop)}>
                                                    ✓ Approve
                                                </button>
                                                <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs py-1 rounded transition flex items-center justify-center gap-1" onClick={(e) => handleReject(e, prop)}>
                                                    ✗ Reject
                                                    {prop.score !== undefined && prop.score < 10 && (
                                                        <span className="text-[10px] text-orange-300 ml-1">(Score {prop.score} &lt; 10)</span>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
        </div>
    );
};

// ----------------------------------------------------
// Main Tab Component
// ----------------------------------------------------

const ControlsAutoCenter = () => {
    const controlsRef = useRef();
    const getPipes = useStore(state => state.getPipes);
    const [targetPos, setTargetPos] = useState(null);
    const [camPos, setCamPos] = useState(null);
    const isAnimating = useRef(false);

    // Smooth camera interpolation
    useFrame((state, delta) => {
        if (!controlsRef.current || !isAnimating.current || !targetPos || !camPos) return;

        // Lerp OrbitControls target
        controlsRef.current.target.lerp(targetPos, 5 * delta);
        // Lerp Camera position
        state.camera.position.lerp(camPos, 5 * delta);

        // Stop animating when close
        if (controlsRef.current.target.distanceTo(targetPos) < 1 && state.camera.position.distanceTo(camPos) < 1) {
            isAnimating.current = false;
        }

        controlsRef.current.update();
    });

    // Add custom event listener for auto-center
    useEffect(() => {
        const handleFocus = (e) => {
            if (!controlsRef.current) return;
            const { x, y, z, dist } = e.detail;
            const tPos = new THREE.Vector3(x, y, z);
            // Move camera closer to object based on its length/dist
            // Make sure the zoom distance isn't excessively far or close
            const zoomDist = Math.max(dist * 1.5, 300);

            // Current camera direction to object
            const dir = new THREE.Vector3().subVectors(controlsRef.current.object.position, tPos).normalize();
            if (dir.lengthSq() < 0.1) dir.set(1, 1, 1).normalize(); // Default offset if dead center

            const cPos = new THREE.Vector3().copy(tPos).addScaledVector(dir, zoomDist);

            setTargetPos(tPos);
            setCamPos(cPos);
            isAnimating.current = true;
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

                const tPos = new THREE.Vector3(centerX, centerY, centerZ);
                const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
                const cPos = new THREE.Vector3(centerX + maxDim, centerY + maxDim, centerZ + maxDim);

                setTargetPos(tPos);
                setCamPos(cPos);
                isAnimating.current = true;
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
        <p className="text-slate-400 text-xs mt-1">Note: Visualization reflects data from Stage 2.</p>
        <p className="text-slate-500 text-[10px] mt-0.5">Left-click element to focus/orbit, Right-click pan, Scroll zoom.</p>
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

      <IssuesPanel />

      <Canvas camera={{ position: [5000, 5000, 5000], fov: 50, near: 1, far: 100000 }}>
        <color attach="background" args={['#020617']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[1000, 1000, 500]} intensity={1.5} />
        <directionalLight position={[-1000, -1000, -500]} intensity={0.5} />

        <InstancedPipes />

        {proposals.map((prop, idx) => (
          <ProposalOverlay key={`prop-${idx}`} proposal={prop} />
        ))}

        <IssueMapPin />

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