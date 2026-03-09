import { vec } from '../math/VectorMath.js';

export function buildConnectivityGraph(dataTable, config) {
  const tolerance = Number(config?.smartFixer?.connectionTolerance ?? 25.0);
  const gridSnap = Number(config?.smartFixer?.gridSnapResolution ?? 1.0);

  // Snap coordinate to grid for indexing
  const snap = (coord) => ({
    x: Math.round(Number(coord.x) / gridSnap) * gridSnap,
    y: Math.round(Number(coord.y) / gridSnap) * gridSnap,
    z: Math.round(Number(coord.z) / gridSnap) * gridSnap,
  });
  const coordKey = (c) => `${c.x},${c.y},${c.z}`;

  // Step 1: Classify connection points per component
  const components = dataTable
    .filter(row => row.type && !["ISOGEN-FILES","UNITS-BORE","UNITS-CO-ORDS",
      "UNITS-WEIGHT","UNITS-BOLT-DIA","UNITS-BOLT-LENGTH",
      "PIPELINE-REFERENCE","MESSAGE-SQUARE"].includes(row.type.toUpperCase()))
    .map(row => ({
      ...row,
      entryPoint: getEntryPoint(row),
      exitPoint: getExitPoint(row),
      branchExitPoint: getBranchExitPoint(row), // null except for TEE
    }));

  // Step 2: Build entry-point spatial index
  const entryIndex = new Map();
  for (const comp of components) {
    if (comp.entryPoint && !vec.isZero(comp.entryPoint)) {
      const key = coordKey(snap(comp.entryPoint));
      if (!entryIndex.has(key)) entryIndex.set(key, []);
      entryIndex.get(key).push(comp);
    }
  }

  // Step 3: Match exits to entries (build edges)
  const edges = new Map();      // comp._rowIndex → next comp
  const branchEdges = new Map(); // comp._rowIndex → branch start comp (TEE only)
  const hasIncoming = new Set(); // row indices that have an incoming connection

  for (const comp of components) {
    if (!comp.exitPoint || vec.isZero(comp.exitPoint)) continue;

    const match = findNearestEntry(comp.exitPoint, entryIndex, snap, coordKey, tolerance, comp._rowIndex);
    if (match) {
      edges.set(comp._rowIndex, match);
      hasIncoming.add(match._rowIndex);
    }

    // Branch edge for TEE
    if (comp.branchExitPoint && !vec.isZero(comp.branchExitPoint)) {
      const brMatch = findNearestEntry(comp.branchExitPoint, entryIndex, snap, coordKey, tolerance, comp._rowIndex);
      if (brMatch) {
        branchEdges.set(comp._rowIndex, brMatch);
        hasIncoming.add(brMatch._rowIndex);
      }
    }
  }

  // Step 4: Find chain terminals (no incoming connection)
  const terminals = components.filter(c =>
    !hasIncoming.has(c._rowIndex) && c.type !== "SUPPORT"
  );

  return { components, edges, branchEdges, terminals, entryIndex };
}

export function getEntryPoint(row) {
  const t = (row.type || "").toUpperCase();
  if (t === "SUPPORT") return row.supportCoor || null;
  if (t === "OLET")    return row.cp || null;  // OLET enters at CP
  return row.ep1 || null;
}

export function getExitPoint(row) {
  const t = (row.type || "").toUpperCase();
  if (t === "SUPPORT") return null;            // SUPPORT has no exit
  if (t === "OLET")    return row.bp || null;  // OLET exits at BP
  return row.ep2 || null;
}

export function getBranchExitPoint(row) {
  const t = (row.type || "").toUpperCase();
  if (t === "TEE") return row.bp || null;      // TEE branches at BP
  return null;
}

export function findNearestEntry(exitCoord, entryIndex, snap, coordKey, tolerance, excludeRowIndex) {
  const snapped = snap(exitCoord);
  const key = coordKey(snapped);

  const candidates = entryIndex.get(key) || [];
  let best = null;
  let bestDist = tolerance + 1;

  for (const cand of candidates) {
    if (cand._rowIndex === excludeRowIndex) continue;
    const d = vec.dist(exitCoord, cand.entryPoint);
    if (d < bestDist) { bestDist = d; best = cand; }
  }

  if (!best) {
    const step = snap({ x: 1, y: 1, z: 1 }).x; // gridSnap value
    for (let dx = -step; dx <= step; dx += step) {
      for (let dy = -step; dy <= step; dy += step) {
        for (let dz = -step; dz <= step; dz += step) {
          if (dx === 0 && dy === 0 && dz === 0) continue;
          const nk = coordKey({
            x: snapped.x + dx, y: snapped.y + dy, z: snapped.z + dz
          });
          for (const cand of (entryIndex.get(nk) || [])) {
            if (cand._rowIndex === excludeRowIndex) continue;
            const d = vec.dist(exitCoord, cand.entryPoint);
            if (d < bestDist) { bestDist = d; best = cand; }
          }
        }
      }
    }
  }

  return best;
}
