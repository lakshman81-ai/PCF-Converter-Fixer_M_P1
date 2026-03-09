import { vec } from '../math/VectorMath.js';

export function runDataProcessor(dataTable, config, logger) {
  logger.push({ type: "Info", message: "═══ RUNNING PRE-VALIDATION DATA PROCESSING (STEPS 1-11) ═══" });

  const updatedTable = [...dataTable];
  let seq = 1;
  let bendPtr = 0, rigidPtr = 0, intPtr = 0;
  const stdMm = new Set(config.standardMmBores || [15,20,25,32,40,50,65,80,90,100,125,150,200,250,300,350,400,450,500,600,750,900,1050,1200]);

  let prevEp2 = null;

  for (let i = 0; i < updatedTable.length; i++) {
    const row = { ...updatedTable[i] };
    const t = row.type || "";

    // Step 3: Fill Identifiers
    if (!row.csvSeqNo) { row.csvSeqNo = seq; markModified(row, "csvSeqNo", "Calculated"); }
    if (!row.refNo) { row.refNo = String(row.csvSeqNo); markModified(row, "refNo", "Calculated"); }
    if (!row.ca) row.ca = {};
    if (!row.ca[97]) { row.ca[97] = `=${row.refNo}`; markModified(row, "ca97", "Calculated"); }
    if (!row.ca[98]) { row.ca[98] = row.csvSeqNo; markModified(row, "ca98", "Calculated"); }
    seq++;

    // Step 4: Bore Conversion
    if (row.bore && row.bore <= 48 && !stdMm.has(row.bore)) {
      row.bore = Math.round(row.bore * 25.4 * 10) / 10;
      markModified(row, "bore", "Calculated");
      logger.push({ type: "Warning", row: row._rowIndex, message: `[Step 4] Bore converted from inches to ${row.bore}mm.` });
    }

    // Step 5: Bi-directional coords
    if (t !== "SUPPORT" && t !== "OLET") {
      if (!row.ep1 && prevEp2) { row.ep1 = { ...prevEp2 }; markModified(row, "ep1", "Calculated"); }
      if (row.ep1 && row.ep2) {
        row.deltaX = row.ep2.x - row.ep1.x;
        row.deltaY = row.ep2.y - row.ep1.y;
        row.deltaZ = row.ep2.z - row.ep1.z;
      }
    }

    // Step 6: CP/BP Calculation
    if (t === "TEE") {
      if (!row.cp && row.ep1 && row.ep2) { row.cp = vec.mid(row.ep1, row.ep2); markModified(row, "cp", "Calculated"); }
      if (!row.branchBore) row.branchBore = row.bore;
    }

    // Pointers
    if (t === "BEND") row.bendPtr = ++bendPtr;
    if (t === "FLANGE" || t === "VALVE") row.rigidPtr = ++rigidPtr;
    if (t === "TEE" || t === "OLET") row.intPtr = ++intPtr;

    // Track for next row
    if (row.ep2) prevEp2 = { ...row.ep2 };

    // Step 11: Msg Gen
    const len = row.ep1 && row.ep2 ? Math.round(vec.mag(vec.sub(row.ep2, row.ep1))) : 0;
    row.text = `${t}, LENGTH=${len}MM, RefNo:${row.ca[97]}, SeqNo:${row.ca[98]}`;

    updatedTable[i] = row;
  }

  return updatedTable;
}

function markModified(row, field, reason) {
  if (!row._modified) row._modified = {};
  if (!row._logTags) row._logTags = [];
  row._modified[field] = reason;
  if (!row._logTags.includes(reason)) row._logTags.push(reason);
}
