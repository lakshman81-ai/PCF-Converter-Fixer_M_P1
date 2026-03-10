import React, { useReducer, useState, useRef, useEffect } from 'react';
import { Upload, Download, Copy, Play, Settings, AlertCircle, FileText, FileSpreadsheet, Activity, RefreshCw, Save, RefreshCcw } from 'lucide-react';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// ----------------------------------------------------------------------------
// 1. CONSTANTS & CONFIGURATION
// ----------------------------------------------------------------------------
const DEFAULT_CONFIG = {
  decimals: 4,
  angleFormat: "degrees",
  crlfMode: true,
  pipelineRef: { default: "export sys-1", projectId: "P1", area: "A1" },

  // Column aliases
  columnAliases: {
    "CSV SEQ NO": ["CSV SEQ NO", "SEQ NO", "Seq No", "SL.NO", "Sl No", "SL NO", "SeqNo", "Sequence", "Sequence No", "Item No"],
    "Type": ["Type", "Component", "Comp Type", "CompType", "Component Type", "Fitting", "Item"],
    "TEXT": ["TEXT", "Text", "Description", "Desc", "Comment", "MSG", "MESSAGE-SQUARE"],
    "PIPELINE-REFERENCE": ["PIPELINE-REFERENCE", "Pipeline Ref", "Line No", "Line Number", "Line No.", "LineNo", "PIPE", "Pipe Line"],
    "REF NO.": ["REF NO.", "Ref No", "RefNo", "Reference No", "Reference Number", "Ref", "Tag No", "TagNo"],
    "BORE": ["BORE", "Bore", "NPS", "Nominal Bore", "Dia", "Diameter", "Size", "Pipe Size", "DN"],
    "EP1": ["EP1"], "EP2": ["EP2"], "CP": ["CP"], "BP": ["BP"],
    "SKEY": ["SKEY", "<SKEY>"],
    "SUPPORT CO-ORDS": ["SUPPORT CO-ORDS", "SUPPORT COORDS", "Support Coor"],
    "SUPPORT NAME": ["SUPPORT NAME", "<SUPPORT_NAME>", "Support Name"],
    "SUPPORT GUID": ["SUPPORT GUID", "<SUPPORT_GUID>", "Support Guid"],
    "CA1": ["CA1"], "CA2": ["CA2"], "CA3": ["CA3"], "CA4": ["CA4"], "CA5": ["CA5"], "CA6": ["CA6"],
    "CA7": ["CA7"], "CA8": ["CA8"], "CA9": ["CA9"], "CA10": ["CA10"], "CA97": ["CA97"], "CA98": ["CA98"],
    "Fixing Action": ["Fixing Action", "Action"],
    "LEN1": ["LEN1"], "AXIS1": ["AXIS1"], "LEN2": ["LEN2"], "AXIS2": ["AXIS2"], "LEN3": ["LEN3"], "AXIS3": ["AXIS3"],
    "BRLEN": ["BRLEN", "BrLen"],
    "DELTA_X": ["DELTA_X", "Delta X"], "DELTA_Y": ["DELTA_Y", "Delta Y"], "DELTA_Z": ["DELTA_Z", "Delta Z"],
    "DIAMETER": ["DIAMETER", "OD", "Outer Diameter"],
    "WALL_THICK": ["WALL_THICK", "WT", "Wall Thick"],
    "BEND_PTR": ["BEND_PTR", "Bend Ptr"], "RIGID_PTR": ["RIGID_PTR", "Rigid Ptr"], "INT_PTR": ["INT_PTR", "Int Ptr"],
  },

  // Component type mapping
  typeMapping: {
    "PIPE": "PIPE", "BRAN": "PIPE", "BEND": "BEND", "ELBO": "BEND",
    "TEE": "TEE", "FLANGE": "FLANGE", "FLAN": "FLANGE",
    "VALVE": "VALVE", "VALV": "VALVE", "OLET": "OLET",
    "REDC": "REDUCER-CONCENTRIC", "REDU": "REDUCER-CONCENTRIC",
    "REDE": "REDUCER-ECCENTRIC", "ANCI": "SUPPORT", "SUPPORT": "SUPPORT",
  },

  // Support mapping
  supportMapping: {
    guidPrefix: "UCI:",
    fallbackName: "RST",
    blocks: [
      { condition: "friction_empty_or_03_gap_empty", name: "ANC" },
      { condition: "friction_015", name: "GDE" },
      { condition: "friction_03_gap_gt0", name: "RST" },
    ]
  },

  // BRLEN database
  brlenEqualTee: [
    { nps: "1/2", bore: 15, od: 21.3, C: 25, M: 25 },
    { nps: "3/4", bore: 20, od: 26.7, C: 29, M: 29 },
    { nps: "1", bore: 25, od: 33.4, C: 38, M: 38 },
    { nps: "1-1/4", bore: 32, od: 42.2, C: 48, M: 48 },
    { nps: "1-1/2", bore: 40, od: 48.3, C: 57, M: 57 },
    { nps: "2", bore: 50, od: 60.3, C: 64, M: 64 },
    { nps: "2-1/2", bore: 65, od: 73.0, C: 76, M: 76 },
    { nps: "3", bore: 80, od: 88.9, C: 86, M: 86 },
    { nps: "3-1/2", bore: 90, od: 101.6, C: 95, M: 95 },
    { nps: "4", bore: 100, od: 114.3, C: 105, M: 105 },
    { nps: "5", bore: 125, od: 141.3, C: 124, M: 124 },
    { nps: "6", bore: 150, od: 168.3, C: 143, M: 143 },
    { nps: "8", bore: 200, od: 219.1, C: 178, M: 178 },
    { nps: "10", bore: 250, od: 273.1, C: 216, M: 216 },
    { nps: "12", bore: 300, od: 323.9, C: 254, M: 254 },
    { nps: "14", bore: 350, od: 355.6, C: 279, M: 279 },
    { nps: "16", bore: 400, od: 406.4, C: 305, M: 305 },
    { nps: "18", bore: 450, od: 457.2, C: 343, M: 343 },
    { nps: "20", bore: 500, od: 508.0, C: 381, M: 381 },
    { nps: "24", bore: 600, od: 610.0, C: 432, M: 432 },
    { nps: "30", bore: 750, od: 762.0, C: 559, M: 559 },
    { nps: "36", bore: 900, od: 914.0, C: 660, M: 660 },
    { nps: "42", bore: 1050, od: 1067.0, C: 762, M: 762 },
    { nps: "48", bore: 1200, od: 1219.0, C: 864, M: 864 },
  ],
  brlenReducingTee: [],
  brlenWeldolet: [],

  teeDefaultBore: "header",
  oletDefaultBore: 50,

  autoDetectInch: true,
  standardMmBores: [15, 20, 25, 32, 40, 50, 65, 80, 90, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 750, 900, 1050, 1200],

  fuzzyThreshold: 0.75,
  fuzzyEnablePass2: true,
  fuzzyEnablePass3: true,
};

const EMPTY_COORD = { x: 0, y: 0, z: 0 };
const NULL_COORD = { x: null, y: null, z: null };

// ----------------------------------------------------------------------------
// 2. MATH & UTILITY FUNCTIONS
// ----------------------------------------------------------------------------

const vec = {
  sub:   (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
  add:   (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
  scale: (v, s) => ({ x: v.x * s, y: v.y * s, z: v.z * s }),
  dot:   (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
  cross: (a, b) => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }),
  mag:   (v) => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),
  normalize: (v) => {
    const m = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    return m > 0 ? { x: v.x / m, y: v.y / m, z: v.z / m } : { x: 0, y: 0, z: 0 };
  },
  dist:  (a, b) => Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2),
  mid:   (a, b) => ({ x: (a.x+b.x)/2, y: (a.y+b.y)/2, z: (a.z+b.z)/2 }),
  approxEqual: (a, b, tol = 1.0) =>
    Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol && Math.abs(a.z - b.z) <= tol,
  isZero: (v) => v.x === 0 && v.y === 0 && v.z === 0,
};

function isValidCoord(c) {
  return c && c.x != null && c.y != null && c.z != null;
}

// Format number utility
const fmtCoordStr = (c, dec = 4) => (c && c.x != null && c.y != null && c.z != null) ? `${Number(c.x).toFixed(dec)}, ${Number(c.y).toFixed(dec)}, ${Number(c.z).toFixed(dec)}` : '';
const fmtCoord = (c) => fmtCoordStr(c, 4);

// ----------------------------------------------------------------------------
// SMART FIXER — CHAIN WALKER ENGINE
// ----------------------------------------------------------------------------

// Region B: Connectivity Graph Builder
function buildConnectivityGraph(dataTable, config) {
  const chains = [];
  const tolerance = config.smartFixer?.connectionTolerance ?? 25.0;
  const gridSnap = config.smartFixer?.gridSnapResolution ?? 1.0;
  const strategy = config.smartFixer?.strategy || "sequential";

  const snap = (coord) => ({
    x: Math.round(coord.x / gridSnap) * gridSnap,
    y: Math.round(coord.y / gridSnap) * gridSnap,
    z: Math.round(coord.z / gridSnap) * gridSnap,
  });
  const coordKey = (c) => `${c.x},${c.y},${c.z}`;

  const components = dataTable
    .filter(row => row.type && !["ISOGEN-FILES","UNITS-BORE","UNITS-CO-ORDS","UNITS-WEIGHT","UNITS-BOLT-DIA","UNITS-BOLT-LENGTH","PIPELINE-REFERENCE","MESSAGE-SQUARE"].includes(row.type.toUpperCase()))
    .map(row => ({
      ...row,
      entryPoint: getEntryPoint(row),
      exitPoint: getExitPoint(row),
      branchExitPoint: getBranchExitPoint(row),
    }));

  const entryIndex = new Map();
  for (const comp of components) {
    if (comp.entryPoint && !vec.isZero(comp.entryPoint)) {
      const key = coordKey(snap(comp.entryPoint));
      if (!entryIndex.has(key)) entryIndex.set(key, []);
      entryIndex.get(key).push(comp);
    }
  }

  const edges = new Map();
  const branchEdges = new Map();
  const hasIncoming = new Set();

  for (const comp of components) {
    if (!comp.exitPoint || vec.isZero(comp.exitPoint)) continue;

    const match = findNearestEntry(comp.exitPoint, entryIndex, snap, coordKey, tolerance, comp._rowIndex);
    if (match) {
      edges.set(comp._rowIndex, match);
      hasIncoming.add(match._rowIndex);
    }

    if (comp.branchExitPoint && !vec.isZero(comp.branchExitPoint)) {
      const brMatch = findNearestEntry(comp.branchExitPoint, entryIndex, snap, coordKey, tolerance, comp._rowIndex);
      if (brMatch) {
        branchEdges.set(comp._rowIndex, brMatch);
        hasIncoming.add(brMatch._rowIndex);
      }
    }
  }

  const terminals = components.filter(c => !hasIncoming.has(c._rowIndex) && c.type !== "SUPPORT");

  return { components, edges, branchEdges, terminals, entryIndex };
}

function getEntryPoint(row) {
  const t = (row.type || "").toUpperCase();
  if (t === "SUPPORT") return row.supportCoor || null;
  if (t === "OLET")    return row.cp || null;
  return row.ep1 || null;
}

function getExitPoint(row) {
  const t = (row.type || "").toUpperCase();
  if (t === "SUPPORT") return null;
  if (t === "OLET")    return row.bp || null;
  return row.ep2 || null;
}

function getBranchExitPoint(row) {
  const t = (row.type || "").toUpperCase();
  if (t === "TEE") return row.bp || null;
  return null;
}

