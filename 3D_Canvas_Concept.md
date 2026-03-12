# 3D Topology Canvas Concept

**Role:** The 3D Topology Canvas serves as the premier visualization interface for interpreting, validating, and mutating PCF Cartesian geometry in a tangible spatial context. It integrates directly into the Vite app, acting as a visual layer on top of the `PcfTopologyGraph_2` physics engine.

## 1. Technology Stack
- `@react-three/fiber` (R3F): React wrapper over `three.js`. Used to declare 3D scenes using components.
- `@react-three/drei`: Helper library for R3F providing essential utilities like `<OrbitControls>`, `<Line>`, and environment pre-sets.
- `three`: The core WebGL 3D rendering engine.

## 2. Rendering Logic & Component Architecture

### The Data Table mapping
The system iterates over `state.dataTable` and maps specific PCF `type` attributes to specific 3D meshes:
- **`PIPE`**: Rendered as a `<Cylinder>` or `<Line>` where length is dynamically calculated by `vec.mag(EP2 - EP1)` and radius by `bore / 2`.
- **`FLANGE` / `VALVE`**: Rendered as flat disks or distinct nodes at `EP1` and `EP2` boundaries.
- **`TEE`**: Rendered by connecting `EP1` to `EP2` (Header) and drawing a perpendicular mesh from `CP` to `BP` (Branch).
- **`SUPPORT`**: Rendered as a simple `<Box>` at `supportCoor`.

## 3. Visual UI Overlays

### A. Rendering Gaps
When `GapOverlap.js` detects a gap, it produces an analysis object. The canvas renders this as a **glaring red `<Line>`** connecting the two disjointed endpoints, or as a semi-transparent red bounding box encapsulating the empty space.

### B. "Ghost" Fix Proposals
When the smart fixer proposes a fix (e.g., `GAP_SNAP_IMMUTABLE`), it calculates the vector translation. Before applying, the canvas renders a holographic (opacity 0.3, wireframe) mesh at the *proposed* new location, overlaying the solid current location. This gives the user immediate visual confirmation of the solver's intent.

### C. Canvas Interactivity
R3F supports `onClick` and `onPointerOver` events natively on meshes.
Clicking a gap (the red line) or a Ghost Proposal triggers a React state change that renders a floating `<Html>` dialog overlay (from `@react-three/drei`) directly anchored to that 3D coordinate. The dialog contains:
- The `fixingAction` description text.
- `[Approve]` and `[Reject]` buttons.

## 4. Execution & Animation
When "Apply Fixes" is dispatched, the state updates. To make the transition smooth, `react-spring/three` can be used to interpolate the positions from the original coordinates to the mutated coordinates over a `500ms` duration, visually snapping the geometry into place.

---

## 5. React Component Skeleton (`src/ui/tabs/CanvasTabSkeleton.jsx`)

```jsx
// src/ui/tabs/CanvasTabSkeleton.jsx
/*
import React, { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import { useAppContext } from '../../store/AppContext';

// --- Sub-components ---

// Renders a single pipe based on EP1 and EP2
const PipeMesh = ({ element }) => {
  const { ep1, ep2, bore } = element;
  if (!ep1 || !ep2) return null;

  // Calculate midpoint for cylinder placement, or just use <Line> for stick models
  const points = [[ep1.x, ep1.y, ep1.z], [ep2.x, ep2.y, ep2.z]];

  return (
    <Line
      points={points}
      color="blue"
      lineWidth={bore ? bore / 10 : 2} // Scale bore for visual clarity
    />
  );
};

// Renders a Gap as a red dashed line and provides an interactive anchor
const GapOverlay = ({ gapProposal }) => {
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  const { elementA, elementB, description } = gapProposal;
  // Assume exitPt A and entryPt B exist in the proposal
  const pA = [elementA.ep2.x, elementA.ep2.y, elementA.ep2.z];
  const pB = [elementB.ep1.x, elementB.ep1.y, elementB.ep1.z];

  // Midpoint for the HTML Dialog
  const midX = (pA[0] + pB[0]) / 2;
  const midY = (pA[1] + pB[1]) / 2;
  const midZ = (pA[2] + pB[2]) / 2;

  return (
    <group>
      <Line
        points={[pA, pB]}
        color={hovered ? "orange" : "red"}
        lineWidth={3}
        dashed={true}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => setClicked(!clicked)}
      />

      {clicked && (
        <Html position={[midX, midY, midZ]} center>
          <div className="bg-white p-2 rounded shadow text-xs w-48 border border-red-300">
            <p className="font-bold text-red-600 mb-1">Gap Detected</p>
            <p className="mb-2 text-gray-700">{description}</p>
            <div className="flex gap-2">
              <button className="bg-green-500 text-white px-2 py-1 rounded w-full">Approve</button>
              <button className="bg-gray-300 text-black px-2 py-1 rounded w-full" onClick={() => setClicked(false)}>Reject</button>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

// --- Main Tab ---

export function CanvasTab() {
  const { state } = useAppContext();
  const { dataTable, smartFix } = state;

  const pipes = useMemo(() => dataTable.filter(r => r.type === 'PIPE'), [dataTable]);
  const proposals = smartFix.proposedFixes || [];

  return (
    <div className="w-full h-[calc(100vh-12rem)] bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
      <Canvas camera={{ position: [1000, 1000, 1000], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        // Render existing topology
        {pipes.map(p => (
          <PipeMesh key={p._rowIndex} element={p} />
        ))}

        // Render Gap / Fix Overlays
        {proposals.map((prop, idx) => (
          <GapOverlay key={`gap-${idx}`} gapProposal={prop} />
        ))}

        <OrbitControls makeDefault />
        <gridHelper args={[10000, 100]} />
        <axesHelper args={[5000]} />
      </Canvas>
    </div>
  );
}
*/
```