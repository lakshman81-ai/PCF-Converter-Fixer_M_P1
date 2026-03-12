import { vec } from '../math/VectorMath.js';
import { getEntryPoint, getExitPoint } from './GraphBuilder.js';
import { getElementVector } from './AxisDetector.js';

export function runPTEEngine(dataTable, config, logger) {
    const pteMode = config.pteMode || { autoMultiPassMode: true, sequentialMode: true, lineKeyMode: true, lineKeyColumn: 'pipelineRef' };
    logger.push({ type: "Info", message: "═══ RUNNING PTE ENGINE ═══" });

    const enrichRowWithLineKey = (row) => {
        let keyVal = null;
        if (pteMode.lineKeyColumn === 'pipelineRef') keyVal = row.pipelineRef;
        else if (pteMode.lineKeyColumn === 'text') keyVal = row.text;
        else if (pteMode.lineKeyColumn === 'ca97') keyVal = row.ca?.[97];
        else if (pteMode.lineKeyColumn === 'ca98') keyVal = row.ca?.[98];

        if (keyVal && typeof keyVal === 'string' && keyVal.trim() !== '') {
            row._lineKey = keyVal.trim();
            row._pteMode = 'B(a)'; // Sequential + Line_Key
        } else {
            row._lineKey = null;
            row._pteMode = 'B(b)'; // Sequential + No Line_Key
        }

        if (!pteMode.lineKeyMode) {
             row._lineKey = null;
             row._pteMode = 'B(b)';
        }

        return row;
    };

    let processedTable = dataTable.map(enrichRowWithLineKey);

    if (!pteMode.sequentialMode) {
         processedTable = processedTable.map(row => {
             row._pteMode = row._lineKey ? 'D(a)' : 'D(b)';
             return row;
         });
    }

    return processedTable;
}

export function sweepForNeighbor(element, kdTreeOrArray, config) {
    // If it's a KDTree, we use findNearest as a fast path.
    // In a real implementation, KDTree.findNearest could be extended to return all points in a radius
    // to apply the specific score weighting. For this architectural update, we'll leverage the O(log N)
    // nearest search directly, drastically dropping O(N^2) complexity.

    const elemPt = getExitPoint(element) || getEntryPoint(element);
    if (!elemPt) return null;
    const radiusMax = config.pteMode?.sweepRadiusMax ?? 13000;

    if (kdTreeOrArray && typeof kdTreeOrArray.findNearest === 'function') {
        const bestMatch = kdTreeOrArray.findNearest(elemPt, radiusMax, element._rowIndex);

        if (bestMatch) {
            // Re-apply basic constraints
            const ratioMin = config.pteMode?.boreRatioMin ?? 0.7;
            const ratioMax = config.pteMode?.boreRatioMax ?? 1.5;

            if (element._pteMode === 'D(a)' && element._lineKey && bestMatch._lineKey && element._lineKey !== bestMatch._lineKey) return null;
            if (element.bore && bestMatch.bore) {
                const ratio = element.bore / bestMatch.bore;
                if (ratio < ratioMin || ratio > ratioMax) return null;
            }
        }
        return bestMatch;
    }

    // Fallback if raw array is passed
    const dataTable = kdTreeOrArray;
    const radiusMin = (config.pteMode?.sweepRadiusMinMultiplier ?? 0.2) * (element.bore || 100);
    const ratioMin = config.pteMode?.boreRatioMin ?? 0.7;
    const ratioMax = config.pteMode?.boreRatioMax ?? 1.5;

    let best = null;
    let minScore = Infinity;

    for (const other of dataTable) {
        if (other._rowIndex === element._rowIndex) continue;

        // Line_Key constraint (relax if missing on either side)
        if (element._pteMode === 'D(a)' && element._lineKey && other._lineKey && element._lineKey !== other._lineKey) continue;

        // Bore ratio constraint
        if (element.bore && other.bore) {
            const ratio = element.bore / other.bore;
            if (ratio < ratioMin || ratio > ratioMax) continue;
        }

        const otherPt = getEntryPoint(other) || getExitPoint(other);
        if (!otherPt) continue;

        const dist = vec.dist(elemPt, otherPt);

        if (dist >= radiusMin && dist <= radiusMax) {
            // axis_sweep_score based on distance and collinearity
            let score = dist;

            // Check collinearity if both are linear elements
            const ev1 = getElementVector(element);
            const ev2 = getElementVector(other);
            if (!vec.isZero(ev1) && !vec.isZero(ev2)) {
                const norm1 = vec.normalize(ev1);
                const norm2 = vec.normalize(ev2);
                const dot = Math.abs(vec.dot(norm1, norm2));
                // Lower score if highly collinear (closer to 1.0 dot product)
                score -= (dot * 1000);
            }

            if (score < minScore) {
                minScore = score;
                best = other;
            }
        }
    }

    return best;
}