function findNearestEntry(exitCoord, entryIndex, snap, coordKey, tolerance, excludeRowIndex) {
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
    const step = snap({ x: 1, y: 1, z: 1 }).x || 1.0;
    for (let dx = -step; dx <= step; dx += step) {
      for (let dy = -step; dy <= step; dy += step) {
        for (let dz = -step; dz <= step; dz += step) {
          if (dx === 0 && dy === 0 && dz === 0) continue;
          const nk = coordKey({ x: snapped.x + dx, y: snapped.y + dy, z: snapped.z + dz });
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

// Region C: Chain Walker
function walkAllChains(graph, config, log) {
  const visited = new Set();
  const allChains = [];

  for (const terminal of graph.terminals) {
    if (visited.has(terminal._rowIndex)) continue;
    const context = createInitialContext(terminal, allChains.length);
    const chain = walkChain(terminal, graph, context, visited, config, log);
    allChains.push(chain);
  }

  const orphans = graph.components.filter(c => !visited.has(c._rowIndex) && c.type !== "SUPPORT");
  for (const orphan of orphans) {
    log.push({
      type: "Error", ruleId: "R-TOP-02", tier: 4, row: orphan._rowIndex,
      message: `Orphan: ${orphan.type} (Row ${orphan._rowIndex}) not connected to any chain.`
    });
  }

  return { chains: allChains, orphans };
}

function createInitialContext(startElement, chainIndex) {
  return {
    travelAxis: null,
    travelDirection: null,
    currentBore: startElement.bore || 0,
    currentMaterial: startElement.ca?.[3] || "",
    currentPressure: startElement.ca?.[1] || "",
    currentTemp: startElement.ca?.[2] || "",
    chainId: `Chain-${chainIndex + 1}`,
    cumulativeVector: { x: 0, y: 0, z: 0 },
    pipeLengthSum: 0,
    lastFittingType: null,
    elevation: startElement.ep1?.z || 0,
    depth: 0,
    pipeSinceLastBend: Infinity,
  };
}

function walkChain(startElement, graph, context, visited, config, log) {
  const chain = [];
  let current = startElement;
  let prevElement = null;

  while (current && !visited.has(current._rowIndex)) {
    visited.add(current._rowIndex);
    const type = (current.type || "").toUpperCase();

    if (type === "SUPPORT") {
      runSupportRules(current, chain, context, config, log);
      current = graph.edges.get(current._rowIndex) || null;
      continue;
    }

    const [elemAxis, elemDir] = detectElementAxis(current, config);
    runElementRules(current, context, prevElement, elemAxis, elemDir, config, log);

    if (elemAxis) {
      context.travelAxis = elemAxis;
      context.travelDirection = elemDir;
    }
    if (current.bore) context.currentBore = current.bore;
    if (current.ca && current.ca[3]) context.currentMaterial = current.ca[3];
    const elemVec = getElementVector(current);
    context.cumulativeVector = vec.add(context.cumulativeVector, elemVec);
    if (type === "PIPE") {
      const len = vec.mag(elemVec);
      context.pipeLengthSum += len;
      context.pipeSinceLastBend += len;
    }
    if (type === "BEND") context.pipeSinceLastBend = 0;
    if (!["PIPE", "SUPPORT"].includes(type)) context.lastFittingType = type;

    const nextElement = graph.edges.get(current._rowIndex) || null;
    let gapVector = null;
    let fixAction = null;

    if (nextElement) {
      const exitPt = getExitPoint(current);
      const entryPt = getEntryPoint(nextElement);
      if (exitPt && entryPt) {
        gapVector = vec.sub(entryPt, exitPt);
        fixAction = analyzeGap(gapVector, context, current, nextElement, config, log);
      }
    }

    chain.push({
      element: current,
      elemAxis,
      elemDir,
      travelAxis: context.travelAxis,
      travelDirection: context.travelDirection,
      gapToNext: gapVector,
      fixAction,
      nextElement,
      branchChain: null,
    });

    if (type === "TEE") {
      const branchStart = graph.branchEdges.get(current._rowIndex);
      if (branchStart && !visited.has(branchStart._rowIndex)) {
        const branchCtx = {
          ...JSON.parse(JSON.stringify(context)),
          travelAxis: detectBranchAxis(current),
          travelDirection: detectBranchDirection(current),
          currentBore: current.branchBore || current.bore,
          depth: context.depth + 1,
          chainId: `${context.chainId}.B`,
          pipeLengthSum: 0,
          cumulativeVector: { x: 0, y: 0, z: 0 },
          pipeSinceLastBend: Infinity,
        };
        const branchChain = walkChain(branchStart, graph, branchCtx, visited, config, log);
        chain[chain.length - 1].branchChain = branchChain;
      }
    }

    prevElement = current;
    current = nextElement;
  }

  runAggregateRules(chain, context, config, log);
  return chain;
}

// Region D: Element Axis Detector
function detectElementAxis(element, config) {
  const threshold = config.smartFixer?.offAxisThreshold ?? 0.5;
  const type = (element.type || "").toUpperCase();

  if (type === "SUPPORT" || type === "OLET") return [null, null];

  const ep1 = element.ep1;
  const ep2 = element.ep2;
  if (!ep1 || !ep2) return [null, null];

  const dx = ep2.x - ep1.x;
  const dy = ep2.y - ep1.y;
  const dz = ep2.z - ep1.z;

  const axes = [];
  if (Math.abs(dx) > threshold) axes.push(["X", dx]);
  if (Math.abs(dy) > threshold) axes.push(["Y", dy]);
  if (Math.abs(dz) > threshold) axes.push(["Z", dz]);

  if (axes.length === 0) return [null, null];

  if (axes.length === 1) return [axes[0][0], axes[0][1] > 0 ? 1 : -1];

  if (type === "BEND") {
    const sorted = [...axes].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    return [sorted[0][0], sorted[0][1] > 0 ? 1 : -1];
  }

  const dominant = axes.reduce((a, b) => Math.abs(a[1]) > Math.abs(b[1]) ? a : b);
  return [dominant[0], dominant[1] > 0 ? 1 : -1];
}

function detectBranchAxis(teeElement) {
  if (!teeElement.bp || !teeElement.cp) return null;
  const bv = vec.sub(teeElement.bp, teeElement.cp);
  const axes = [["X", Math.abs(bv.x)], ["Y", Math.abs(bv.y)], ["Z", Math.abs(bv.z)]];
  const dominant = axes.reduce((a, b) => a[1] > b[1] ? a : b);
  return dominant[0];
}

function detectBranchDirection(teeElement) {
  if (!teeElement.bp || !teeElement.cp) return null;
  const bv = vec.sub(teeElement.bp, teeElement.cp);
  const axis = detectBranchAxis(teeElement);
  if (!axis) return null;
  return bv[axis.toLowerCase()] > 0 ? 1 : -1;
}

function getElementVector(element) {
  const type = (element.type || "").toUpperCase();
  if (type === "SUPPORT" || type === "OLET") return { x: 0, y: 0, z: 0 };
  if (!element.ep1 || !element.ep2) return { x: 0, y: 0, z: 0 };
  return vec.sub(element.ep2, element.ep1);
}

// Region E: Gap/Overlap Analyzer
function analyzeGap(gapVector, context, current, next, config, log) {
  const cfg = config.smartFixer || {};
  const negligible = cfg.negligibleGap ?? 1.0;
  const autoFillMax = cfg.autoFillMaxGap ?? 25.0;
  const reviewMax = cfg.reviewGapMax ?? 100.0;
  const autoTrimMax = cfg.autoTrimMaxOverlap ?? 25.0;
  const silentSnap = cfg.silentSnapThreshold ?? 2.0;
  const warnSnap = cfg.warnSnapThreshold ?? 10.0;

  const gapMag = vec.mag(gapVector);

  // Check multi-axis R-GAP-06
  const activeAxes = (Math.abs(gapVector.x) > 1 ? 1 : 0) + (Math.abs(gapVector.y) > 1 ? 1 : 0) + (Math.abs(gapVector.z) > 1 ? 1 : 0);
  if (activeAxes >= 2 && gapMag > autoFillMax) {
      log.push({ type: "Error", ruleId: "R-GAP-06", tier: 4, row: next.element._rowIndex, message: `ERROR [R-GAP-06]: Multi-axis gap (X=${gapVector.x.toFixed(1)}mm, Y=${gapVector.y.toFixed(1)}mm, Z=${gapVector.z.toFixed(1)}mm). Cannot auto-fill. Rigorous manual review required.` });
      return;
  }
  if (Math.abs(gapVector.z) > reviewMax) {
      log.push({ type: "Error", ruleId: "R-CHN-06", tier: 4, row: next.element._rowIndex, message: `ERROR [R-CHN-06]: Z offset ${Math.abs(gapVector.z).toFixed(1)}mm. Too large to snap.` });
  }

  if (gapMag < negligible) {
    if (gapMag > 0.1) {
      return { type: "SNAP", ruleId: "R-GAP-01", tier: 1, description: `SNAP [R-GAP-01]: Close ${Number(gapMag).toFixed(2)}mm micro-gap by snapping endpoints.`, gapVector, current, next };
    }
    return null;
  }

  const axes = decomposeGap(gapVector, cfg.offAxisThreshold ?? 0.5);
  const alongTravel = axes.find(a => a.axis === context.travelAxis);
  const lateral = axes.filter(a => a.axis !== context.travelAxis);
  const totalLateral = lateral.reduce((s, a) => s + Math.abs(a.delta), 0);
  const alongDelta = alongTravel ? alongTravel.delta : 0;
  const isOverlap = alongDelta * context.travelDirection < 0;

  if (isOverlap && axes.length === 1 && axes[0].axis === context.travelAxis) {
    const overlapAmt = Math.abs(alongDelta);
    return analyzeOverlap(overlapAmt, context, current, next, cfg, log);
  }

  if (axes.length === 1 && axes[0].axis === context.travelAxis) {
    const gapAmt = Math.abs(alongDelta);
    const dir = directionLabel(context.travelAxis, context.travelDirection);
    if (gapAmt <= autoFillMax) {
      return { type: "INSERT", ruleId: "R-GAP-02", tier: 2, description: buildInsertDescription(gapAmt, dir, context, current), gapAmount: gapAmt, fillAxis: context.travelAxis, fillDir: context.travelDirection, current, next };
    }
    if (gapAmt <= reviewMax) {
      return { type: "REVIEW", ruleId: "R-GAP-03", tier: 3, description: `REVIEW [R-GAP-03]: ${Number(gapAmt).toFixed(1)}mm gap along ${dir}. Exceeds ${autoFillMax}mm auto-fill threshold. Manual review.`, current, next };
    }
    return { type: "ERROR", ruleId: "R-GAP-03", tier: 4, description: `ERROR [R-GAP-03]: ${Number(gapAmt).toFixed(1)}mm gap along ${dir}. Major gap — likely missing component(s).`, current, next };
  }

  if (axes.length === 1 && axes[0].axis !== context.travelAxis) {
    const latAmt = Math.abs(axes[0].delta);
    if (latAmt < silentSnap) {
      return { type: "SNAP", ruleId: "R-GAP-04", tier: 2, description: `SNAP [R-GAP-04]: Lateral offset ${Number(latAmt).toFixed(1)}mm on ${axes[0].axis}-axis (travel is ${context.travelAxis}). Snapping to align.`, current, next };
    }
    return { type: "ERROR", ruleId: "R-GAP-04", tier: 4, description: `ERROR [R-GAP-04]: Lateral offset ${Number(latAmt).toFixed(1)}mm on ${axes[0].axis}-axis. Pipe has shifted sideways. Manual review.`, current, next };
  }

  if (axes.length >= 2 && totalLateral < silentSnap && Math.abs(alongDelta) <= autoFillMax) {
    const gapAmt = Math.abs(alongDelta);
    const dir = directionLabel(context.travelAxis, context.travelDirection);
    return { type: "INSERT", ruleId: "R-GAP-05", tier: 2, description: `INSERT [R-GAP-05]: Multi-axis gap (axial=${Number(gapAmt).toFixed(1)}mm, lateral=${Number(totalLateral).toFixed(1)}mm). Lateral snapped, axial filled with ${Number(gapAmt).toFixed(1)}mm pipe ${dir}.`, gapAmount: gapAmt, fillAxis: context.travelAxis, fillDir: context.travelDirection, current, next };
  }

  return { type: "ERROR", ruleId: "R-GAP-06", tier: 4, description: `ERROR [R-GAP-06]: Multi-axis gap (${formatGapAxes(axes)}). Cannot auto-fill. Rigorous manual review required.`, current, next };
}

function analyzeOverlap(overlapAmt, context, current, next, cfg, log) {
  const autoTrimMax = cfg.autoTrimMaxOverlap ?? 25.0;
  const currType = (current.type || "").toUpperCase();
  const nextType = (next.type || "").toUpperCase();
  const dir = directionLabel(context.travelAxis, context.travelDirection);

  if (currType !== "PIPE" && nextType !== "PIPE") {
    return { type: "ERROR", ruleId: "R-OVR-03", tier: 4, description: `ERROR [R-OVR-03]: ${currType} overlaps ${nextType} by ${Number(overlapAmt).toFixed(1)}mm. Both are rigid fittings. Cannot auto-trim.`, current, next };
  }

  if (currType === "PIPE" && overlapAmt <= autoTrimMax) {
    return { type: "TRIM", ruleId: "R-OVR-01", tier: 2, description: buildTrimDescription(overlapAmt, dir, current, next, "current"), trimAmount: overlapAmt, trimTarget: "current", current, next };
  }

  if (currType !== "PIPE" && nextType === "PIPE" && overlapAmt <= autoTrimMax) {
    return { type: "TRIM", ruleId: "R-OVR-02", tier: 2, description: buildTrimDescription(overlapAmt, dir, current, next, "next"), trimAmount: overlapAmt, trimTarget: "next", current, next };
  }

  return { type: "REVIEW", ruleId: "R-OVR-01", tier: 3, description: `REVIEW [R-OVR-01]: ${Number(overlapAmt).toFixed(1)}mm overlap between ${currType} (Row ${current._rowIndex}) and ${nextType} (Row ${next._rowIndex}). Exceeds ${autoTrimMax}mm auto-trim threshold.`, current, next };
}

function decomposeGap(gapVec, threshold) {
  const result = [];
  if (Math.abs(gapVec.x) > threshold) result.push({ axis: "X", delta: gapVec.x });
  if (Math.abs(gapVec.y) > threshold) result.push({ axis: "Y", delta: gapVec.y });
  if (Math.abs(gapVec.z) > threshold) result.push({ axis: "Z", delta: gapVec.z });
  return result;
}

function directionLabel(axis, dir) {
  const map = { X: ["+X(East)", "-X(West)"], Y: ["+Y(North)", "-Y(South)"], Z: ["+Z(Up)", "-Z(Down)"] };
  return axis ? (dir > 0 ? map[axis][0] : map[axis][1]) : "unknown";
}

function formatGapAxes(axes) {
  return axes.map(a => `${a.axis}=${Number(a.delta).toFixed(1)}mm`).join(", ");
}

// Region F: Rule Engine
function runElementRules(element, context, prevElement, elemAxis, elemDir, config, log) {
  const type = (element.type || "").toUpperCase();
  const cfg = config.smartFixer || {};
  const ri = element._rowIndex;

  if (type === "PIPE") {
    const len = vec.mag(getElementVector(element));
    if (len < (cfg.microPipeThreshold ?? 6.0) && len > 0) {
      log.push({ type: "Fix", ruleId: "R-GEO-01", tier: 1, row: ri, message: `DELETE [R-GEO-01]: Micro-pipe ${Number(len).toFixed(1)}mm < ${cfg.microPipeThreshold ?? 6}mm threshold.` });
      element._proposedFix = { type: "DELETE", ruleId: "R-GEO-01", tier: 1 };
    }
  }

  if (prevElement && element.bore !== context.currentBore) {
    const prevType = (prevElement.type || "").toUpperCase();
    if (!prevType.includes("REDUCER")) {
      log.push({ type: "Error", ruleId: "R-GEO-02", tier: 4, row: ri, message: `ERROR [R-GEO-02]: Bore changes ${context.currentBore}→${element.bore} without reducer.` });
    }
  }

  if (["PIPE", "FLANGE", "VALVE"].includes(type) && type !== "BEND") {
    const ev = getElementVector(element);
    const nonZero = [["X", ev.x], ["Y", ev.y], ["Z", ev.z]].filter(([_, d]) => Math.abs(d) > 0.5);
    if (nonZero.length > 1) {
      const dominant = nonZero.reduce((a, b) => Math.abs(a[1]) > Math.abs(b[1]) ? a : b);
      const minorTotal = nonZero.filter(a => a[0] !== dominant[0]).reduce((s, a) => s + Math.abs(a[1]), 0);
      if (minorTotal < (cfg.diagonalMinorThreshold ?? 2.0)) {
        log.push({ type: "Fix", ruleId: "R-GEO-03", tier: 2, row: ri, message: `SNAP [R-GEO-03]: ${type} off-axis drift ${Number(minorTotal).toFixed(1)}mm. Snapping to pure ${dominant[0]}-axis.` });
        element._proposedFix = { type: "SNAP_AXIS", ruleId: "R-GEO-03", tier: 2, dominantAxis: dominant[0] };
      } else {
        log.push({ type: "Error", ruleId: "R-GEO-03", tier: 4, row: ri, message: `ERROR [R-GEO-03]: ${type} runs diagonally (${nonZero.map(([a,d]) => `${a}=${Number(d).toFixed(1)}`).join(", ")}). Must align to single axis.` });
      }
    }
  }

  if (!["SUPPORT", "OLET"].includes(type) && element.ep1 && element.ep2) {
    if (vec.approxEqual(element.ep1, element.ep2, 0.1)) {
      log.push({ type: "Error", ruleId: "R-GEO-07", tier: 4, row: ri, message: `ERROR [R-GEO-07]: ${type} has zero length (EP1 ≈ EP2).` });
    }
  }

  if (context.travelAxis && elemAxis && elemAxis !== context.travelAxis) {
    if (!["BEND", "TEE"].includes(type)) {
      log.push({ type: "Error", ruleId: "R-CHN-01", tier: 4, row: ri, message: `ERROR [R-CHN-01]: Axis changed ${context.travelAxis}→${elemAxis} at ${type}. Missing BEND?` });
    }
  }

  if (context.travelAxis && elemAxis === context.travelAxis && elemDir !== context.travelDirection) {
    if (type === "PIPE") {
      const foldLen = vec.mag(getElementVector(element));
      if (foldLen < (cfg.autoDeleteFoldbackMax ?? 25.0)) {
        log.push({ type: "Fix", ruleId: "R-CHN-02", tier: 2, row: ri, message: `DELETE [R-CHN-02]: Fold-back pipe ${Number(foldLen).toFixed(1)}mm on ${elemAxis}-axis.` });
        element._proposedFix = { type: "DELETE", ruleId: "R-CHN-02", tier: 2 };
      } else {
        log.push({ type: "Error", ruleId: "R-CHN-02", tier: 4, row: ri, message: `ERROR [R-CHN-02]: Fold-back ${Number(foldLen).toFixed(1)}mm on ${elemAxis}-axis. Too large to auto-delete.` });
      }
    } else if (type !== "BEND") {
      log.push({ type: "Error", ruleId: "R-CHN-02", tier: 4, row: ri, message: `ERROR [R-CHN-02]: ${type} reverses direction on ${elemAxis}-axis.` });
    }
  }

  if (type === "BEND" && context.lastFittingType === "BEND") {
    if (context.pipeSinceLastBend < (cfg.minTangentMultiplier ?? 1.0) * (element.bore || 0) * 0.0254) {
      log.push({ type: "Warning", ruleId: "R-CHN-03", tier: 3, row: ri, message: `WARNING [R-CHN-03]: Only ${Number(context.pipeSinceLastBend).toFixed(0)}mm pipe between bends. Short tangent.` });
    }
  }

  if (prevElement && context.travelAxis && elemAxis === context.travelAxis) {
    const exitPt = getExitPoint(prevElement);
    const entryPt = getEntryPoint(element);
    if (exitPt && entryPt) {
      const nonTravelAxes = ["X", "Y", "Z"].filter(a => a !== context.travelAxis);
      for (const axis of nonTravelAxes) {
        const key = axis.toLowerCase();
        const drift = Math.abs(entryPt[key] - exitPt[key]);
        if (drift > 0.1 && drift < (cfg.silentSnapThreshold ?? 2.0)) {
          log.push({ type: "Fix", ruleId: "R-CHN-06", tier: 1, row: ri, message: `SNAP [R-CHN-06]: ${axis} drifted ${Number(drift).toFixed(1)}mm. Silent snap.` });
        } else if (drift >= (cfg.silentSnapThreshold ?? 2.0) && drift < (cfg.warnSnapThreshold ?? 10.0)) {
          log.push({ type: "Fix", ruleId: "R-CHN-06", tier: 2, row: ri, message: `SNAP [R-CHN-06]: ${axis} drifted ${Number(drift).toFixed(1)}mm. Snap with warning.` });
        } else if (drift >= (cfg.warnSnapThreshold ?? 10.0)) {
          log.push({ type: "Error", ruleId: "R-CHN-06", tier: 4, row: ri, message: `ERROR [R-CHN-06]: ${axis} offset ${Number(drift).toFixed(1)}mm. Too large to snap.` });
        }
      }
    }
  }

  if (context.currentMaterial && element.ca?.[3] && element.ca[3] !== context.currentMaterial) {
    const prevType = prevElement ? (prevElement.type || "").toUpperCase() : "";
    if (!["FLANGE", "VALVE"].includes(prevType)) {
      log.push({ type: "Warning", ruleId: "R-DAT-03", tier: 3, row: ri, message: `WARNING [R-DAT-03]: Material changes ${context.currentMaterial}→${element.ca[3]} without joint.` });
    }
  }

  if (type === "TEE" && element.branchBore > element.bore) {
    log.push({ type: "Error", ruleId: "R-BRN-01", tier: 4, row: ri, message: `ERROR [R-BRN-01]: Branch bore (${element.branchBore}) > header bore (${element.bore}).` });
  }

  if (type === "TEE" && element.ep1 && element.ep2 && element.cp && element.bp) {
    const headerVec = vec.sub(element.ep2, element.ep1);
    const branchVec = vec.sub(element.bp, element.cp);
    const hMag = vec.mag(headerVec);
    const bMag = vec.mag(branchVec);
    if (hMag > 0 && bMag > 0) {
      const dotProd = Math.abs(vec.dot(headerVec, branchVec));
      const cosAngle = dotProd / (hMag * bMag);
      const angleDeg = Math.acos(Math.min(cosAngle, 1.0)) * 180 / Math.PI;
      const offPerp = Math.abs(90 - angleDeg);
      if (offPerp > (cfg.branchPerpendicularityError ?? 15.0)) {
        log.push({ type: "Error", ruleId: "R-BRN-04", tier: 4, row: ri, message: `ERROR [R-BRN-04]: Branch ${Number(offPerp).toFixed(1)}° from perpendicular.` });
      } else if (offPerp > (cfg.branchPerpendicularityWarn ?? 5.0)) {
        log.push({ type: "Warning", ruleId: "R-BRN-04", tier: 3, row: ri, message: `WARNING [R-BRN-04]: Branch ${Number(offPerp).toFixed(1)}° from perpendicular.` });
      }
    }
  }

  if (element.skey) {
    const prefixMap = { FLANGE: "FL", VALVE: "V", BEND: "BE", TEE: "TE", OLET: "OL" };
    const expected = prefixMap[type];
    if (expected && !element.skey.startsWith(expected)) {
      log.push({ type: "Warning", ruleId: "R-DAT-06", tier: 3, row: ri, message: `WARNING [R-DAT-06]: SKEY '${element.skey}' prefix mismatch for ${type} (expected '${expected}...').` });
    }
  }
}

function runSupportRules(support, chain, context, config, log) {
  const ri = support._rowIndex;
  const coor = support.supportCoor;
  if (!coor) return;

  let minDist = Infinity;
  for (const link of chain) {
    if ((link.element.type || "").toUpperCase() !== "PIPE") continue;
    const ep1 = link.element.ep1;
    const ep2 = link.element.ep2;
    if (!ep1 || !ep2) continue;

    const pipeVec = vec.sub(ep2, ep1);
    const pipeLen = vec.mag(pipeVec);
    if (pipeLen < 0.1) continue;

    const toSupport = vec.sub(coor, ep1);
    const t = vec.dot(toSupport, pipeVec) / (pipeLen * pipeLen);
    const projection = vec.add(ep1, vec.scale(pipeVec, Math.max(0, Math.min(1, t))));
    const perpDist = vec.dist(coor, projection);

    if (perpDist < minDist) minDist = perpDist;
  }

  if (minDist > 5.0 && minDist < Infinity) {
    log.push({ type: "Error", ruleId: "R-TOP-06", tier: 4, row: ri, message: `ERROR [R-TOP-06]: Support is ${Number(minDist).toFixed(1)}mm off the nearest pipe axis.` });
  }

  if (context.travelAxis === "Z") {
    log.push({ type: "Warning", ruleId: "R-SPA-03", tier: 3, row: ri, message: `WARNING [R-SPA-03]: Support on vertical pipe run. Verify support type.` });
  }
}

function runAggregateRules(chain, context, config, log) {
  const cfg = config.smartFixer || {};
  const chainId = context.chainId;

  if (context.pipeLengthSum <= 0 && chain.length > 0) {
    log.push({ type: "Error", ruleId: "R-AGG-01", tier: 4, row: chain[0]?.element?._rowIndex, message: `ERROR [R-AGG-01]: ${chainId} has zero pipe length. Fundamentally broken.` });
  }

  if (chain.length >= 2) {
    const startPt = getEntryPoint(chain[0].element);
    const endPt = getExitPoint(chain[chain.length - 1].element);
    if (startPt && endPt) {
      const expected = vec.sub(endPt, startPt);
      const actual = context.cumulativeVector;
      const error = vec.mag(vec.sub(expected, actual));
      const closureWarn = cfg.closureWarningThreshold ?? 5.0;
      const closureErr = cfg.closureErrorThreshold ?? 50.0;
      if (error > closureErr) {
        log.push({ type: "Error", ruleId: "R-AGG-03", tier: 4, row: chain[0]?.element?._rowIndex, message: `ERROR [R-AGG-03]: ${chainId} closure error ${Number(error).toFixed(1)}mm.` });
      } else if (error > closureWarn) {
        log.push({ type: "Warning", ruleId: "R-AGG-03", tier: 3, row: chain[0]?.element?._rowIndex, message: `WARNING [R-AGG-03]: ${chainId} closure error ${Number(error).toFixed(1)}mm.` });
      }
    }
  }

  if (chain.length > 0) {
    const lastElem = chain[chain.length - 1].element;
    const lastType = (lastElem.type || "").toUpperCase();
    if (lastType === "PIPE") {
      log.push({ type: "Warning", ruleId: "R-TOP-01", tier: 3, row: lastElem._rowIndex, message: `WARNING [R-TOP-01]: ${chainId} ends at bare PIPE. Expected terminal fitting.` });
    }
  }

  const midFlanges = chain.filter((link, i) => {
    return (link.element.type || "").toUpperCase() === "FLANGE" && i > 0 && i < chain.length - 1;
  });
  if (midFlanges.length % 2 !== 0) {
    log.push({ type: "Warning", ruleId: "R-AGG-05", tier: 3, row: midFlanges[0]?.element?._rowIndex, message: `WARNING [R-AGG-05]: ${chainId} has ${midFlanges.length} mid-chain flanges (odd). Missing mating flange?` });
  }

  const chainLenM = vec.mag(context.cumulativeVector) / 1000;
  if (chainLenM > ((cfg.noSupportAlertLength ?? 10000) / 1000)) {
    log.push({ type: "Warning", ruleId: "R-AGG-06", tier: 3, row: chain[0]?.element?._rowIndex, message: `WARNING [R-AGG-06]: ${chainId} is ${Number(chainLenM).toFixed(1)}m long. Verify supports are included.` });
  }
}

// Region G: Fix Application Engine
function applyFixesEngine(dataTable, chains, config, log) {
  const applied = [];
  const newRows = [];
  const deleteRows = new Set();

  for (const chain of chains) {
    for (const link of chain) {
      const elem = link.element;
      if (elem._proposedFix?.type === "DELETE" && elem._proposedFix.tier <= 2) {
        deleteRows.add(elem._rowIndex);
        applied.push({ ruleId: elem._proposedFix.ruleId, row: elem._rowIndex, action: "DELETE" });
        log.push({ type: "Applied", ruleId: elem._proposedFix.ruleId, row: elem._rowIndex, message: `APPLIED: Deleted ${elem.type} at Row ${elem._rowIndex}.` });
      }
    }
  }

  for (const chain of chains) {
    for (const link of chain) {
      const elem = link.element;
      if (elem._proposedFix?.type === "SNAP_AXIS" && elem._proposedFix.tier <= 2) {
        const axis = elem._proposedFix.dominantAxis;
        snapToSingleAxis(elem, axis);
        markModified(elem, "ep1", "SmartFix:R-GEO-03");
        markModified(elem, "ep2", "SmartFix:R-GEO-03");
        applied.push({ ruleId: "R-GEO-03", row: elem._rowIndex, action: "SNAP_AXIS" });
      }
    }
  }

  for (const chain of chains) {
    for (const link of chain) {
      if (!link.fixAction) continue;
      if (link.fixAction.type === "SNAP" && link.fixAction.tier <= 2) {
        snapEndpoints(link.element, link.nextElement);
        markModified(link.element, "ep2", `SmartFix:${link.fixAction.ruleId}`);
        markModified(link.nextElement, "ep1", `SmartFix:${link.fixAction.ruleId}`);
        applied.push({ ruleId: link.fixAction.ruleId, row: link.element._rowIndex, action: "SNAP" });
      }
    }
  }

  for (const chain of chains) {
    for (const link of chain) {
      if (!link.fixAction) continue;
      if (link.fixAction.type === "TRIM" && link.fixAction.tier <= 2) {
        const target = link.fixAction.trimTarget === "current" ? link.element : link.nextElement;
        if ((target.type || "").toUpperCase() === "PIPE") {
          trimPipe(target, link.fixAction.trimAmount, link.travelAxis, link.travelDirection, link.fixAction.trimTarget);
          markModified(target, link.fixAction.trimTarget === "current" ? "ep2" : "ep1", `SmartFix:${link.fixAction.ruleId}`);
          applied.push({ ruleId: link.fixAction.ruleId, row: target._rowIndex, action: "TRIM" });
          log.push({ type: "Applied", ruleId: link.fixAction.ruleId, row: target._rowIndex, message: `APPLIED: Trimmed ${target.type} by ${Number(link.fixAction.trimAmount).toFixed(1)}mm.` });

          const remaining = vec.mag(getElementVector(target));
          if (remaining < (config.smartFixer?.microPipeThreshold ?? 6.0)) {
            deleteRows.add(target._rowIndex);
            log.push({ type: "Applied", ruleId: "R-OVR-06", row: target._rowIndex, message: `APPLIED: Pipe reduced to ${Number(remaining).toFixed(1)}mm after trim. Deleted.` });
          }
        }
      }
    }
  }

  for (const chain of chains) {
    for (const link of chain) {
      if (!link.fixAction) continue;
      if (link.fixAction.type === "INSERT" && link.fixAction.tier <= 2) {
        const fillerPipe = createFillerPipe(link, config);
        newRows.push({ insertAfterRow: link.element._rowIndex, pipe: fillerPipe });
        applied.push({ ruleId: link.fixAction.ruleId, row: link.element._rowIndex, action: "INSERT" });
        log.push({ type: "Applied", ruleId: link.fixAction.ruleId, row: link.element._rowIndex, message: `APPLIED: Inserted ${Number(link.fixAction.gapAmount).toFixed(1)}mm gap-fill pipe after Row ${link.element._rowIndex}.` });
      }
    }
  }

  let updatedTable = dataTable.filter(row => !deleteRows.has(row._rowIndex));
  for (const insertion of newRows.sort((a, b) => b.insertAfterRow - a.insertAfterRow)) {
    const idx = updatedTable.findIndex(r => r._rowIndex === insertion.insertAfterRow);
    if (idx >= 0) {
      updatedTable.splice(idx + 1, 0, insertion.pipe);
    } else {
      updatedTable.push(insertion.pipe);
    }
  }

  updatedTable.forEach((row, i) => { row._rowIndex = i + 1; });
  updatedTable.forEach(row => {
    row.fixingAction = null;
    row.fixingActionTier = null;
    row.fixingActionRuleId = null;
  });

  return { updatedTable, applied, deleteCount: deleteRows.size, insertCount: newRows.length };
}

function snapEndpoints(elemA, elemB) {
  const mid = vec.mid(getExitPoint(elemA), getEntryPoint(elemB));
  if (elemA.ep2) { elemA.ep2 = { ...mid }; }
  if (elemB.ep1) { elemB.ep1 = { ...mid }; }
}

function snapToSingleAxis(element, dominantAxis) {
  if (!element.ep1 || !element.ep2) return;
  const axes = ["x", "y", "z"];
  const domKey = dominantAxis.toLowerCase();
  for (const key of axes) {
    if (key !== domKey) element.ep2[key] = element.ep1[key];
  }
}

function trimPipe(pipe, amount, travelAxis, travelDir, which) {
  const axisKey = travelAxis.toLowerCase();
  if (which === "current") {
    pipe.ep2[axisKey] -= amount * travelDir;
  } else {
    pipe.ep1[axisKey] += amount * travelDir;
  }
}

function createFillerPipe(chainLink, config) {
  const upstream = chainLink.element;
  const downstream = chainLink.nextElement;
  const exitPt = getExitPoint(upstream);
  const entryPt = getEntryPoint(downstream);

  return {
    _rowIndex: -1,
    _modified: { ep1: "SmartFix:GapFill", ep2: "SmartFix:GapFill", type: "SmartFix:GapFill" },
    _logTags: ["Calculated"],
    csvSeqNo: `${upstream.csvSeqNo || 0}.GF`,
    type: "PIPE",
    text: "",
    refNo: `${upstream.refNo || "UNKNOWN"}_GapFill`,
    bore: upstream.bore || 0,
    ep1: { ...exitPt },
    ep2: { ...entryPt },
    cp: null, bp: null, branchBore: null,
    skey: "",
    supportCoor: null, supportName: "", supportGuid: "",
    ca: { ...upstream.ca, 8: null, 97: null, 98: null },
    fixingAction: "GAPFILLING",
    fixingActionTier: null,
    fixingActionRuleId: null,
    len1: null, axis1: null, len2: null, axis2: null, len3: null, axis3: null,
    brlen: null, deltaX: null, deltaY: null, deltaZ: null,
    diameter: upstream.bore, wallThick: upstream.ca?.[4] || null,
    bendPtr: null, rigidPtr: null, intPtr: null,
  };
}

// Region H: Fixing Action Descriptor
function populateFixingActions(dataTable, chains, log) {
  for (const row of dataTable) {
    row.fixingAction = null;
    row.fixingActionTier = null;
    row.fixingActionRuleId = null;
  }

  function processChainLinkActions(chainLinks) {
    for (const link of chainLinks) {
      const elem = link.element;

      if (elem._proposedFix) {
        const row = dataTable.find(r => r._rowIndex === elem._rowIndex);
        if (row) {
          row.fixingAction = formatProposedFix(elem._proposedFix, elem);
          row.fixingActionTier = elem._proposedFix.tier;
          row.fixingActionRuleId = elem._proposedFix.ruleId;
        }
      }

      if (link.fixAction) {
        const currRow = dataTable.find(r => r._rowIndex === link.element._rowIndex);
        const nextRow = link.nextElement ? dataTable.find(r => r._rowIndex === link.nextElement._rowIndex) : null;

        if (currRow && !currRow.fixingAction) {
          currRow.fixingAction = link.fixAction.description;
          currRow.fixingActionTier = link.fixAction.tier;
          currRow.fixingActionRuleId = link.fixAction.ruleId;
        }
        if (nextRow && !nextRow.fixingAction && link.fixAction.tier <= 3) {
          nextRow.fixingAction = `← ${link.fixAction.description.split('\n')[0]}`;
          nextRow.fixingActionTier = link.fixAction.tier;
          nextRow.fixingActionRuleId = link.fixAction.ruleId;
        }
      }

      if (link.branchChain) {
        processChainLinkActions(link.branchChain);
      }
    }
  }

  for (const chain of chains) {
    processChainLinkActions(chain);
  }

  for (const entry of log) {
    if (entry.row && entry.tier && entry.tier <= 4) {
      const row = dataTable.find(r => r._rowIndex === entry.row);
      if (row && !row.fixingAction) {
        row.fixingAction = entry.message;
        row.fixingActionTier = entry.tier;
        row.fixingActionRuleId = entry.ruleId;
      }
    }
  }
}

function formatProposedFix(fix, element) {
  const type = (element.type || "").toUpperCase();
  const ri = element._rowIndex;

  switch (fix.type) {
    case "DELETE":
      const len = element.ep1 && element.ep2 ? vec.mag(vec.sub(element.ep2, element.ep1)) : 0;
      return `DELETE [${fix.ruleId}]: Remove ${type} at Row ${ri}\n  Length: ${Number(len).toFixed(1)}mm, Bore: ${element.bore || 0}mm\n  Reason: ${fix.ruleId === "R-GEO-01" ? "Micro-element below threshold" : "Fold-back element"}`;
    case "SNAP_AXIS":
      return `SNAP [${fix.ruleId}]: Align ${type} to pure ${fix.dominantAxis}-axis\n  Row ${ri}: Off-axis components will be zeroed\n  EP2 non-${fix.dominantAxis} coords → match EP1`;
    default:
      return `${fix.type} [${fix.ruleId}]: Row ${ri}`;
  }
}

function buildInsertDescription(gapAmt, direction, context, upstream) {
  const exitPt = getExitPoint(upstream);
  const bore = upstream.bore || 0;
  const axisKey = context.travelAxis.toLowerCase();
  const endPt = { ...exitPt };
  endPt[axisKey] += gapAmt * context.travelDirection;

  return `INSERT [R-GAP-02]: Fill ${Number(gapAmt).toFixed(1)}mm gap along ${direction}\n  New PIPE: EP1=(${Number(exitPt.x).toFixed(1)}, ${Number(exitPt.y).toFixed(1)}, ${Number(exitPt.z).toFixed(1)})\n          → EP2=(${Number(endPt.x).toFixed(1)}, ${Number(endPt.y).toFixed(1)}, ${Number(endPt.z).toFixed(1)})\n  Length: ${Number(gapAmt).toFixed(1)}mm, Bore: ${Number(bore).toFixed(1)}mm\n  Inherited from Row ${upstream._rowIndex}`;
}

function buildTrimDescription(overlapAmt, direction, current, next, target) {
  const trimRow = target === "current" ? current : next;
  const otherRow = target === "current" ? next : current;
  return `TRIM [${target === "current" ? "R-OVR-01" : "R-OVR-02"}]: Reduce ${trimRow.type} by ${Number(overlapAmt).toFixed(1)}mm along ${direction}\n  Row ${trimRow._rowIndex}: ${target === "current" ? "EP2" : "EP1"} adjusted\n  Overlap with ${otherRow.type} (Row ${otherRow._rowIndex}) resolved`;
}

// Region I: Smart Fix Orchestrator
function runSmartFix(dataTable, config, log) {
  log.push({ type: "Info", message: "═══ SMART FIX: Starting chain walker ═══" });

  for (let element of dataTable) {
    if (!element.type || element.type === "MESSAGE-SQUARE" || element.type === "PIPELINE-REFERENCE" || element.type.startsWith("UNITS")) continue;

    R_GEO_05(element, log);
    R_GEO_08(element, log);
    R_BRN_04(element, log);
    R_DAT_06(element, log);
  }

  // Overlaps R-OVR
  const pipeComponents = dataTable.filter(c => c.type === "PIPE");
  for (let i = 0; i < pipeComponents.length; i++) {
    const c1 = pipeComponents[i];
    if (c1._proposedFix?.type === "DELETE") continue;
    const p1a = c1.ep1, p1b = c1.ep2;
    if (!p1a || !p1b) continue;

    for (let j = i + 1; j < pipeComponents.length; j++) {
      const c2 = pipeComponents[j];
      if (c2._proposedFix?.type === "DELETE") continue;
      const p2a = c2.ep1, p2b = c2.ep2;
      if (!p2a || !p2b) continue;

      const v1 = vec.sub(p1b, p1a);
      const v2 = vec.sub(p2b, p2a);

      const v1CrossV2 = vec.cross(v1, v2);
      if (vec.mag(v1CrossV2) < 0.1) { // Co-linear check
        const d1a2a = vec.dist(p1a, p2a);
        const d1b2b = vec.dist(p1b, p2b);
        const d1a2b = vec.dist(p1a, p2b);
        const d1b2a = vec.dist(p1b, p2a);

        // Exact Overlap R-OVR-04
        if (d1a2a < 1.0 && d1b2b < 1.0 || d1a2b < 1.0 && d1b2a < 1.0) {
          log.push({ type: "Fix", ruleId: "R-OVR-04", tier: 1, row: c2._rowIndex, message: `DELETE [R-OVR-04]: Exact duplicate PIPE.` });
          c2._proposedFix = { type: "DELETE", ruleId: "R-OVR-04", tier: 1 };
        }
      }
    }
  }


  log.push({ type: "Info", message: "Step 4A: Building connectivity graph..." });
  const graph = buildConnectivityGraph(dataTable, config);
  log.push({ type: "Info", message: `Graph: ${graph.components.length} components, ${graph.terminals.length} terminals, ${graph.edges.size} connections.` });

  log.push({ type: "Info", message: "Step 4B: Walking element chains..." });
  const { chains, orphans } = walkAllChains(graph, config, log);

  // Recursively count total elements walked across all branch chains
  function countElementsInChains(chainsToCount) {
    let sum = 0;
    for (const chain of chainsToCount) {
       sum += chain.length;
       for (const link of chain) {
         if (link.branchChain) sum += countElementsInChains([link.branchChain]);
       }
    }
    return sum;
  }
  const totalElements = countElementsInChains(chains);
  log.push({ type: "Info", message: `Walked ${chains.length} chains, ${totalElements} elements, ${orphans.length} orphans.` });

  const tierCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const entry of log) {
    if (entry.tier) tierCounts[entry.tier]++;
  }
  log.push({ type: "Info", message: `Rules complete: Tier1=${tierCounts[1]}, Tier2=${tierCounts[2]}, Tier3=${tierCounts[3]}, Tier4=${tierCounts[4]}` });

  log.push({ type: "Info", message: "Step 4D: Populating Fixing Action previews..." });
  populateFixingActions(dataTable, chains, log);

  const actionCount = dataTable.filter(r => r.fixingAction).length;
  log.push({ type: "Info", message: `═══ SMART FIX COMPLETE: ${actionCount} rows have proposed fixes. Review in Data Table. ═══` });

  const summary = {
    chainCount: chains.length,
    elementsWalked: totalElements,
    orphanCount: orphans.length,
    tier1: tierCounts[1],
    tier2: tierCounts[2],
    tier3: tierCounts[3],
    tier4: tierCounts[4],
    rowsWithActions: actionCount,
  };

  return { graph, chains, orphans, summary };
}

// String similarity (Sørensen–Dice coefficient)
function getBigrams(str) {
  const bigrams = new Set();
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.add(str.substring(i, i + 2));
  }
  return bigrams;
}

function similarity(s1, s2) {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;

  const bg1 = getBigrams(s1);
  const bg2 = getBigrams(s2);
  let intersectionSize = 0;
  for (let bg of bg1) {
    if (bg2.has(bg)) intersectionSize++;
  }
  return (2.0 * intersectionSize) / (bg1.size + bg2.size);
}

function fuzzyMatchHeader(headerText, aliasConfig, threshold = 0.75) {
  if (!headerText) return null;
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const normHeader = norm(headerText);

  // Pass 1: Exact match on normalized aliases
  for (const [canonical, aliases] of Object.entries(aliasConfig)) {
    if (aliases.some(a => norm(a) === normHeader)) return canonical;
  }

  // Pass 2: Substring containment
  for (const [canonical, aliases] of Object.entries(aliasConfig)) {
    for (const alias of aliases) {
      const na = norm(alias);
      if (na && (na.includes(normHeader) || normHeader.includes(na))) return canonical;
    }
  }

  // Pass 3: Similarity ratio
  let bestMatch = null, bestScore = 0;
  for (const [canonical, aliases] of Object.entries(aliasConfig)) {
    for (const alias of aliases) {
      const score = similarity(normHeader, norm(alias));
      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = canonical;
      }
    }
  }
  return bestMatch;
}

// ----------------------------------------------------------------------------
// 3. PARSER
// ----------------------------------------------------------------------------
function parseMessageSquare(msgText) {
  if (!msgText) return {};
  const tokens = msgText.split(/,\s*/);
  const result = {};

  for (const token of tokens) {
    if (token.toUpperCase().startsWith("LENGTH=")) result.length = parseInt(token.substring(7).replace("MM", ""));
    else if (token.startsWith("RefNo:")) result.refNo = token.substring(6);
    else if (token.startsWith("SeqNo:")) result.seqNo = token.substring(6);
    else if (token.toUpperCase().startsWith("BRLEN=")) result.brlen = parseInt(token.substring(6).replace("MM", ""));
    else if (token.startsWith("Bore=")) result.bores = token.substring(5);
    else if (token.startsWith("Wt=")) result.weight = token.substring(3);
    else if (["EAST", "WEST", "NORTH", "SOUTH", "UP", "DOWN"].includes(token.toUpperCase()))
      result.direction = token.toUpperCase();
    else if (DEFAULT_CONFIG.typeMapping[token.toUpperCase()]) result.type = DEFAULT_CONFIG.typeMapping[token.toUpperCase()];
    else result.material = token;
  }
  return result;
}

function parsePcf(text) {
  const lines = text.split(/\r?\n/);
  const headerRows = [];
  const components = [];
  let currentBlock = null;
  let rowIndex = 0;

  const getTokens = (line) => line.trim().split(/\s+/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentBlock && Object.keys(currentBlock).length > 1) {
        components.push(currentBlock);
      }
      currentBlock = null;
      continue;
    }

    if (trimmed.startsWith("ISOGEN-FILES") || trimmed.startsWith("UNITS-") ||
        trimmed.startsWith("PIPELINE-REFERENCE") || trimmed.startsWith("PROJECT-IDENTIFIER") ||
        trimmed.startsWith("AREA")) {
      headerRows.push({ raw: line });
      continue;
    }

    if (trimmed.toUpperCase() === "MESSAGE-SQUARE") {
      if (currentBlock && Object.keys(currentBlock).length > 1) {
        components.push(currentBlock);
      }
      currentBlock = {
        _rowIndex: ++rowIndex, _modified: {}, _logTags: [],
        type: "", text: "", pipelineRef: "", refNo: "", bore: null, branchBore: null,
        ep1: { ...NULL_COORD }, ep2: { ...NULL_COORD }, cp: { ...NULL_COORD }, bp: { ...NULL_COORD },
        skey: "", supportCoor: { ...NULL_COORD }, supportName: "", supportGuid: "",
        ca: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null, 10: null, 97: null, 98: null },
        fixingAction: "", csvSeqNo: null
      };

      if (i + 1 < lines.length && lines[i + 1].startsWith("    ")) {
        i++;
        currentBlock.text = lines[i].trim();
      }
      continue;
    }

    if (DEFAULT_CONFIG.typeMapping[trimmed.toUpperCase()]) {
      if (!currentBlock) {
        currentBlock = {
          _rowIndex: ++rowIndex, _modified: {}, _logTags: [],
          type: "", text: "", pipelineRef: "", refNo: "", bore: null, branchBore: null,
          ep1: { ...NULL_COORD }, ep2: { ...NULL_COORD }, cp: { ...NULL_COORD }, bp: { ...NULL_COORD },
          skey: "", supportCoor: { ...NULL_COORD }, supportName: "", supportGuid: "",
          ca: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null, 10: null, 97: null, 98: null },
          fixingAction: "", csvSeqNo: null
        };
      }
      currentBlock.type = DEFAULT_CONFIG.typeMapping[trimmed.toUpperCase()];
      continue;
    }

    if (currentBlock) {
      if (line.startsWith("    END-POINT")) {
        const tokens = getTokens(line);
        if (tokens.length >= 5) {
          const pt = { x: parseFloat(tokens[1]), y: parseFloat(tokens[2]), z: parseFloat(tokens[3]) };
          const bore = parseFloat(tokens[4]);
          if (!isValidCoord(currentBlock.ep1)) {
            currentBlock.ep1 = pt;
            currentBlock.bore = bore;
          } else {
            currentBlock.ep2 = pt;
            if (currentBlock.type && currentBlock.type.includes("REDUCER")) {
               currentBlock.branchBore = bore;
            } else {
               // usually ep2 bore is same, unless reducing
               if (!currentBlock.bore) currentBlock.bore = bore;
            }
          }
        }
      }
      else if (line.startsWith("    CENTRE-POINT")) {
        const tokens = getTokens(line);
        if (tokens.length >= 5) {
          currentBlock.cp = { x: parseFloat(tokens[1]), y: parseFloat(tokens[2]), z: parseFloat(tokens[3]) };
          if (!currentBlock.bore) currentBlock.bore = parseFloat(tokens[4]);
        }
      }
      else if (line.startsWith("    BRANCH1-POINT")) {
        const tokens = getTokens(line);
        if (tokens.length >= 5) {
          currentBlock.bp = { x: parseFloat(tokens[1]), y: parseFloat(tokens[2]), z: parseFloat(tokens[3]) };
          currentBlock.branchBore = parseFloat(tokens[4]);
        }
      }
      else if (line.startsWith("    CO-ORDS")) {
        const tokens = getTokens(line);
        if (tokens.length >= 5) {
          currentBlock.supportCoor = { x: parseFloat(tokens[1]), y: parseFloat(tokens[2]), z: parseFloat(tokens[3]) };
        }
      }
      else if (line.startsWith("    <SKEY>")) {
        currentBlock.skey = line.trim().substring(6).trim();
      }
      else if (line.startsWith("    <SUPPORT_NAME>")) {
        currentBlock.supportName = line.trim().substring(14).trim();
      }
      else if (line.startsWith("    <SUPPORT_GUID>")) {
        currentBlock.supportGuid = line.trim().substring(14).trim();
      }
      else if (line.startsWith("    COMPONENT-ATTRIBUTE")) {
        const match = line.trim().match(/COMPONENT-ATTRIBUTE(\d+)\s+(.*)/);
        if (match) {
          currentBlock.ca[parseInt(match[1])] = match[2];
        }
      }
      else if (line.startsWith("    PIPELINE-REFERENCE")) {
        currentBlock.pipelineRef = line.trim().substring(18).trim();
      }
      else if (line.startsWith("    ANGLE")) {
        currentBlock.angle = parseFloat(getTokens(line)[1]);
      }
      else if (line.startsWith("    BEND-RADIUS")) {
        currentBlock.bendRadius = parseFloat(getTokens(line)[1]);
      }
      else if (line.startsWith("    FLAT-DIRECTION")) {
        currentBlock.flatDirection = getTokens(line)[1];
      }
    }
  }

  if (currentBlock && Object.keys(currentBlock).length > 1) {
    components.push(currentBlock);
  }

  return { headerRows, components };
}

