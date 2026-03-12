import { vec } from '../math/VectorMath.js';

export function runValidationChecklist(dataTable, config, logger) {
  logger.push({ stage: "VALIDATION", type: "Info", message: "═══ RUNNING V1-V20 VALIDATION CHECKLIST ═══" });

  let errorCount = 0;
  let warnCount = 0;

  for (const row of dataTable) {
    const type = (row.type || "").toUpperCase();
    const ri = row._rowIndex;

    if (type === "UNKNOWN" || !type) continue;

    // V2: Decimal Consistency
    if (row.bore && row.ep1 && Number.isInteger(row.bore) && (!Number.isInteger(row.ep1.x) || !Number.isInteger(row.ep1.y) || !Number.isInteger(row.ep1.z))) {
        logger.push({ stage: "VALIDATION", type: "Error", ruleId: "V2", tier: 4, row: ri, message: `ERROR [V2]: Decimal consistency violation.` });
        errorCount++;
    }

    // V3: Bore Consistency
    if (type.includes("REDUCER")) {
        if (row.bore === row.branchBore) {
            logger.push({ stage: "VALIDATION", type: "Error", ruleId: "V3", tier: 4, row: ri, message: `ERROR [V3]: REDUCER EP1 bore = EP2 bore. Must differ.` });
            errorCount++;
        }
    } else if (["PIPE", "FLANGE", "VALVE", "BEND", "TEE"].includes(type)) {
        if (row._rowIndex > 1) {
            const prevRow = dataTable.find(r => r._rowIndex === row._rowIndex - 1);
            if (prevRow && !prevRow.type.includes("REDUCER") && prevRow.bore && row.bore && prevRow.bore !== row.bore) {
                 logger.push({ stage: "VALIDATION", type: "Error", ruleId: "V3", tier: 4, row: ri, message: `ERROR [V3]: PIPE bore changes without being reducer.` });
                 errorCount++;
            }
        }
    }

    // V9: TEE CP bore = EP bore
    if (type === "TEE" && row.cpBore !== undefined && row.cpBore !== row.bore) {
        logger.push({ stage: "VALIDATION", type: "Error", ruleId: "V9", tier: 4, row: ri, message: "ERROR [V9]: TEE CP bore != EP bore." });
        errorCount++;
    }

    // V12: SUPPORT No CAs
    if (type === "SUPPORT") {
        let hasCA = false;
        for (const k of Object.keys(row.ca || {})) {
            if (row.ca[k] !== undefined && row.ca[k] !== null && row.ca[k] !== "") hasCA = true;
        }
        if (hasCA) {
            logger.push({ stage: "VALIDATION", type: "Error", ruleId: "V12", tier: 4, row: ri, message: "ERROR [V12]: SUPPORT must not have CAs." });
            errorCount++;
        }

        // V13: SUPPORT bore = 0
        if (row.bore !== 0 && row.bore !== undefined && row.bore !== null && row.bore !== "") {
             logger.push({ stage: "VALIDATION", type: "Error", ruleId: "V13", tier: 4, row: ri, message: "ERROR [V13]: SUPPORT bore must be 0." });
             errorCount++;
        }

        // V19: SUPPORT MSG-SQUARE
        if (row.text && (row.text.includes("LENGTH=") || row.text.includes("MM") || row.text.includes("NORTH") || row.text.includes("SOUTH") || row.text.includes("EAST") || row.text.includes("WEST") || row.text.includes("UP") || row.text.includes("DOWN"))) {
             logger.push({ stage: "VALIDATION", type: "Warning", ruleId: "V19", tier: 3, row: ri, message: "WARNING [V19]: SUPPORT MSG-SQ contains invalid tokens." });
             warnCount++;
        }

        // V20: GUID Prefix
        if (row.supportGuid && !row.supportGuid.startsWith("UCI:")) {
             logger.push({ stage: "VALIDATION", type: "Error", ruleId: "V20", tier: 4, row: ri, message: "ERROR [V20]: SUPPORT GUID must start with UCI:." });
             errorCount++;
        }
    }

    // V16: CA8 Scope
    if (row.ca && row.ca[8]) {
        if (["PIPE", "SUPPORT"].includes(type)) {
            logger.push({ stage: "VALIDATION", type: "Warning", ruleId: "V16", tier: 3, row: ri, message: `WARNING [V16]: CA8 populated for ${type}.` });
            warnCount++;
        }
    }

    // V15: Coordinate Continuity
    if (type !== "SUPPORT" && row._rowIndex > 1) {
        const prevRow = dataTable.find(r => r._rowIndex === row._rowIndex - 1);
        if (prevRow && prevRow.ep2 && row.ep1 && !vec.approxEqual(row.ep1, prevRow.ep2, 1.0)) {
            logger.push({ stage: "VALIDATION", type: "Warning", ruleId: "V15", tier: 3, row: ri, message: "WARNING [V15]: Coordinate discontinuity." });
            warnCount++;
        }
    }


    // V1: No (0,0,0) coords
    const checkV1 = (pt, name) => {
      if (pt && vec.isZero(pt)) {
        logger.push({ stage: "VALIDATION", type: "Error", ruleId: "V1", tier: 4, row: ri, message: `ERROR [V1]: ${name} coordinate is exactly (0,0,0).` });
        errorCount++;
      }
    };
    checkV1(row.ep1, "EP1");
    checkV1(row.ep2, "EP2");
    checkV1(row.cp, "CP");
    checkV1(row.bp, "BP");
    checkV1(row.supportCoor, "CO-ORDS");

    // V4, V5, V6, V7: BEND checks
    if (type === "BEND") {
      if (row.cp && row.ep1 && vec.approxEqual(row.cp, row.ep1, 0.1)) {
        logger.push({ stage: "VALIDATION", type: "Error", ruleId: "V4", tier: 4, row: ri, message: "ERROR [V4]: BEND CP equals EP1." });
        errorCount++;
      }
      if (row.cp && row.ep2 && vec.approxEqual(row.cp, row.ep2, 0.1)) {
        logger.push({ stage: "VALIDATION", type: "Error", ruleId: "V5", tier: 4, row: ri, message: "ERROR [V5]: BEND CP equals EP2." });
        errorCount++;
      }
      if (row.cp && row.ep1 && row.ep2) {
        const v1 = vec.sub(row.ep1, row.cp);
        const v2 = vec.sub(row.ep2, row.cp);
        if (vec.mag(vec.cross(v1, v2)) < 0.001) {
          logger.push({ stage: "VALIDATION", type: "Error", ruleId: "V6", tier: 4, row: ri, message: "ERROR [V6]: BEND CP is collinear with EPs." });
          errorCount++;
        }
        const r1 = vec.dist(row.cp, row.ep1);
        const r2 = vec.dist(row.cp, row.ep2);
        if (Math.abs(r1 - r2) > 1.0) {
          logger.push({ stage: "VALIDATION", type: "Warning", ruleId: "V7", tier: 3, row: ri, message: `WARNING [V7]: BEND not equidistant. R1=${r1.toFixed(1)}, R2=${r2.toFixed(1)}.` });
          warnCount++;
        }
      }
    }

    // V8, V9, V10: TEE checks
    if (type === "TEE") {
      if (row.cp && row.ep1 && row.ep2) {
        const mid = vec.mid(row.ep1, row.ep2);
        if (!vec.approxEqual(row.cp, mid, 1.0)) {
          logger.push({ stage: "VALIDATION", type: "Error", ruleId: "V8", tier: 4, row: ri, message: "ERROR [V8]: TEE CP is not at midpoint of EP1-EP2." });
          errorCount++;
        }
      }
      if (row.bp && row.cp && row.ep1 && row.ep2) {
        const branchVec = vec.sub(row.bp, row.cp);
        const headerVec = vec.sub(row.ep2, row.ep1);
        const dotProd = Math.abs(vec.dot(branchVec, headerVec));
        const threshold = 0.01 * vec.mag(branchVec) * vec.mag(headerVec);
        if (dotProd > threshold) {
          logger.push({ stage: "VALIDATION", type: "Warning", ruleId: "V10", tier: 3, row: ri, message: "WARNING [V10]: TEE Branch is not perpendicular to header." });
          warnCount++;
        }
      }
    }

    // V11: OLET checks
    if (type === "OLET") {
      if (row.ep1 || row.ep2) {
        logger.push({ stage: "VALIDATION", type: "Error", ruleId: "V11", tier: 4, row: ri, message: "ERROR [V11]: OLET must not have END-POINTs." });
        errorCount++;
      }
    }

    // V14: SKEY Presence
    const skeyRequired = ["FLANGE", "VALVE", "BEND", "TEE", "OLET", "REDUCER-CONCENTRIC", "REDUCER-ECCENTRIC"];
    if (skeyRequired.includes(type) && !row.skey) {
      logger.push({ stage: "VALIDATION", type: "Warning", ruleId: "V14", tier: 3, row: ri, message: `WARNING [V14]: Missing <SKEY> for ${type}.` });
      warnCount++;
    }

    // V18: Bore Unit
    if (row.bore > 0 && row.bore <= 48) {
      const standardMm = [15, 20, 25, 32, 40, 50, 65, 80, 90, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 750, 900, 1050, 1200];
      if (!standardMm.includes(row.bore)) {
        logger.push({ stage: "VALIDATION", type: "Warning", ruleId: "V18", tier: 3, row: ri, message: `WARNING [V18]: Bore ${row.bore} may be in inches. Ensure all values are MM.` });
        warnCount++;
      }
    }
  }

  logger.push({ stage: "VALIDATION", type: "Info", message: `═══ VALIDATION COMPLETE: ${errorCount} Errors, ${warnCount} Warnings ═══` });

  return { errorCount, warnCount };
}
