import { vec } from '../../math/VectorMath.js';

export function runBrnRules(element, context, prevElement, elemAxis, elemDir, config, log) {
  const type = (element.type || "").toUpperCase();
  const cfg = config.smartFixer || {};
  const ri = element._rowIndex;

  // R-BRN-01: Branch bore > header bore (for TEE)
  if (type === "TEE" && element.branchBore > element.bore) {
    log.push({ type: "Error", ruleId: "R-BRN-01", tier: 4, row: ri,
      message: `ERROR [R-BRN-01]: Branch bore (${element.branchBore}) > header bore (${element.bore}).` });
  }

  // R-BRN-04: Branch perpendicularity (for TEE)
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
      const errorThresh = Number(cfg.branchPerpendicularityError ?? 15.0);
      const warnThresh = Number(cfg.branchPerpendicularityWarn ?? 5.0);

      if (offPerp > errorThresh) {
        log.push({ type: "Error", ruleId: "R-BRN-04", tier: 4, row: ri,
          message: `ERROR [R-BRN-04]: Branch ${offPerp.toFixed(1)}° from perpendicular.` });
      } else if (offPerp > warnThresh) {
        log.push({ type: "Warning", ruleId: "R-BRN-04", tier: 3, row: ri,
          message: `WARNING [R-BRN-04]: Branch ${offPerp.toFixed(1)}° from perpendicular.` });
      }
    }
  }
}