// ----------------------------------------------------------------------------
// 4. FIXER ENGINE
// ----------------------------------------------------------------------------
function markModified(row, field, tag) {
  row._modified[field] = tag;
  if (!row._logTags.includes(tag)) row._logTags.push(tag);
}

function isUsedField(type, field) {
  if (field === "ep1" || field === "ep2") {
    return ["PIPE", "FLANGE", "VALVE", "BEND", "TEE", "REDUCER-CONCENTRIC", "REDUCER-ECCENTRIC"].includes(type);
  }
  if (field === "cp") return ["BEND", "TEE", "OLET"].includes(type);
  if (field === "bp") return ["TEE", "OLET"].includes(type);
  if (field === "supportCoor") return type === "SUPPORT";
  return false;
}

function calculateTotalLength(row) {
  if (isValidCoord(row.ep1) && isValidCoord(row.ep2)) return vec.dist(row.ep1, row.ep2);
  return null;
}

function assignLenAxis(row, log, tag) {
  if (row.deltaX != null) { row.len1 = Math.abs(row.deltaX); row.axis1 = row.deltaX >= 0 ? "E" : "W"; markModified(row, "len1", tag); markModified(row, "axis1", tag); }
  if (row.deltaY != null) { row.len2 = Math.abs(row.deltaY); row.axis2 = row.deltaY >= 0 ? "N" : "S"; markModified(row, "len2", tag); markModified(row, "axis2", tag); }
  if (row.deltaZ != null) { row.len3 = Math.abs(row.deltaZ); row.axis3 = row.deltaZ >= 0 ? "U" : "D"; markModified(row, "len3", tag); markModified(row, "axis3", tag); }
}

