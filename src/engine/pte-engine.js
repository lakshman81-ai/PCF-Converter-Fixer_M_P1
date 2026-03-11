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

export function sweepForNeighbor(element, dataTable, config) {
    const radiusMin = (config.pteMode?.sweepRadiusMinMultiplier ?? 0.2) * (element.bore || 100);
    const radiusMax = config.pteMode?.sweepRadiusMax ?? 13000;
    const ratioMin = config.pteMode?.boreRatioMin ?? 0.7;
    const ratioMax = config.pteMode?.boreRatioMax ?? 1.5;

    let best = null;
    let minScore = Infinity;

    const elemPt = getExitPoint(element) || getEntryPoint(element);
    if (!elemPt) return null;

    for (const other of dataTable) {
        if (other._rowIndex === element._rowIndex) continue;

        // Line_Key constraint
        if (element._pteMode === 'D(a)' && element._lineKey !== other._lineKey) continue;

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
