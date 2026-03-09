import { buildConnectivityGraph } from './GraphBuilder.js';
import { walkAllChains } from './Walker.js';
import { populateFixingActions } from './ActionDescriptor.js';

export function runSmartFix(dataTable, config, logger) {
  logger.push({ type: "Info", message: "═══ SMART FIX: Starting chain walker ═══" });

  logger.push({ type: "Info", message: "Step 4A: Building connectivity graph..." });
  const graph = buildConnectivityGraph(dataTable, config);
  logger.push({ type: "Info",
    message: `Graph: ${graph.components.length} components, ${graph.terminals.length} terminals, ${graph.edges.size} connections.` });

  logger.push({ type: "Info", message: "Step 4B: Walking element chains..." });
  const { chains, orphans } = walkAllChains(graph, config, logger.getLog());
  const totalElements = chains.reduce((s, c) => s + c.length, 0);
  logger.push({ type: "Info",
    message: `Walked ${chains.length} chains, ${totalElements} elements, ${orphans.length} orphans.` });

  const tierCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const entry of logger.getLog()) {
    if (entry.tier) tierCounts[entry.tier]++;
  }
  logger.push({ type: "Info",
    message: `Rules complete: Tier1=${tierCounts[1]}, Tier2=${tierCounts[2]}, Tier3=${tierCounts[3]}, Tier4=${tierCounts[4]}` });

  logger.push({ type: "Info", message: "Step 4D: Populating Fixing Action previews..." });
  populateFixingActions(dataTable, chains, logger.getLog());

  const actionCount = dataTable.filter(r => r.fixingAction).length;
  logger.push({ type: "Info",
    message: `═══ SMART FIX COMPLETE: ${actionCount} rows have proposed fixes. Review in Data Table. ═══` });

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