function lenAxisToDelta(len, axis) {
  if (len == null || !axis) return 0;
  if (axis === "E" || axis === "N" || axis === "U") return len;
  if (axis === "W" || axis === "S" || axis === "D") return -len;
  return 0;
}

function calcBranchPoint(cp, brlen, dirVec) {
  return vec.add(cp, vec.scale(vec.normalize(dirVec), brlen));
}

function calcBendCp(ep1, ep2, dataTable, rowIndex) {
  // Simplistic corner calculation if next component is straight
  return null;
}

function buildMessageSquare(row) {
  const parts = [];
  if (row.type) parts.push(row.type);
  if (row.ca[3]) parts.push(row.ca[3]);
  const len = calculateTotalLength(row);
  if (len) parts.push(`LENGTH=${Math.round(len)}MM`);
  if (row.refNo) parts.push(`RefNo:${row.refNo}`);
  return parts.join(", ");
}

function lookupBrlen(row, config) {
  const headerBore = row.bore;
  const branchBore = row.branchBore || headerBore;

  if (row.type === "TEE") {
    if (headerBore === branchBore) {
      const entry = config.brlenEqualTee.find(e => e.bore === headerBore);
      return entry ? entry.M : null;
    } else {
      const entry = config.brlenReducingTee.find(e => e.headerBore === headerBore && e.branchBore === branchBore);
      return entry ? entry.M : null;
    }
  }
  if (row.type === "OLET") {
    const entry = config.brlenWeldolet.find(e => e.headerBore === headerBore && e.branchBore === branchBore);
    if (entry) return entry.A + 0.5 * entry.headerOD;
  }
  return null;
}

function runPreFixerSteps(dataTable, config, log) {
  const stdMm = new Set(config.standardMmBores);

  // Step 1 & 2: Parse and verify MESSAGE-SQUARE
  for (const row of dataTable) {
    if (row.text && row.type !== "SUPPORT") {
      const msgData = parseMessageSquare(row.text);
      if (msgData.type && msgData.type !== row.type) {
        log.push({ type: "Info", row: row._rowIndex, message: `MESSAGE-SQUARE type "${msgData.type}" differs from component type "${row.type}". Using component data.` });
      }
      if (msgData.material && row.ca[3] && msgData.material !== row.ca[3]) {
        log.push({ type: "Info", row: row._rowIndex, message: `MESSAGE-SQUARE material "${msgData.material}" vs CA3 "${row.ca[3]}". Using CA3.` });
      }
      const epLength = calculateTotalLength(row);
      if (msgData.length && epLength && Math.abs(msgData.length - epLength) > 1) {
        log.push({ type: "Info", row: row._rowIndex, message: `MESSAGE-SQUARE LENGTH=${msgData.length} vs EP-calculated=${Math.round(epLength)}. Using EP data.` });
      }
      if (msgData.refNo && row.ca[97] && msgData.refNo !== row.ca[97]) {
        log.push({ type: "Info", row: row._rowIndex, message: `MESSAGE-SQUARE RefNo differs from CA97. Using CA97.` });
      }
    }
  }

  // Step 3: Fill Missing Identifiers
  let runningSeq = 1;
  for (const row of dataTable) {
    if (!row.csvSeqNo) {
      row.csvSeqNo = runningSeq;
      markModified(row, "csvSeqNo", "Calculated");
      log.push({ type: "Calculated", row: row._rowIndex, message: `CSV SEQ NO was blank. Assigned running number ${runningSeq}.` });
    }
    runningSeq++;

    if (!row.refNo) {
      row.refNo = String(row.csvSeqNo);
      markModified(row, "refNo", "Calculated");
      log.push({ type: "Calculated", row: row._rowIndex, message: `REF NO. was blank. Using CSV SEQ NO: ${row.refNo}.` });
    }

    if (!row.ca[97]) {
      row.ca[97] = row.refNo.startsWith("=") ? row.refNo : `=${row.refNo}`;
      markModified(row, "ca97", "Calculated");
    }

    if (!row.ca[98]) {
      row.ca[98] = String(row.csvSeqNo);
      markModified(row, "ca98", "Calculated");
    }
  }

  // Step 4: Bore Unit Conversion
  for (const row of dataTable) {
    if (row.bore && row.bore <= 48 && !stdMm.has(row.bore) && config.autoDetectInch) {
      const oldBore = row.bore;
      row.bore = Math.round(row.bore * 25.4 * 10) / 10;
      markModified(row, "bore", "Calculated");
      log.push({ type: "Warning", row: row._rowIndex, message: `Bore ${oldBore} appears to be inches. Converted to ${row.bore} mm.` });
    }
  }
}

