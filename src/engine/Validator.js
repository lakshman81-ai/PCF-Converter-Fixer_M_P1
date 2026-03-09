import { vec } from '../math/VectorMath.js';

export function runValidationChecklist(dataTable, config, logger) {
  logger.push({ type: "Info", message: "═══ RUNNING V1-V20 VALIDATION CHECKLIST ═══" });

  let errorCount = 0;
  let warnCount = 0;

  for (const row of dataTable) {
    const type = (row.type || "").toUpperCase();
    const ri = row._rowIndex;

    if (type === "UNKNOWN" || !type) continue;

    // V1: No (0,0,0) coords
    const checkV1 = (pt, name) => {
      if (pt && vec.isZero(pt)) {
        logger.push({ type: "Error", ruleId: "V1", tier: 4, row: ri, message: `ERROR [V1]: ${name} coordinate is exactly (0,0,0).` });
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
        logger.push({ type: "Error", ruleId: "V4", tier: 4, row: ri, message: "ERROR [V4]: BEND CP equals EP1." });
        errorCount++;
      }
      if (row.cp && row.ep2 && vec.approxEqual(row.cp, row.ep2, 0.1)) {
        logger.push({ type: "Error", ruleId: "V5", tier: 4, row: ri, message: "ERROR [V5]: BEND CP equals EP2." });
        errorCount++;
      }
      if (row.cp && row.ep1 && row.ep2) {
        const v1 = vec.sub(row.ep1, row.cp);
        const v2 = vec.sub(row.ep2, row.cp);
        if (vec.mag(vec.cross(v1, v2)) < 0.001) {
          logger.push({ type: "Error", ruleId: "V6", tier: 4, row: ri, message: "ERROR [V6]: BEND CP is collinear with EPs." });
          errorCount++;
        }
        const r1 = vec.dist(row.cp, row.ep1);
        const r2 = vec.dist(row.cp, row.ep2);
        if (Math.abs(r1 - r2) > 1.0) {
          logger.push({ type: "Warning", ruleId: "V7", tier: 3, row: ri, message: `WARNING [V7]: BEND not equidistant. R1=${r1.toFixed(1)}, R2=${r2.toFixed(1)}.` });
          warnCount++;
        }
      }
    }

    // V8, V9, V10: TEE checks
    if (type === "TEE") {
      if (row.cp && row.ep1 && row.ep2) {
        const mid = vec.mid(row.ep1, row.ep2);
        if (!vec.approxEqual(row.cp, mid, 1.0)) {
          logger.push({ type: "Error", ruleId: "V8", tier: 4, row: ri, message: "ERROR [V8]: TEE CP is not at midpoint of EP1-EP2." });
          errorCount++;
        }
      }
      if (row.bp && row.cp && row.ep1 && row.ep2) {
        const branchVec = vec.sub(row.bp, row.cp);
        const headerVec = vec.sub(row.ep2, row.ep1);
        const dotProd = Math.abs(vec.dot(branchVec, headerVec));
        const threshold = 0.01 * vec.mag(branchVec) * vec.mag(headerVec);
        if (dotProd > threshold) {
          logger.push({ type: "Warning", ruleId: "V10", tier: 3, row: ri, message: "WARNING [V10]: TEE Branch is not perpendicular to header." });
          warnCount++;
        }
      }
    }

    // V11: OLET checks
    if (type === "OLET") {
      if (row.ep1 || row.ep2) {
        logger.push({ type: "Error", ruleId: "V11", tier: 4, row: ri, message: "ERROR [V11]: OLET must not have END-POINTs." });
        errorCount++;
      }
    }

    // V14: SKEY Presence
    const skeyRequired = ["FLANGE", "VALVE", "BEND", "TEE", "OLET", "REDUCER-CONCENTRIC", "REDUCER-ECCENTRIC"];
    if (skeyRequired.includes(type) && !row.skey) {
      logger.push({ type: "Warning", ruleId: "V14", tier: 3, row: ri, message: `WARNING [V14]: Missing <SKEY> for ${type}.` });
      warnCount++;
    }

    // V18: Bore Unit
    if (row.bore > 0 && row.bore <= 48) {
      const standardMm = [15, 20, 25, 32, 40, 50, 65, 80, 90, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 750, 900, 1050, 1200];
      if (!standardMm.includes(row.bore)) {
        logger.push({ type: "Warning", ruleId: "V18", tier: 3, row: ri, message: `WARNING [V18]: Bore ${row.bore} may be in inches. Ensure all values are MM.` });
        warnCount++;
      }
    }
  }

  logger.push({ type: "Info", message: `═══ VALIDATION COMPLETE: ${errorCount} Errors, ${warnCount} Warnings ═══` });

  return { errorCount, warnCount };
}
