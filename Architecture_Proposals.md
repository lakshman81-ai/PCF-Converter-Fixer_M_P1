# Architecture Proposals

## 1. Memory & Performance: O(N^2) Optimization

**Problem:**
Currently, spatial searches in `GraphBuilder.js` (`findNearestEntry`) and `pte-engine.js` (`sweepForNeighbor`) operate in an O(N) linear sweep for every element, resulting in an O(N^2) time complexity. For PCF files exceeding 10,000 rows, this will introduce significant UI blocking and runtime lag.

**Proposed Solution:**
Implement a space-partitioning data structure to reduce search complexity from O(N) to O(log N).
- **Octree:** Best for uniform 3D distributions. However, pipe systems often run in long, clustered, linear chains along major axes rather than uniform 3D volumes.
- **k-d Tree (k=3):** Recommended. A k-d tree is highly efficient for nearest-neighbor spatial queries on Cartesian coordinates.
  - **Implementation Strategy:** Before the `GraphBuilder` initiates its link-matching pass, construct a 3D k-d tree containing all valid `getEntryPoint()` and `getExitPoint()` coordinates.
  - **Querying:** When attempting to find the nearest element to an exit point within the `connectionTolerance`, the tree can perform a fast radius search.

## 2. Type Safety & Validation: Strict Payload Casting

**Problem:**
Javascript’s dynamic typing allows implicit coercion (e.g., treating `"150"` as `150`), which can lead to catastrophic spatial math failures (e.g., string concatenation instead of vector addition). The `Zod` library is currently underutilized.

**Proposed Solution:**
Enforce the "Strict Archetypal Casting" doctrine using `Zod` at the immediate entry point of data ingestion (Translation Stage).
- **Schema Definition:** Define explicit `Zod` schemas for `PcfRow`, enforcing strict `z.number()` casts for all coordinates and bores.
- **Transformation Pipeline:**
  ```javascript
  const VectorSchema = z.object({
    x: z.coerce.number(),
    y: z.coerce.number(),
    z: z.coerce.number()
  });

  const PcfElementSchema = z.object({
    type: z.string().toUpperCase(),
    bore: z.coerce.number().optional(),
    ep1: VectorSchema.optional(),
    ep2: VectorSchema.optional()
    // ...
  });
  ```
- **Validation Barrier:** Any row that fails parsing must be logged and either discarded or flagged *before* hitting the V1-V20 validation rules. This guarantees the mathematical engine only ever processes verified floating-point coordinates.