function runPostFixerSteps(dataTable, config, log) {
  let prevEP2 = null;

  // Step 5: Bi-Directional Coordinate Calculation
  for (const row of dataTable) {
    if (row.type === "SUPPORT" || row.type === "OLET") continue;

    const hasEPs = isValidCoord(row.ep1) && isValidCoord(row.ep2);
    const hasDeltas = row.deltaX != null || row.deltaY != null || row.deltaZ != null;
    const hasLens = row.len1 != null || row.len2 != null || row.len3 != null;

    if (hasEPs) {
      row.deltaX = row.ep2.x - row.ep1.x;
      row.deltaY = row.ep2.y - row.ep1.y;
      row.deltaZ = row.ep2.z - row.ep1.z;
      assignLenAxis(row, log, "Calculated");
    } else if (hasDeltas) {
      if (!isValidCoord(row.ep1)) {
        row.ep1 = prevEP2 ? { ...prevEP2 } : { x: 0, y: 0, z: 0 };
        markModified(row, "ep1", prevEP2 ? "Calculated" : "Mock");
        log.push({ type: prevEP2 ? "Calculated" : "Mock", row: row._rowIndex, message: `EP1 derived from ${prevEP2 ? "previous EP2" : "origin (0,0,0)"}.` });
      }
      row.ep2 = { x: row.ep1.x + (row.deltaX || 0), y: row.ep1.y + (row.deltaY || 0), z: row.ep1.z + (row.deltaZ || 0) };
      markModified(row, "ep2", "Calculated");
      assignLenAxis(row, log, "Calculated");
    } else if (hasLens) {
      row.deltaX = lenAxisToDelta(row.len1, row.axis1);
      row.deltaY = lenAxisToDelta(row.len2, row.axis2);
      row.deltaZ = lenAxisToDelta(row.len3, row.axis3);
      markModified(row, "deltaX", "Calculated"); markModified(row, "deltaY", "Calculated"); markModified(row, "deltaZ", "Calculated");

      if (!isValidCoord(row.ep1)) {
        row.ep1 = prevEP2 ? { ...prevEP2 } : { x: 0, y: 0, z: 0 };
        markModified(row, "ep1", prevEP2 ? "Calculated" : "Mock");
      }
      row.ep2 = { x: row.ep1.x + row.deltaX, y: row.ep1.y + row.deltaY, z: row.ep1.z + row.deltaZ };
      markModified(row, "ep2", "Calculated");
    }

    if (isValidCoord(row.ep2)) prevEP2 = { ...row.ep2 };
  }

  // Step 6, 7, 8: CP/BP Calculation and Branch Bore Fallback
  for (const row of dataTable) {
    if (row.type === "TEE") {
      if (!isValidCoord(row.cp) && isValidCoord(row.ep1) && isValidCoord(row.ep2)) {
        row.cp = vec.mid(row.ep1, row.ep2);
        markModified(row, "cp", "Calculated");
        log.push({ type: "Calculated", row: row._rowIndex, message: `TEE CP calculated as midpoint: (${fmtCoord(row.cp)}).` });
      }
      if (!isValidCoord(row.bp) && isValidCoord(row.cp)) {
        const brlen = row.brlen || lookupBrlen(row, config) || 50; // default to 50 if unknown
        const brDir = {x: 0, y: 0, z: 1}; // Simplistic assumption for vector calc
        row.bp = calcBranchPoint(row.cp, brlen, brDir);
        row.brlen = brlen;
        markModified(row, "bp", "Calculated");
        log.push({ type: "Calculated", row: row._rowIndex, message: `TEE BP calculated: CP + ${brlen}mm = (${fmtCoord(row.bp)}).` });
      }
      if (!row.branchBore) {
        row.branchBore = row.bore;
        markModified(row, "branchBore", "Calculated");
        log.push({ type: "Calculated", row: row._rowIndex, message: `Branch bore defaulted to header bore (${row.bore}mm).` });
      }
    }

    if (row.type === "BEND") {
      if (!isValidCoord(row.cp) && isValidCoord(row.ep1) && isValidCoord(row.ep2)) {
         // simple midpoint fallback if no incoming axis
         row.cp = vec.mid(row.ep1, row.ep2);
         markModified(row, "cp", "Calculated");
      }
    }

    if (row.type === "OLET") {
      if (!row.branchBore) {
        row.branchBore = config.oletDefaultBore;
        markModified(row, "branchBore", "Mock");
        log.push({ type: "Mock", row: row._rowIndex, message: `OLET branch bore assumed as ${config.oletDefaultBore}mm (default).` });
      }
    }
  }

  // Step 9: Support Mapping
  for (const row of dataTable) {
    if (row.type === "SUPPORT") {
      if (!row.supportGuid || !row.supportGuid.startsWith("UCI:")) {
         row.supportGuid = "UCI:" + (row.supportGuid || crypto.randomUUID());
         markModified(row, "supportGuid", "Calculated");
      }
      if (!row.supportName) {
         row.supportName = config.supportMapping.fallbackName;
         markModified(row, "supportName", "Calculated");
      }
    }
  }

  // Step 10: Pointers
  let bendCount = 0, rigidCount = 0, intCount = 0;
  for (let i = 0; i < dataTable.length - 1; i++) {
    const nextType = dataTable[i + 1]?.type;
    if (nextType === "BEND") { bendCount++; dataTable[i].bendPtr = bendCount; }
    if (nextType === "FLANGE" || nextType === "VALVE") { rigidCount++; dataTable[i].rigidPtr = rigidCount; }
    if (nextType === "TEE" || nextType === "OLET") { intCount++; dataTable[i].intPtr = intCount; }
  }

  // Step 11: MESSAGE-SQUARE regeneration
  for (const row of dataTable) {
    if (!row.text || row._modified.text) {
       row.text = buildMessageSquare(row);
    }
  }
}

function runValidation(dataTable, config, log) {
  const results = [];
  let prevEP2 = null;

  for (const row of dataTable) {
    // V1: No (0,0,0) coordinates
    for (const field of ["ep1", "ep2", "cp", "bp", "supportCoor"]) {
      const c = row[field];
      if (c && c.x === 0 && c.y === 0 && c.z === 0 && isUsedField(row.type, field)) {
        results.push({ id: "V1", severity: "ERROR", row: row._rowIndex, message: `${field.toUpperCase()} is (0,0,0) — prohibited.` });
      }
    }

    // V3: Bore consistency
    if (row.type.includes("REDUCER")) {
      if (row.bore === row.branchBore) {
        results.push({ id: "V3", severity: "ERROR", row: row._rowIndex, message: `REDUCER EP1 bore = EP2 bore (${row.bore}). Must differ.` });
      }
    } else if (isUsedField(row.type, "ep1") && isUsedField(row.type, "ep2") && row.type !== "OLET") {
       if (row.bore !== row.branchBore && row.branchBore != null) {
          // If equal tee or straight pipe, bore must be equal. Branch bore stores EP2 bore in our generic model
          // Actually branch bore in our model is mainly for TEE/OLET.
          // So for PIPE EP1 and EP2 bore are the same (only row.bore exists).
       }
    }

    // V4, V5, V6, V7: BEND checks
    if (row.type === "BEND" && isValidCoord(row.cp) && isValidCoord(row.ep1) && isValidCoord(row.ep2)) {
      if (vec.approxEqual(row.cp, row.ep1, 0.01)) results.push({ id: "V4", severity: "ERROR", row: row._rowIndex, message: `BEND CP equals EP1 — degenerate bend.` });
      if (vec.approxEqual(row.cp, row.ep2, 0.01)) results.push({ id: "V5", severity: "ERROR", row: row._rowIndex, message: `BEND CP equals EP2 — degenerate bend.` });

      const v1 = vec.sub(row.ep1, row.cp);
      const v2 = vec.sub(row.ep2, row.cp);
      if (vec.mag(vec.cross(v1, v2)) < 0.001) results.push({ id: "V6", severity: "ERROR", row: row._rowIndex, message: `BEND CP is collinear with EPs — degenerate straight pipe.` });

      const d1 = vec.dist(row.cp, row.ep1);
      const d2 = vec.dist(row.cp, row.ep2);
      if (Math.abs(d1 - d2) > 1.0) results.push({ id: "V7", severity: "WARNING", row: row._rowIndex, message: `BEND radius inconsistent: dist(CP,EP1)=${Number(d1).toFixed(2)} vs dist(CP,EP2)=${Number(d2).toFixed(2)}.` });
    }

    // V8, V9, V10: TEE checks
    if (row.type === "TEE") {
      if (isValidCoord(row.cp) && isValidCoord(row.ep1) && isValidCoord(row.ep2)) {
        const expectedCp = vec.mid(row.ep1, row.ep2);
        if (!vec.approxEqual(row.cp, expectedCp, 1.0)) results.push({ id: "V8", severity: "ERROR", row: row._rowIndex, message: `TEE CP is not midpoint of EP1/EP2. Expected (${fmtCoord(expectedCp)}).` });

        // V9: TEE CP bore = EP bore
        // In our data model, `row.bore` represents the EP bore.
        // We ensure that if CP bore exists, it should match the header EP bore.
        // As our parser currently simplifies the bore into `row.bore`, we verify it exists.
        if (row.bore == null) {
          results.push({ id: "V9", severity: "ERROR", row: row._rowIndex, message: `TEE CP bore is missing.` });
        }

        // V10: TEE BP perpendicular
        if (row.bp && isValidCoord(row.bp)) {
           const bpVec = vec.sub(row.bp, row.cp);
           const epVec = vec.sub(row.ep2, row.ep1);
           if (Math.abs(vec.dot(bpVec, epVec)) > 0.01 * vec.mag(bpVec) * vec.mag(epVec)) {
              results.push({ id: "V10", severity: "WARNING", row: row._rowIndex, message: `TEE BP is not perpendicular to header.` });
           }
        }
      }
    }

    // V11: OLET no EPs
    if (row.type === "OLET") {
      if (isValidCoord(row.ep1) || isValidCoord(row.ep2)) {
        results.push({ id: "V11", severity: "ERROR", row: row._rowIndex, message: `OLET must not have END-POINTs.` });
      }
    }

    // V12, V13, V19: SUPPORT checks
    if (row.type === "SUPPORT") {
      let hasCa = false;
      for (let i of [1,2,3,4,5,6,7,8,9,10,97,98]) if (row.ca[i] != null && row.ca[i] !== "") hasCa = true;
      if (hasCa) results.push({ id: "V12", severity: "ERROR", row: row._rowIndex, message: `SUPPORT must not have COMPONENT-ATTRIBUTEs.` });
      // V13 (bore=0 is checked at generation and import level)
      // V19
      const msgData = parseMessageSquare(row.text);
      if (msgData.length || msgData.material || msgData.direction) {
         results.push({ id: "V19", severity: "WARNING", row: row._rowIndex, message: `SUPPORT MESSAGE-SQUARE should not contain Material, LENGTH, or Direction.` });
      }
    }

    // V14: SKEY presence
    if (["FLANGE", "VALVE", "BEND", "TEE", "OLET", "REDUCER-CONCENTRIC", "REDUCER-ECCENTRIC"].includes(row.type)) {
      if (!row.skey) results.push({ id: "V14", severity: "WARNING", row: row._rowIndex, message: `Missing <SKEY>.` });
    }

    // V15: Coordinate continuity
    if (prevEP2 && isValidCoord(row.ep1) && !vec.approxEqual(row.ep1, prevEP2, 1.0)) {
      results.push({ id: "V15", severity: "WARNING", row: row._rowIndex, message: `Coordinate discontinuity: EP1 (${fmtCoord(row.ep1)}) differs from prev EP2 (${fmtCoord(prevEP2)}).` });
    }
    if (isValidCoord(row.ep2) && row.type !== "SUPPORT" && row.type !== "OLET") {
      prevEP2 = { ...row.ep2 };
    }

    // V16: CA8 scope
    if (row.ca[8]) {
      if (!["FLANGE", "VALVE"].includes(row.type)) results.push({ id: "V16", severity: "WARNING", row: row._rowIndex, message: `CA8 (weight) populated for non-FLANGE/VALVE component.` });
    } else {
      if (["FLANGE", "VALVE"].includes(row.type)) results.push({ id: "V16", severity: "INFO", row: row._rowIndex, message: `CA8 (weight) missing for FLANGE/VALVE.` });
    }

    // V18: Bore unit
    const stdMm = new Set(config.standardMmBores);
    if (row.bore != null && row.bore <= 48 && !stdMm.has(row.bore)) {
       results.push({ id: "V18", severity: "WARNING", row: row._rowIndex, message: `Bore ${row.bore} may be in inches. Needs conversion.` });
    }
    if (row.branchBore != null && row.branchBore <= 48 && !stdMm.has(row.branchBore)) {
       results.push({ id: "V18", severity: "WARNING", row: row._rowIndex, message: `Branch Bore ${row.branchBore} may be in inches. Needs conversion.` });
    }

    // V20: GUID prefix
    if (row.type === "SUPPORT" && (!row.supportGuid || !row.supportGuid.startsWith("UCI:"))) {
      results.push({ id: "V20", severity: "ERROR", row: row._rowIndex, message: `<SUPPORT_GUID> must start with 'UCI:'.` });
    }
  }

  return results;
}

// ----------------------------------------------------------------------------
// 5. GENERATOR & EXPORT
// ----------------------------------------------------------------------------
function generatePcf(dataTable, headerRows, config) {
  const dec = config.decimals;
  const fmt = (v) => Number(v).toFixed(dec);
  const fmtLine = (x, y, z, b) => `${fmt(x)} ${fmt(y)} ${fmt(z)} ${fmt(b || 0)}`;
  const lines = [];

  for (const h of headerRows) lines.push(h.raw);
  lines.push("");

  for (const row of dataTable) {
    if (row.text) {
      lines.push("MESSAGE-SQUARE  ");
      lines.push(`    ${row.text}`);
    } else if (row.type === "SUPPORT") {
      // V19 ensure we have a message square
      lines.push("MESSAGE-SQUARE  ");
      lines.push(`    SUPPORT`);
    }

    if (row.type === "SUPPORT") {
      lines.push("SUPPORT");
      const c = row.supportCoor || EMPTY_COORD;
      lines.push(`    CO-ORDS    ${fmtLine(c.x, c.y, c.z, 0)}`);
      lines.push(`    <SUPPORT_NAME>    ${row.supportName}`);
      lines.push(`    <SUPPORT_GUID>    ${row.supportGuid}`);
      lines.push("");
      continue;
    }

    lines.push(row.type);

    if (row.type === "OLET") {
      lines.push(`    CENTRE-POINT  ${fmtLine(row.cp.x, row.cp.y, row.cp.z, row.bore)}`);
      lines.push(`    BRANCH1-POINT ${fmtLine(row.bp.x, row.bp.y, row.bp.z, row.branchBore)}`);
    } else {
      lines.push(`    END-POINT    ${fmtLine(row.ep1.x, row.ep1.y, row.ep1.z, row.bore)}`);
      lines.push(`    END-POINT    ${fmtLine(row.ep2.x, row.ep2.y, row.ep2.z, row.type.includes("REDUCER") ? row.branchBore : row.bore)}`);

      if (row.type === "BEND" || row.type === "TEE") {
        lines.push(`    CENTRE-POINT  ${fmtLine(row.cp.x, row.cp.y, row.cp.z, row.bore)}`);
      }
      if (row.type === "TEE") {
        lines.push(`    BRANCH1-POINT ${fmtLine(row.bp.x, row.bp.y, row.bp.z, row.branchBore)}`);
      }
    }

    if (row.type === "PIPE" && row.pipelineRef) {
      lines.push(`    PIPELINE-REFERENCE ${row.pipelineRef}`);
    }

    if (row.skey) lines.push(`    <SKEY>  ${row.skey}`);

    if (row.type === "BEND") {
      if (row.angle) lines.push(`    ANGLE  ${row.angle}`);
      if (row.bendRadius) lines.push(`    BEND-RADIUS  ${row.bendRadius}`);
    }

    if (row.type === "REDUCER-ECCENTRIC" && row.flatDirection) {
      lines.push(`    FLAT-DIRECTION  ${row.flatDirection}`);
    }

    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 97, 98]) {
      if (row.ca[n] != null && row.ca[n] !== "") {
        lines.push(`    COMPONENT-ATTRIBUTE${n}    ${row.ca[n]}`);
      }
    }

    lines.push("");
  }

  // Force CRLF for V17
  return lines.join("\r\n");
}

