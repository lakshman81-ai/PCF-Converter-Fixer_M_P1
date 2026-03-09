import { z } from "zod";

// Schema for a 3D Coordinate
export const CoordSchema = z.object({
  x: z.number().catch(0),
  y: z.number().catch(0),
  z: z.number().catch(0),
}).nullable();

// Schema for a Component Data Row
export const ComponentRowSchema = z.object({
  _rowIndex: z.number(),
  _modified: z.record(z.string()).optional(),
  _logTags: z.array(z.string()).optional(),

  csvSeqNo: z.union([z.string(), z.number()]).optional().catch(""),
  type: z.string().toUpperCase().catch("UNKNOWN"),
  text: z.string().optional().catch(""),
  pipelineRef: z.string().optional().catch(""),
  refNo: z.string().optional().catch(""),

  bore: z.number().catch(0),
  branchBore: z.number().nullable().optional().catch(null),

  ep1: CoordSchema.optional().catch(null),
  ep2: CoordSchema.optional().catch(null),
  cp: CoordSchema.optional().catch(null),
  bp: CoordSchema.optional().catch(null),
  supportCoor: CoordSchema.optional().catch(null),

  skey: z.string().optional().catch(""),
  supportName: z.string().optional().catch(""),
  supportGuid: z.string().optional().catch(""),

  ca: z.record(z.union([z.string(), z.number(), z.null()])).optional().catch({}),

  fixingAction: z.string().nullable().optional().catch(null),
  fixingActionTier: z.number().nullable().optional().catch(null),
  fixingActionRuleId: z.string().nullable().optional().catch(null),

  // Derived columns
  len1: z.number().nullable().optional(),
  axis1: z.string().nullable().optional(),
  len2: z.number().nullable().optional(),
  axis2: z.string().nullable().optional(),
  len3: z.number().nullable().optional(),
  axis3: z.string().nullable().optional(),
  brlen: z.number().nullable().optional(),
  deltaX: z.number().nullable().optional(),
  deltaY: z.number().nullable().optional(),
  deltaZ: z.number().nullable().optional(),
});

// Schema for Walk Context
export const WalkContextSchema = z.object({
  travelAxis: z.enum(["X", "Y", "Z"]).nullable(),
  travelDirection: z.union([z.literal(1), z.literal(-1)]).nullable(),
  currentBore: z.number(),
  currentMaterial: z.string(),
  currentPressure: z.string(),
  currentTemp: z.string(),
  chainId: z.string(),
  cumulativeVector: CoordSchema,
  pipeLengthSum: z.number(),
  lastFittingType: z.string().nullable(),
  elevation: z.number(),
  depth: z.number(),
  pipeSinceLastBend: z.number(),
});

// Schema for Config
export const ConfigSchema = z.object({
  decimals: z.union([z.literal(1), z.literal(4)]).default(4),
  angleFormat: z.enum(["degrees", "hundredths"]).default("degrees"),
  smartFixer: z.object({
    connectionTolerance: z.number().default(25.0),
    gridSnapResolution: z.number().default(1.0),
    microPipeThreshold: z.number().default(6.0),
    microFittingThreshold: z.number().default(1.0),
    negligibleGap: z.number().default(1.0),
    autoFillMaxGap: z.number().default(25.0),
    reviewGapMax: z.number().default(100.0),
    autoTrimMaxOverlap: z.number().default(25.0),
    silentSnapThreshold: z.number().default(2.0),
    warnSnapThreshold: z.number().default(10.0),
    autoDeleteFoldbackMax: z.number().default(25.0),
    offAxisThreshold: z.number().default(0.5),
    diagonalMinorThreshold: z.number().default(2.0),
    fittingDimensionTolerance: z.number().default(0.20),
    bendRadiusTolerance: z.number().default(0.05),
    minTangentMultiplier: z.number().default(1.0),
    closureWarningThreshold: z.number().default(5.0),
    closureErrorThreshold: z.number().default(50.0),
    maxBoreForInchDetection: z.number().default(48),
    oletMaxRatioWarning: z.number().default(0.5),
    oletMaxRatioError: z.number().default(0.8),
    branchPerpendicularityWarn: z.number().default(5.0),
    branchPerpendicularityError: z.number().default(15.0),
    horizontalElevationDrift: z.number().default(2.0),
    minPipeRatio: z.number().default(0.10),
    noSupportAlertLength: z.number().default(10000.0),
  }).default({}),
  pipe_OD: z.record(z.number()).default({}), // Mock catalog for OD
  catalog_dimensions: z.record(z.any()).default({}), // Mock catalog for lengths
  valve_ftf: z.record(z.any()).default({}), // Mock catalog
  tee_C_dimension: z.record(z.number()).default({}), // Mock catalog
});

// Safe parse helper
export const validateInputRows = (rows) => {
  return rows.map((r, i) => {
    const parsed = ComponentRowSchema.safeParse(r);
    if (!parsed.success) {
      console.warn(`Row ${i} failed validation:`, parsed.error);
      return { ...r, _validationError: true }; // Return best effort or handle error
    }
    return parsed.data;
  });
};
