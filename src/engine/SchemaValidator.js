import { z } from 'zod';

// Strict Archetypal Casting for vectors
const VectorSchema = z.object({
  x: z.coerce.number().default(0),
  y: z.coerce.number().default(0),
  z: z.coerce.number().default(0),
});

// Primary validation schema for PCF rows
const PcfElementSchema = z.object({
  _rowIndex: z.number().int(),
  type: z.string().transform((str) => str.toUpperCase()),
  bore: z.coerce.number().optional().nullable(),
  branchBore: z.coerce.number().optional().nullable(),
  cpBore: z.coerce.number().optional().nullable(),
  ep1: VectorSchema.optional().nullable(),
  ep2: VectorSchema.optional().nullable(),
  cp: VectorSchema.optional().nullable(),
  bp: VectorSchema.optional().nullable(),
  supportCoor: VectorSchema.optional().nullable(),
  skey: z.string().optional().nullable(),
  text: z.string().optional().nullable(),
  supportGuid: z.string().optional().nullable(),
  supportName: z.string().optional().nullable(),
  ca: z.record(z.string(), z.any()).optional().nullable(),
  csvSeqNo: z.string().optional().nullable(),
}).passthrough(); // Allow other keys but strictly type the known ones

export function validatePcfData(dataTable, logger) {
  logger.push({ stage: "TRANSLATION", type: "Info", message: "═══ RUNNING ZOD VALIDATION BARRIER ═══" });

  const validatedTable = [];
  let errorCount = 0;

  for (const row of dataTable) {
    const result = PcfElementSchema.safeParse(row);
    if (result.success) {
      validatedTable.push(result.data);
    } else {
      errorCount++;
      const issues = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      logger.push({
        stage: "TRANSLATION",
        type: "Error",
        row: row._rowIndex,
        message: `ERROR [ZOD]: Invalid payload casting. Discarding row. Details: ${issues}`
      });
    }
  }

  logger.push({ stage: "TRANSLATION", type: "Info", message: `Zod Validation Complete: ${validatedTable.length} valid rows, ${errorCount} rejected rows.` });

  return validatedTable;
}