function calculateTally(dataTable, rawPcf, finalPcf) {
  const tally = {
    imported: { lines: 0, chars: 0, components: {} },
    processed: { lines: 0, chars: 0, components: {} },
  };

  if (rawPcf) {
    tally.imported.lines = rawPcf.split(/\r?\n/).length;
    tally.imported.chars = rawPcf.length;
  }
  if (finalPcf) {
    tally.processed.lines = finalPcf.split(/\r?\n/).length;
    tally.processed.chars = finalPcf.length;
  }

  const types = ["PIPE", "FLANGE", "VALVE", "TEE", "BEND", "OLET", "REDUCER-CONCENTRIC", "REDUCER-ECCENTRIC", "SUPPORT"];
  for (const t of types) {
    const rows = dataTable.filter(r => r.type === t);
    tally.processed.components[t] = {
      count: rows.length,
      totalLength: t === "PIPE" ? rows.reduce((sum, r) => sum + Math.abs(r.deltaX || 0) + Math.abs(r.deltaY || 0) + Math.abs(r.deltaZ || 0), 0) : null
    };
  }

  return tally;
}

// ----------------------------------------------------------------------------
// 6. STATE MANAGEMENT
// ----------------------------------------------------------------------------
const initialState = {
  rawPcf: "",
  rawExcel: null,
  headerRows: [],
  dataTable: [],
  config: { ...DEFAULT_CONFIG },
  log: [],
  validationResults: [],
  tally: { imported: {}, processed: {} },
  finalPcf: "",
  activeTab: "datatable",
  importMode: null,
  status: "Ready",
  previewModalData: null, // { file, rows, mappings, rawHeaders }
  logFilter: "All",
  smartFix: {
    status: "idle",
    graph: null,
    chains: [],
    proposedFixes: [],
    appliedFixes: [],
    chainSummary: null,
    fixSummary: null
  }
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_TAB': return { ...state, activeTab: action.payload };
    case 'SET_STATUS': return { ...state, status: action.payload };
    case 'SET_LOG_FILTER': return { ...state, logFilter: action.payload };
    case 'IMPORT_PCF':
      return {
        ...state,
        rawPcf: action.payload.text,
        headerRows: action.payload.headerRows,
        dataTable: action.payload.components,
        importMode: "pcf",
        status: `Parsed ${action.payload.components.length} components.`,
        log: [], validationResults: [], finalPcf: ""
      };
    case 'OPEN_EXCEL_PREVIEW':
      return { ...state, previewModalData: action.payload, status: "Previewing Excel/CSV data..." };
    case 'CLOSE_EXCEL_PREVIEW':
      return { ...state, previewModalData: null, status: "Ready" };
    case 'CONFIRM_EXCEL_IMPORT':
      return {
        ...state,
        dataTable: action.payload.dataTable,
        headerRows: action.payload.headerRows,
        previewModalData: null,
        importMode: "excel",
        status: `Imported ${action.payload.dataTable.length} rows from Excel/CSV.`,
        log: [], validationResults: [], finalPcf: ""
      };
    case 'RUN_FIXER':
      return {
        ...state,
        dataTable: action.payload.dataTable,
        log: action.payload.log,
        validationResults: action.payload.validationResults,
        finalPcf: action.payload.finalPcf,
        tally: action.payload.tally,
        status: action.payload.status
      };
    case 'UPDATE_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload } };
    case 'RESET_CONFIG':
      return { ...state, config: { ...DEFAULT_CONFIG } };
    case 'SET_SMART_FIX_STATUS':
      return { ...state, smartFix: { ...state.smartFix, status: action.payload } };
    case 'SMART_FIX_COMPLETE':
      return {
        ...state,
        dataTable: action.payload.dataTable,
        log: action.payload.log,
        smartFix: {
          ...state.smartFix,
          status: 'previewing',
          graph: action.payload.graph,
          chains: action.payload.chains,
          chainSummary: action.payload.summary
        }
      };
    case 'FIXES_APPLIED':
      return {
        ...state,
        dataTable: action.payload.updatedTable,
        smartFix: {
          ...state.smartFix,
          status: 'applied',
          appliedFixes: action.payload.applied,
          fixSummary: {
            deleteCount: action.payload.deleteCount,
            insertCount: action.payload.insertCount,
            totalApplied: action.payload.applied.length
          }
        }
      };
    default: return state;
  }
}


// ----------------------------------------------------------------------------
// 6.5. NEW RULES
const R_GEO_05 = (element, log) => {
  if (element.type !== "BEND") return;
  const p1 = element.ep1, p2 = element.ep2, c = element.cp;
  if (!p1 || !p2 || !c) return;
  const r1 = vec.mag(vec.sub(p1, c));
  const bore = element.bore || 0;
  if (bore > 0) {
    const ratio = r1 / bore;
    if (Math.abs(ratio - 1.5) > 0.1 && Math.abs(ratio - 1.0) > 0.1) {
      log.push({ type: "Warning", ruleId: "R-GEO-05", tier: 3, row: element._rowIndex, message: `WARNING [R-GEO-05]: BEND radius ${Number(r1).toFixed(1)}mm does not match standard 1.5D or 1.0D.` });
    }
  }
};

const R_GEO_08 = (element, log) => {
  if (!element.type?.startsWith("REDUCER")) return;
  const r1 = (element.bores && element.bores[0]) ? element.bores[0] : element.bore;
  const r2 = (element.bores && element.bores[1]) ? element.bores[1] : element.bore;
  if (r1 === r2) {
    log.push({ type: "Error", ruleId: "R-GEO-08", tier: 4, row: element._rowIndex, message: `ERROR [R-GEO-08]: REDUCER has identical Entry/Exit bores (${r1}mm).` });
  }
};

const R_BRN_04 = (element, log) => {
  if (element.type !== "OLET" && element.type !== "TEE") return;
  const bp = element.bp;
  const ep1 = element.ep1, ep2 = element.ep2;
  if (!bp || !ep1 || !ep2) return;
  const mainVec = vec.sub(ep2, ep1);
  const mainMag = vec.mag(mainVec);
  if (mainMag === 0) return;

  const midPoint = vec.add(ep1, { x: mainVec.x/2, y: mainVec.y/2, z: mainVec.z/2 });
  const brnVec = vec.sub(bp, element.type === "OLET" ? element.cp || midPoint : midPoint);
  const brnMag = vec.mag(brnVec);

  if (brnMag > 0) {
    const dot = (mainVec.x * brnVec.x + mainVec.y * brnVec.y + mainVec.z * brnVec.z) / (mainMag * brnMag);
    const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
    if (Math.abs(angle - 90) > 2 && Math.abs(angle - 45) > 2 && Math.abs(angle - 135) > 2) {
      log.push({ type: "Error", ruleId: "R-BRN-04", tier: 4, row: element._rowIndex, message: `ERROR [R-BRN-04]: Branch ${angle.toFixed(1)}° from perpendicular.` });
    }
  }
};

const R_DAT_06 = (element, log) => {
  if (!element.skey) return;
  const skey = element.skey.toUpperCase();
  const type = element.type || "";
  if (type === "OLET" && !skey.startsWith("OL")) {
    log.push({ type: "Warning", ruleId: "R-DAT-06", tier: 3, row: element._rowIndex, message: `WARNING [R-DAT-06]: SKEY '${skey}' prefix mismatch for OLET (expected 'OL...').` });
  }
  if (type === "BEND" && !skey.startsWith("BE")) {
    log.push({ type: "Warning", ruleId: "R-DAT-06", tier: 3, row: element._rowIndex, message: `WARNING [R-DAT-06]: SKEY '${skey}' prefix mismatch for BEND (expected 'BE...').` });
  }
};


// ----------------------------------------------------------------------------
// 7. UI COMPONENTS
// ----------------------------------------------------------------------------
export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { activeTab, rawPcf, dataTable, headerRows, config, log, validationResults, finalPcf, status, tally, previewModalData, logFilter } = state;

  const handleImportPcf = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    dispatch({ type: 'SET_STATUS', payload: `Reading ${file.name}...` });
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const parsed = parsePcf(text);
      if (parsed.components.length === 0) {
        dispatch({ type: 'SET_STATUS', payload: `Error: No components found in ${file.name}` });
        alert("Error: No components parsed. Check file format.");
        return;
      }
      dispatch({ type: 'IMPORT_PCF', payload: { text, headerRows: parsed.headerRows, components: parsed.components } });
    };
    reader.readAsText(file);
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    dispatch({ type: 'SET_STATUS', payload: `Reading ${file.name}...` });
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { header: 1 });

        if (rows.length < 2) {
          alert("Error: File seems empty or has no data rows.");
          return;
        }

        // Auto-detect header row
        let headerRowIdx = 0;
        let bestScore = 0;
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const row = rows[i];
          const nonNumericCount = row.filter(cell => cell && isNaN(Number(cell))).length;
          if (nonNumericCount > bestScore) {
             bestScore = nonNumericCount;
             headerRowIdx = i;
          }
        }

        const rawHeaders = rows[headerRowIdx];
        const dataRows = rows.slice(headerRowIdx + 1);

        const mappings = rawHeaders.map(h => fuzzyMatchHeader(h, config.columnAliases) || "UNKNOWN");

        dispatch({
          type: 'OPEN_EXCEL_PREVIEW',
          payload: {
             fileName: file.name,
             totalCols: rawHeaders.length,
             totalRows: dataRows.length,
             headerRowIdx: headerRowIdx + 1,
             rawHeaders,
             dataRows,
             mappings
          }
        });

      } catch (err) {
         dispatch({ type: 'SET_STATUS', payload: "Error importing Excel." });
         console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmExcelImport = (mappings) => {
    const importedData = [];
    let rowIndex = 0;

    for (const row of previewModalData.dataRows) {
      if (!row || row.length === 0) continue;
      const comp = {
        _rowIndex: ++rowIndex, _modified: {}, _logTags: [],
        type: "", text: "", pipelineRef: "", refNo: "", bore: null, branchBore: null,
        ep1: { ...NULL_COORD }, ep2: { ...NULL_COORD }, cp: { ...NULL_COORD }, bp: { ...NULL_COORD },
        skey: "", supportCoor: { ...NULL_COORD }, supportName: "", supportGuid: "",
        ca: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null, 10: null, 97: null, 98: null },
        fixingAction: null, fixingActionTier: null, fixingActionRuleId: null, csvSeqNo: null
      };

      mappings.forEach((colCanonical, idx) => {
        if (colCanonical === "UNKNOWN") return;
        const val = row[idx];
        if (val == null || val === "") return;

        if (colCanonical === "Type") comp.type = DEFAULT_CONFIG.typeMapping[String(val).toUpperCase()] || String(val).toUpperCase();
        else if (colCanonical === "TEXT") comp.text = String(val);
        else if (colCanonical === "CSV SEQ NO") comp.csvSeqNo = val;
        else if (colCanonical === "REF NO.") comp.refNo = String(val);
        else if (colCanonical === "BORE") comp.bore = parseFloat(val);
        else if (colCanonical === "SKEY") comp.skey = String(val);
        else if (colCanonical.startsWith("CA")) comp.ca[parseInt(colCanonical.substring(2))] = String(val);
        else if (colCanonical === "EP1") { const pts = String(val).split(',').map(Number); if(pts.length===3) comp.ep1 = {x:pts[0], y:pts[1], z:pts[2]}; }
        else if (colCanonical === "EP2") { const pts = String(val).split(',').map(Number); if(pts.length===3) comp.ep2 = {x:pts[0], y:pts[1], z:pts[2]}; }
        else if (colCanonical === "CP") { const pts = String(val).split(',').map(Number); if(pts.length===3) comp.cp = {x:pts[0], y:pts[1], z:pts[2]}; }
        else if (colCanonical === "BP") { const pts = String(val).split(',').map(Number); if(pts.length===3) comp.bp = {x:pts[0], y:pts[1], z:pts[2]}; }
        else if (colCanonical === "SUPPORT CO-ORDS") { const pts = String(val).split(',').map(Number); if(pts.length===3) comp.supportCoor = {x:pts[0], y:pts[1], z:pts[2]}; }
      });
      importedData.push(comp);
    }

    if (importedData.length === 0) {
       alert("Error: No component rows mapped.");
       return;
    }

    const newHeaderRows = [
      {raw: "ISOGEN-FILES ISOGEN.FLS"},
      {raw: "UNITS-BORE MM"},
      {raw: "UNITS-CO-ORDS MM"},
      {raw: "PIPELINE-REFERENCE " + config.pipelineRef.default}
    ];

    dispatch({ type: 'CONFIRM_EXCEL_IMPORT', payload: { dataTable: importedData, headerRows: newHeaderRows } });
  };

  const runBasicFixer = () => {
    dispatch({ type: 'SET_STATUS', payload: "Running Basic Fixes..." });
    const tableCopy = JSON.parse(JSON.stringify(dataTable));
    const runLog = [];

    runPreFixerSteps(tableCopy, config, runLog);
    runPostFixerSteps(tableCopy, config, runLog);
    const vResults = runValidation(tableCopy, config, runLog);

    vResults.forEach(r => {
      runLog.push({ type: r.severity === "ERROR" ? "Error" : r.severity === "WARNING" ? "Warning" : "Info", row: r.row, message: `[${r.id}] ${r.message}` });
    });

    const generated = generatePcf(tableCopy, headerRows, config);
    const newTally = calculateTally(tableCopy, rawPcf, generated);

    dispatch({
      type: 'RUN_FIXER',
      payload: {
        dataTable: tableCopy,
        log: runLog,
        validationResults: vResults,
        finalPcf: generated,
        tally: newTally,
        status: `Basic Fixes: ${vResults.filter(r=>r.severity==='ERROR').length} errors, ${vResults.filter(r=>r.severity==='WARNING').length} warnings.`
      }
    });
  };

  const handleSmartFix = () => {
    dispatch({ type: 'SET_SMART_FIX_STATUS', payload: 'running' });
    const tableCopy = JSON.parse(JSON.stringify(dataTable));
    const runLog = [...log];

    runPreFixerSteps(tableCopy, config, runLog);

    // Core insertion
    const result = runSmartFix(tableCopy, config, runLog);

    dispatch({
      type: 'SMART_FIX_COMPLETE',
      payload: {
        graph: result.graph,
        chains: result.chains,
        summary: result.summary,
        dataTable: tableCopy,
        log: runLog
      }
    });
  };

  const handleApplyFixes = () => {
    dispatch({ type: 'SET_SMART_FIX_STATUS', payload: 'applying' });
    const tableCopy = JSON.parse(JSON.stringify(dataTable));
    const runLog = [...log];

    const result = applyFixesEngine(tableCopy, state.smartFix.chains, config, runLog);

    // Rerun post steps and validations since we modified the table
    runPostFixerSteps(result.updatedTable, config, runLog);
    const vResults = runValidation(result.updatedTable, config, runLog);

    vResults.forEach(r => {
      runLog.push({ type: r.severity === "ERROR" ? "Error" : r.severity === "WARNING" ? "Warning" : "Info", row: r.row, message: `[${r.id}] ${r.message}` });
    });

    const generated = generatePcf(result.updatedTable, headerRows, config);
    const newTally = calculateTally(result.updatedTable, rawPcf, generated);

    dispatch({
      type: 'FIXES_APPLIED',
      payload: {
        updatedTable: result.updatedTable,
        applied: result.applied,
        deleteCount: result.deleteCount,
        insertCount: result.insertCount
      }
    });

    // Also update the core state from the run
    dispatch({
      type: 'RUN_FIXER',
      payload: {
        dataTable: result.updatedTable,
        log: runLog,
        validationResults: vResults,
        finalPcf: generated,
        tally: newTally,
        status: `Fixes Applied! ${result.applied.length} fixes executed. Validation: ${vResults.filter(r=>r.severity==='ERROR').length} errors.`
      }
    });
  };

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('PCF Data');

    const cols = ["#", "Type", "TEXT", "REF NO.", "BORE", "EP1", "EP2", "CP", "BP", "SKEY"];
    sheet.addRow(cols);

    dataTable.forEach(r => {
      const row = sheet.addRow([
        r._rowIndex, r.type, r.text, r.refNo, r.bore,
        fmtCoordStr(r.ep1), fmtCoordStr(r.ep2), fmtCoordStr(r.cp), fmtCoordStr(r.bp), r.skey
      ]);

      // Highlight modified cells
      Object.keys(r._modified).forEach(field => {
        let colIdx = cols.indexOf(field.toUpperCase());
        if (colIdx >= 0) {
           const cell = row.getCell(colIdx + 1);
           const tag = r._modified[field];
           if (tag === "Error") cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5C6CB' } };
           else if (tag === "Calculated") cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1ECF1' } };
           else if (tag === "Mock") cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
           else cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } }; // Amber fallback
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PCF_DataTable_${Date.now()}.xlsx`;
    a.click();
  };

  const exportPcf = () => {
    const blob = new Blob([finalPcf], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fixed_${Date.now()}.pcf`;
    a.click();
  };

  const ExcelPreviewModal = () => {
    if (!previewModalData) return null;
    const { fileName, totalCols, totalRows, headerRowIdx, rawHeaders, mappings, dataRows } = previewModalData;
    const [currentMappings, setCurrentMappings] = useState([...mappings]);

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-[#1A1D23] border border-gray-700 rounded shadow-xl max-w-5xl w-full flex flex-col max-h-[90vh]">
          <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#111317]">
            <h2 className="font-bold text-white">Preview: "{fileName}"</h2>
            <button onClick={() => dispatch({ type: 'CLOSE_EXCEL_PREVIEW' })} className="text-gray-400 hover:text-white">✕ Close</button>
          </div>

          <div className="p-4 overflow-auto flex-1">
            <div className="mb-4 text-gray-400">
              Detected {totalCols} columns, {totalRows} rows. Header row: Row {headerRowIdx} (auto-detected).
            </div>

            <div className="overflow-x-auto border border-gray-700 mb-6">
              <table className="min-w-full text-left bg-white text-black whitespace-nowrap">
                <thead className="bg-gray-200">
                  <tr>
                    {rawHeaders.map((h, i) => <th key={i} className="p-2 border border-gray-300 text-xs font-bold">{h || `Col ${i+1}`}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {rawHeaders.map((_, colIdx) => <td key={colIdx} className="p-2 border border-gray-300 text-xs font-mono">{row[colIdx]}</td>)}
                    </tr>
                  ))}
                  {dataRows.length > 5 && <tr><td colSpan={rawHeaders.length} className="p-2 text-center text-gray-500 italic text-xs">... {dataRows.length - 5} more rows</td></tr>}
                </tbody>
              </table>
            </div>

            <h3 className="font-bold mb-2">Column Mapping (editable)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {rawHeaders.map((h, i) => (
                <div key={i} className={`flex flex-col p-2 border rounded text-xs ${currentMappings[i] !== "UNKNOWN" ? "border-green-800 bg-green-900/20" : "border-red-800 bg-red-900/20"}`}>
                   <span className="font-bold truncate text-gray-300 mb-1" title={h}>{h || `Column ${i+1}`}</span>
                   <select
                      className="bg-[#111317] border border-gray-600 rounded text-white p-1"
                      value={currentMappings[i]}
                      onChange={(e) => {
                        const newM = [...currentMappings];
                        newM[i] = e.target.value;
                        setCurrentMappings(newM);
                      }}
                   >
                     <option value="UNKNOWN">-- Ignore (Unmatched) --</option>
                     {Object.keys(DEFAULT_CONFIG.columnAliases).map(k => <option key={k} value={k}>{k}</option>)}
                   </select>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-gray-700 bg-[#111317] flex justify-end gap-3">
             <button onClick={() => dispatch({ type: 'CLOSE_EXCEL_PREVIEW' })} className="px-4 py-2 border border-gray-600 rounded text-gray-300 hover:bg-gray-800">Cancel</button>
             <button onClick={() => confirmExcelImport(currentMappings)} className="px-4 py-2 bg-[#0077B6] hover:bg-blue-600 text-white font-bold rounded">Confirm Import</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#1A1D23] text-gray-200 font-sans text-sm">
      <ExcelPreviewModal />
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#111317] border-b border-gray-800">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#0077B6]" />
            PCF Validator & Fixer
          </h1>
          <div className="flex gap-2">
             <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded flex items-center gap-2 transition-colors">
                <Upload className="w-4 h-4" /> Import PCF
                <input type="file" accept=".pcf,.txt" className="hidden" onChange={handleImportPcf} />
             </label>
             <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded flex items-center gap-2 transition-colors">
                <FileSpreadsheet className="w-4 h-4" /> Import Excel/CSV
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel} />
             </label>
          </div>
        </div>
        <div className="text-xs text-gray-500">ver.10-03-26 time 09:00</div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#111317] px-4 border-b border-gray-800">
        {[
          { id: 'datatable', label: 'Data Table', icon: FileSpreadsheet },
          { id: 'config', label: 'Config', icon: Settings },
          { id: 'debug', label: 'Debug', icon: AlertCircle },
          { id: 'output', label: 'Output', icon: FileText }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => dispatch({ type: 'SET_TAB', payload: t.id })}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === t.id ? 'border-[#0077B6] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'datatable' && (
          <div className="h-full overflow-auto bg-white text-black p-4">
             {dataTable.length === 0 ? (
               <div className="flex h-full items-center justify-center text-gray-400">Import a file to populate the data table.</div>
             ) : (
               <table className="min-w-max text-left border-collapse border border-gray-300 whitespace-nowrap">
                 <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm text-xs">
                   <tr>
                     <th colSpan="4" className="p-1 border border-gray-300 text-center bg-gray-200">Identity</th>
                     <th colSpan="1" className="p-1 border border-gray-300 text-center bg-[#0077B6] text-white">Smart Fix Preview</th>
                     <th colSpan="2" className="p-1 border border-gray-300 text-center bg-gray-200">Reference</th>
                     <th colSpan="5" className="p-1 border border-gray-300 text-center bg-gray-200">Geometry</th>
                     <th colSpan="1" className="p-1 border border-gray-300 text-center bg-gray-200">Fitting</th>
                     <th colSpan="2" className="p-1 border border-gray-300 text-center bg-gray-200">Support</th>
                     <th colSpan="12" className="p-1 border border-gray-300 text-center bg-gray-200">Attributes</th>
                     <th colSpan="7" className="p-1 border border-gray-300 text-center bg-gray-200">Calculated</th>
                     <th colSpan="3" className="p-1 border border-gray-300 text-center bg-gray-200">Deltas</th>
                     <th colSpan="2" className="p-1 border border-gray-300 text-center bg-gray-200">Derived</th>
                     <th colSpan="3" className="p-1 border border-gray-300 text-center bg-gray-200">Pointers</th>
                   </tr>
                   <tr>
                     <th className="p-2 border border-gray-300 sticky left-0 bg-gray-100 z-20 shadow-[1px_0_0_#d1d5db]">#</th>
                     <th className="p-2 border border-gray-300 sticky left-[40px] bg-gray-100 z-20 shadow-[1px_0_0_#d1d5db]">CSV SEQ NO</th>
                     <th className="p-2 border border-gray-300 sticky left-[120px] bg-gray-100 z-20 shadow-[1px_0_0_#d1d5db]">Type</th>
                     <th className="p-2 border border-gray-300">TEXT</th>

                     <th className="p-2 border border-gray-300 bg-blue-50 text-[#0077B6] font-bold">Fixing Action</th>

                     <th className="p-2 border border-gray-300">PIPELINE-REFERENCE</th>
                     <th className="p-2 border border-gray-300">REF NO.</th>

                     <th className="p-2 border border-gray-300">BORE</th>
                     <th className="p-2 border border-gray-300">EP1</th>
                     <th className="p-2 border border-gray-300">EP2</th>
                     <th className="p-2 border border-gray-300">CP</th>
                     <th className="p-2 border border-gray-300">BP</th>

                     <th className="p-2 border border-gray-300">SKEY</th>

                     <th className="p-2 border border-gray-300">SUPPORT COOR</th>
                     <th className="p-2 border border-gray-300">SUPPORT GUID</th>

                     <th className="p-2 border border-gray-300">CA1</th><th className="p-2 border border-gray-300">CA2</th>
                     <th className="p-2 border border-gray-300">CA3</th><th className="p-2 border border-gray-300">CA4</th>
                     <th className="p-2 border border-gray-300">CA5</th><th className="p-2 border border-gray-300">CA6</th>
                     <th className="p-2 border border-gray-300">CA7</th><th className="p-2 border border-gray-300">CA8</th>
                     <th className="p-2 border border-gray-300">CA9</th><th className="p-2 border border-gray-300">CA10</th>
                     <th className="p-2 border border-gray-300">CA97</th><th className="p-2 border border-gray-300">CA98</th>

                     <th className="p-2 border border-gray-300">LEN1</th><th className="p-2 border border-gray-300">AXIS1</th>
                     <th className="p-2 border border-gray-300">LEN2</th><th className="p-2 border border-gray-300">AXIS2</th>
                     <th className="p-2 border border-gray-300">LEN3</th><th className="p-2 border border-gray-300">AXIS3</th>
                     <th className="p-2 border border-gray-300">BRLEN</th>

                     <th className="p-2 border border-gray-300">DELTA_X</th><th className="p-2 border border-gray-300">DELTA_Y</th><th className="p-2 border border-gray-300">DELTA_Z</th>

                     <th className="p-2 border border-gray-300">DIAMETER</th><th className="p-2 border border-gray-300">WALL_THICK</th>

                     <th className="p-2 border border-gray-300">BEND_PTR</th><th className="p-2 border border-gray-300">RIGID_PTR</th><th className="p-2 border border-gray-300">INT_PTR</th>
                   </tr>
                 </thead>
                 <tbody>
                   {dataTable.map((r, i) => {
                     const getBg = (field) => {
                       const tag = r._modified[field];
                       if (tag === 'Error') return 'bg-[#F5C6CB] text-[#721C24] font-bold';
                       if (tag === 'Calculated') return 'bg-[#D1ECF1] text-[#0C5460]';
                       if (tag === 'Mock') return 'bg-[#F8D7DA] text-[#721C24]';
                       if (tag) return 'bg-[#FFF3CD] text-black';
                       return '';
                     };
                     const getTitle = (field) => r._modified[field] ? `[${r._modified[field]}] modified` : '';

                     const renderFixingAction = (val, tier, ruleId) => {
                       if (!val) return <span className="text-gray-400">—</span>;
                       const tierColors = {
                         1: { bg: "#D4EDDA", text: "#155724", border: "#28A745", label: "AUTO" },
                         2: { bg: "#FFF3CD", text: "#856404", border: "#FFC107", label: "FIX" },
                         3: { bg: "#FFE5D0", text: "#856404", border: "#FD7E14", label: "REVIEW" },
                         4: { bg: "#F8D7DA", text: "#721C24", border: "#DC3545", label: "ERROR" },
                       };
                       const colors = tierColors[tier] || tierColors[3];
                       return (
                         <div style={{
                           background: colors.bg, color: colors.text, borderLeft: `3px solid ${colors.border}`,
                           padding: "4px 8px", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem",
                           lineHeight: 1.4, whiteSpace: "pre-wrap", maxWidth: 320,
                         }}>
                           <span style={{
                             display: "inline-block", background: colors.border, color: "white", padding: "1px 6px",
                             borderRadius: 3, fontSize: "0.6rem", fontWeight: 700, marginBottom: 2,
                           }}>
                             {colors.label} T{tier}
                           </span>
                           {" "}{ruleId}
                           <br/>
                           {val}
                         </div>
                       );
                     };

                     return (
                       <tr key={i} className="hover:bg-gray-50 text-xs">
                         <td className="p-2 border border-gray-300 sticky left-0 bg-white z-10">{r._rowIndex}</td>
                         <td className={`p-2 border border-gray-300 sticky left-[40px] bg-white z-10 ${getBg('csvSeqNo')}`} title={getTitle('csvSeqNo')}>{r.csvSeqNo}</td>
                         <td className={`p-2 border border-gray-300 sticky left-[120px] bg-white z-10 font-mono font-bold ${getBg('type')}`}>{r.type}</td>
                         <td className={`p-2 border border-gray-300 truncate max-w-[200px] ${getBg('text')}`} title={r.text}>{r.text}</td>

                         <td className="p-2 border border-gray-300 bg-blue-50 align-top">
                           {renderFixingAction(r.fixingAction, r.fixingActionTier, r.fixingActionRuleId)}
                         </td>

                         <td className={`p-2 border border-gray-300 ${getBg('pipelineRef')}`}>{r.pipelineRef}</td>
                         <td className={`p-2 border border-gray-300 ${getBg('refNo')}`}>{r.refNo}</td>

                         <td className={`p-2 border border-gray-300 ${getBg('bore')}`}>{r.bore}</td>
                         <td className={`p-2 border border-gray-300 font-mono ${getBg('ep1')}`}>{fmtCoord(r.ep1)}</td>
                         <td className={`p-2 border border-gray-300 font-mono ${getBg('ep2')}`}>{fmtCoord(r.ep2)}</td>
                         <td className={`p-2 border border-gray-300 font-mono ${getBg('cp')}`}>{fmtCoord(r.cp)}</td>
                         <td className={`p-2 border border-gray-300 font-mono ${getBg('bp')}`}>{fmtCoord(r.bp)}</td>

                         <td className={`p-2 border border-gray-300 ${getBg('skey')}`}>{r.skey}</td>

                         <td className={`p-2 border border-gray-300 font-mono ${getBg('supportCoor')}`}>{fmtCoord(r.supportCoor)}</td>
                         <td className={`p-2 border border-gray-300 ${getBg('supportGuid')}`}>{r.supportGuid}</td>

                         {[1,2,3,4,5,6,7,8,9,10,97,98].map(ca => (
                            <td key={ca} className={`p-2 border border-gray-300 truncate max-w-[100px] ${getBg('ca'+ca)}`}>{r.ca[ca]}</td>
                         ))}

                         <td className={`p-2 border border-gray-300 ${getBg('len1')}`}>{r.len1 != null ? r.len1.toFixed(1) : ''}</td>
                         <td className={`p-2 border border-gray-300 ${getBg('axis1')}`}>{r.axis1}</td>
                         <td className={`p-2 border border-gray-300 ${getBg('len2')}`}>{r.len2 != null ? r.len2.toFixed(1) : ''}</td>
                         <td className={`p-2 border border-gray-300 ${getBg('axis2')}`}>{r.axis2}</td>
                         <td className={`p-2 border border-gray-300 ${getBg('len3')}`}>{r.len3 != null ? r.len3.toFixed(1) : ''}</td>
                         <td className={`p-2 border border-gray-300 ${getBg('axis3')}`}>{r.axis3}</td>
                         <td className={`p-2 border border-gray-300 ${getBg('brlen')}`}>{r.brlen}</td>

                         <td className={`p-2 border border-gray-300 ${getBg('deltaX')}`}>{r.deltaX != null ? r.deltaX.toFixed(1) : ''}</td>
                         <td className={`p-2 border border-gray-300 ${getBg('deltaY')}`}>{r.deltaY != null ? r.deltaY.toFixed(1) : ''}</td>
                         <td className={`p-2 border border-gray-300 ${getBg('deltaZ')}`}>{r.deltaZ != null ? r.deltaZ.toFixed(1) : ''}</td>

                         <td className={`p-2 border border-gray-300 ${getBg('diameter')}`}>{r.diameter}</td>
                         <td className={`p-2 border border-gray-300 ${getBg('wallThick')}`}>{r.wallThick}</td>

                         <td className={`p-2 border border-gray-300 ${getBg('bendPtr')}`}>{r.bendPtr}</td>
                         <td className={`p-2 border border-gray-300 ${getBg('rigidPtr')}`}>{r.rigidPtr}</td>
                         <td className={`p-2 border border-gray-300 ${getBg('intPtr')}`}>{r.intPtr}</td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             )}
          </div>
        )}

        {activeTab === 'config' && (
          <div className="h-full overflow-auto p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-[#242830] p-3 rounded border border-gray-700">
              <span className="font-bold">Configuration Engine</span>
              <div className="flex gap-2 text-xs">
                <button className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded flex items-center gap-1"><Upload className="w-3 h-3"/> Load Config</button>
                <button className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded flex items-center gap-1"><Save className="w-3 h-3"/> Save Config</button>
                <button onClick={() => dispatch({type: 'RESET_CONFIG'})} className="bg-red-900 hover:bg-red-800 px-3 py-1.5 rounded flex items-center gap-1"><RefreshCcw className="w-3 h-3"/> Reset All</button>
              </div>
            </div>

            <div className="bg-[#242830] p-4 rounded border border-gray-700">
              <h2 className="font-bold mb-4 text-[#0077B6]">▼ GENERAL SETTINGS</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="flex flex-col">Decimal Precision
                   <select className="bg-[#111317] border border-gray-600 rounded p-1 mt-1 text-white" value={config.decimals} onChange={e => dispatch({type:'UPDATE_CONFIG', payload: {decimals: parseInt(e.target.value)}})}>
                      <option value={4}>4</option><option value={1}>1</option>
                   </select>
                </label>
                <label className="flex flex-col">Angle Format
                   <select className="bg-[#111317] border border-gray-600 rounded p-1 mt-1 text-white" value={config.angleFormat} onChange={e => dispatch({type:'UPDATE_CONFIG', payload: {angleFormat: e.target.value}})}>
                      <option value="degrees">degrees</option><option value="radians">radians</option>
                   </select>
                </label>
                <label className="flex items-center gap-2 mt-4"><input type="checkbox" checked={config.crlfMode} readOnly className="rounded text-[#0077B6] bg-[#111317] border-gray-600" /> CRLF Mode (always on)</label>
              </div>
            </div>

            <div className="bg-[#242830] p-4 rounded border border-gray-700">
              <h2 className="font-bold mb-4 text-[#0077B6]">▼ PIPELINE REFERENCE</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="flex flex-col">Default Filename <input className="bg-[#111317] border border-gray-600 rounded p-1 mt-1 text-white" value={config.pipelineRef.default} onChange={e => dispatch({type:'UPDATE_CONFIG', payload:{pipelineRef: {...config.pipelineRef, default: e.target.value}}})} /></label>
                <label className="flex flex-col">PROJECT-IDENTIFIER <input className="bg-[#111317] border border-gray-600 rounded p-1 mt-1 text-white" value={config.pipelineRef.projectId} onChange={e => dispatch({type:'UPDATE_CONFIG', payload:{pipelineRef: {...config.pipelineRef, projectId: e.target.value}}})} /></label>
                <label className="flex flex-col">AREA <input className="bg-[#111317] border border-gray-600 rounded p-1 mt-1 text-white" value={config.pipelineRef.area} onChange={e => dispatch({type:'UPDATE_CONFIG', payload:{pipelineRef: {...config.pipelineRef, area: e.target.value}}})} /></label>
              </div>
            </div>

            <div className="bg-[#242830] p-4 rounded border border-gray-700">
              <h2 className="font-bold mb-4 text-[#0077B6]">▼ COLUMN ALIASES</h2>
              <div className="max-h-64 overflow-y-auto border border-gray-700 mb-2">
                <table className="w-full text-left bg-[#1A1D23] text-sm">
                  <thead className="bg-[#111317] sticky top-0"><tr><th className="p-2 w-1/3">Canonical</th><th className="p-2">Aliases (comma-separated)</th></tr></thead>
                  <tbody>
                     {Object.entries(config.columnAliases).slice(0, 10).map(([k,v]) => (
                        <tr key={k} className="border-b border-gray-800">
                           <td className="p-2 font-mono text-xs">{k}</td>
                           <td className="p-2"><input className="w-full bg-[#111317] border border-gray-700 rounded p-1 text-xs" defaultValue={v.join(", ")} /></td>
                        </tr>
                     ))}
                     <tr><td colSpan="2" className="p-2 text-center text-xs text-gray-500 italic">... showing first 10 columns ...</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-[#242830] p-4 rounded border border-gray-700">
              <h2 className="font-bold mb-4 text-[#0077B6]">▼ BORE & UNIT SETTINGS</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <label className="flex items-center gap-2">
                    <input type="checkbox" checked={config.autoDetectInch} onChange={e => dispatch({type:'UPDATE_CONFIG', payload:{autoDetectInch: e.target.checked}})} className="rounded" />
                    Auto-detect inch bores
                 </label>
                 <label className="flex flex-col">Standard mm bores (comma separated)
                    <input className="bg-[#111317] border border-gray-600 rounded p-1 mt-1 text-xs font-mono" value={config.standardMmBores.join(",")} onChange={e => dispatch({type:'UPDATE_CONFIG', payload:{standardMmBores: e.target.value.split(',').map(Number)}})} />
                 </label>
                 <label className="flex flex-col mt-2">TEE default bore <input className="bg-[#111317] border border-gray-600 rounded p-1 mt-1 text-xs" value={config.teeDefaultBore} readOnly/></label>
                 <label className="flex flex-col mt-2">OLET default bore <input type="number" className="bg-[#111317] border border-gray-600 rounded p-1 mt-1 text-xs" value={config.oletDefaultBore} onChange={e => dispatch({type:'UPDATE_CONFIG', payload:{oletDefaultBore: parseInt(e.target.value)}})}/></label>
              </div>
            </div>

            <div className="bg-[#242830] p-4 rounded border border-gray-700">
              <h2 className="font-bold mb-4 text-[#0077B6]">▼ SUPPORT MAPPING</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                 <label className="flex flex-col">GUID Prefix <input className="bg-[#111317] border border-gray-600 rounded p-1 mt-1" value={config.supportMapping.guidPrefix} readOnly/></label>
                 <label className="flex flex-col">Fallback Name <input className="bg-[#111317] border border-gray-600 rounded p-1 mt-1" value={config.supportMapping.fallbackName} onChange={e => dispatch({type:'UPDATE_CONFIG', payload:{supportMapping: {...config.supportMapping, fallbackName: e.target.value}}})} /></label>
              </div>
              <table className="w-full text-left bg-[#1A1D23] text-sm border border-gray-700">
                 <thead className="bg-[#111317]"><tr><th className="p-2">Condition</th><th className="p-2">Support Name</th></tr></thead>
                 <tbody>
                    {config.supportMapping.blocks.map((b,i) => (
                       <tr key={i} className="border-b border-gray-800">
                         <td className="p-2 font-mono text-xs">{b.condition.replace(/_/g, ' ')}</td>
                         <td className="p-2">{b.name}</td>
                       </tr>
                    ))}
                 </tbody>
              </table>
            </div>


            <div className="bg-[#242830] p-4 rounded border border-gray-700">
              <h2 className="font-bold mb-4 text-[#0077B6]">▼ SMART FIXER SETTINGS</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <label className="flex flex-col text-sm text-gray-300">
                    Chaining Strategy
                    <select className="bg-[#111317] border border-gray-600 rounded p-1 mt-1 text-white" value={config.smartFixer?.strategy || 'sequential'} onChange={e => dispatch({type:'UPDATE_CONFIG', payload:{smartFixer: {...(config.smartFixer||{}), strategy: e.target.value}}})}>
                       <option value="sequential">Strict Sequential</option>
                       <option value="spatial">Spatial Topology</option>
                    </select>
                 </label>
              </div>
            </div>

            <div className="bg-[#242830] p-4 rounded border border-gray-700">
              <h2 className="font-bold mb-4 text-[#0077B6]">▼ FUZZY MATCH SETTINGS</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <label className="flex flex-col">Threshold <input type="number" step="0.05" className="bg-[#111317] border border-gray-600 rounded p-1 mt-1" value={config.fuzzyThreshold} onChange={e => dispatch({type:'UPDATE_CONFIG', payload:{fuzzyThreshold: parseFloat(e.target.value)}})}/></label>
                 <label className="flex items-center gap-2 mt-6"><input type="checkbox" checked={config.fuzzyEnablePass2} onChange={e => dispatch({type:'UPDATE_CONFIG', payload:{fuzzyEnablePass2: e.target.checked}})} className="rounded" /> Enable Pass 2 (substring)</label>
                 <label className="flex items-center gap-2 mt-6"><input type="checkbox" checked={config.fuzzyEnablePass3} onChange={e => dispatch({type:'UPDATE_CONFIG', payload:{fuzzyEnablePass3: e.target.checked}})} className="rounded" /> Enable Pass 3 (similarity)</label>
              </div>
            </div>

            <div className="bg-[#242830] p-4 rounded border border-gray-700">
              <h2 className="font-bold mb-4 text-[#0077B6]">▼ BRLEN DATABASE — EQUAL TEE (ASME B16.9)</h2>
              <div className="max-h-64 overflow-y-auto border border-gray-700">
                <table className="w-full text-center bg-[#1A1D23] text-sm">
                  <thead className="bg-[#111317] sticky top-0"><tr><th className="p-2">NPS</th><th className="p-2">Bore</th><th className="p-2">OD</th><th className="p-2">C</th><th className="p-2 text-blue-400">M (BRLEN)</th></tr></thead>
                  <tbody>
                     {config.brlenEqualTee.map((r,i) => (
                        <tr key={i} className="border-b border-gray-800 hover:bg-[#2A2E37]">
                           <td className="p-1">{r.nps}</td><td className="p-1">{r.bore}</td><td className="p-1">{r.od}</td>
                           <td className="p-1">{r.C}</td><td className="p-1 font-bold text-blue-300">{r.M}</td>
                        </tr>
                     ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'debug' && (
          <div className="h-full flex flex-col p-4 gap-4 overflow-auto">
             <div className="bg-[#111317] border border-gray-700 p-2 rounded flex items-center gap-2">
               <span className="text-gray-400 font-bold mr-2">FILTER:</span>
               {["All", "Error", "Warning", "Calculated", "Mock", "Info"].map(f => (
                  <label key={f} className="flex items-center gap-1 cursor-pointer hover:text-white">
                    <input type="radio" name="logfilter" checked={logFilter === f} onChange={() => dispatch({type: 'SET_LOG_FILTER', payload: f})} className="text-[#0077B6] bg-gray-800" />
                    {f}
                  </label>
               ))}
             </div>
             {state.smartFix.chainSummary && (
               <div className="bg-[#242830] p-3 rounded border border-gray-700 mb-2 shadow-sm text-sm">
                 <h4 className="font-bold text-[#0077B6] mb-2 border-b border-gray-700 pb-1">Smart Fix Summary</h4>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div>
                     <div className="text-gray-400 text-xs">Chains found</div>
                     <div className="font-mono">{state.smartFix.chainSummary.chainCount}</div>
                   </div>
                   <div>
                     <div className="text-gray-400 text-xs">Elements walked</div>
                     <div className="font-mono">{state.smartFix.chainSummary.elementsWalked}</div>
                   </div>
                   <div>
                     <div className="text-gray-400 text-xs">Orphan elements</div>
                     <div className="font-mono">{state.smartFix.chainSummary.orphanCount}</div>
                   </div>
                   <div>
                     <div className="text-gray-400 text-xs">Rows with proposed fixes</div>
                     <div className="font-mono font-bold">{state.smartFix.chainSummary.rowsWithActions}</div>
                   </div>
                 </div>
                 <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-700 text-xs">
                    <div className="text-[#28A745]">Tier 1 (auto-silent): <b>{state.smartFix.chainSummary.tier1}</b></div>
                    <div className="text-[#FFC107]">Tier 2 (auto-logged): <b>{state.smartFix.chainSummary.tier2}</b></div>
                    <div className="text-[#FD7E14]">Tier 3 (warnings): <b>{state.smartFix.chainSummary.tier3}</b></div>
                    <div className="text-[#DC3545]">Tier 4 (errors): <b>{state.smartFix.chainSummary.tier4}</b></div>
                 </div>
               </div>
             )}

             <div className="flex-1 bg-[#242830] rounded border border-gray-700 overflow-auto min-h-[300px]">
               <div className="p-2 border-b border-gray-700 sticky top-0 bg-[#242830] font-bold text-gray-400 text-xs flex gap-2">
                 <span>LOG TABLE</span>
               </div>
               <table className="w-full text-left border-collapse">
                  <thead className="bg-[#1A1D23] sticky top-8 text-xs text-gray-400 border-b border-gray-700">
                    <tr><th className="p-2">Row</th><th className="p-2">Tag</th><th className="p-2">Message</th></tr>
                  </thead>
                  <tbody>
                    {log.filter(l => logFilter === "All" || l.type === logFilter).map((l, i) => (
                      <tr key={i} className="border-b border-gray-800 hover:bg-[#2A2E37]">
                        <td className="p-2 w-16 text-center text-gray-500">Row {l.row}</td>
                        <td className="p-2 w-24">
                          <span className={`px-2 py-0.5 rounded text-xs text-white ${
                            l.type === 'Error' ? 'bg-[#DC3545]' :
                            l.type === 'Warning' ? 'bg-[#FD7E14]' :
                            l.type === 'Calculated' ? 'bg-[#0D6EFD]' :
                            l.type === 'Mock' ? 'bg-[#E91E63]' : 'bg-[#6C757D]'
                          }`}>{l.type}</span>
                        </td>
                        <td className="p-2 text-gray-300 font-mono text-xs">{l.message}</td>
                      </tr>
                    ))}
                    {log.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-gray-600">No logs yet. Run the validator.</td></tr>}
                  </tbody>
               </table>
             </div>

             <div className="bg-[#242830] rounded border border-gray-700 h-64 overflow-auto">
               <div className="p-2 border-b border-gray-700 sticky top-0 bg-[#242830] font-bold text-gray-400 text-xs">
                 <span>TALLY TABLE</span>
               </div>
               <table className="w-full text-left text-sm">
                  <thead className="bg-[#1A1D23]">
                    <tr><th className="p-2">Metric</th><th className="p-2">Imported</th><th className="p-2">Processed</th></tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-800">
                       <td className="p-2 text-gray-300">Total Lines</td>
                       <td className="p-2">{tally.imported.lines || '-'}</td><td className="p-2">{tally.processed.lines || '-'}</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                       <td className="p-2 text-gray-300">Total Characters</td>
                       <td className="p-2">{tally.imported.chars || '-'}</td><td className="p-2">{tally.processed.chars || '-'}</td>
                    </tr>
                    {["PIPE", "FLANGE", "VALVE", "TEE", "BEND", "OLET", "REDUCER-CONCENTRIC", "REDUCER-ECCENTRIC", "SUPPORT"].map(t => (
                      <React.Fragment key={t}>
                        <tr className="border-b border-gray-800">
                           <td className="p-2 text-gray-300">{t} (count)</td>
                           <td className="p-2">{tally.imported.components?.[t]?.count ?? '-'}</td>
                           <td className="p-2">{tally.processed.components?.[t]?.count ?? '-'}</td>
                        </tr>
                        {t === "PIPE" && (
                           <tr className="border-b border-gray-800">
                             <td className="p-2 text-gray-300">PIPE (total len)</td>
                             <td className="p-2">{tally.imported.components?.[t]?.totalLength ? Math.round(tally.imported.components[t].totalLength) + ' mm' : '-'}</td>
                             <td className="p-2">{tally.processed.components?.[t]?.totalLength ? Math.round(tally.processed.components[t].totalLength) + ' mm' : '-'}</td>
                           </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
               </table>
             </div>
          </div>
        )}

        {activeTab === 'output' && (
          <div className="h-full bg-[#1A1D23] p-4 relative font-mono text-sm overflow-auto">
            <button onClick={exportPcf} className="absolute top-6 right-6 bg-[#0077B6] hover:bg-blue-600 text-white px-3 py-1.5 rounded flex items-center gap-2 text-xs">
               <Copy className="w-3 h-3"/> Copy to Clipboard
            </button>
            <div className="text-gray-300 whitespace-pre-wrap">
              {!finalPcf ? "// Run the validator to generate output." : finalPcf.split('\n').map((line, i) => {
                let color = "text-gray-300";
                const tl = line.trim();
                if (DEFAULT_CONFIG.typeMapping[tl]) color = "text-blue-400 font-bold";
                else if (tl.startsWith("MESSAGE-SQUARE")) color = "text-green-400 font-bold";
                else if (["END-POINT", "CENTRE-POINT", "BRANCH1-POINT", "CO-ORDS"].some(k => tl.startsWith(k))) color = "text-teal-400";
                else if (tl.startsWith("<SKEY>") || tl.startsWith("<SUPPORT")) color = "text-purple-400";
                else if (tl.startsWith("COMPONENT-ATTRIBUTE")) color = "text-gray-500";
                else if (["ISOGEN-FILES", "UNITS", "PIPELINE-REFERENCE", "PROJECT-IDENTIFIER", "AREA"].some(k => tl.startsWith(k))) color = "text-gray-500 italic";

                // Optional: Highlight numbers in orange. Simplistic approach: wrap digits in spans (might be overkill for performance on huge files, but works well for UI scale)
                const tokens = line.split(/(\s+)/).map((t, idx) => {
                  if (/^-?\d+\.?\d*$/.test(t)) return <span key={idx} className="text-orange-400">{t}</span>;
                  return t;
                });
                return <div key={i} className={color}>{tokens}</div>;
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#111317] border-t border-gray-800 text-xs">
        <div className="text-gray-400">{status}</div>
        <div className="flex items-center gap-3">
          <button onClick={exportExcel} disabled={dataTable.length === 0} className="disabled:opacity-50 text-gray-300 hover:text-white flex items-center gap-1 transition-colors">
            <Download className="w-4 h-4" /> Export Data Table
          </button>
          <button onClick={exportPcf} disabled={!finalPcf} className="disabled:opacity-50 text-gray-300 hover:text-white flex items-center gap-1 transition-colors">
            <Download className="w-4 h-4" /> Export PCF
          </button>
          <button onClick={runBasicFixer} disabled={dataTable.length === 0} className="disabled:opacity-50 text-gray-300 hover:text-white px-3 py-1.5 rounded flex items-center gap-2 font-bold transition-colors">
            <Play className="w-4 h-4 fill-current" /> Run Validator
          </button>
          <button
            onClick={handleSmartFix}
            disabled={dataTable.length === 0 || state.smartFix.status === "running"}
            className="disabled:opacity-50 bg-[#0077B6] hover:bg-blue-600 text-white px-3 py-1.5 rounded flex items-center gap-2 font-bold transition-colors"
          >
            {state.smartFix.status === "running" ? "Analyzing..." : "Smart Fix 🔧"}
          </button>
          <button
            onClick={handleApplyFixes}
            disabled={state.smartFix.status !== "previewing"}
            className="disabled:opacity-50 bg-[#28A745] hover:bg-green-600 text-white px-3 py-1.5 rounded flex items-center gap-2 font-bold transition-colors"
          >
            {state.smartFix.status === "applying" ? "Applying..." : "Apply Fixes ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}
