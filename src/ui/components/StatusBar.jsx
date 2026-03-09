import React from 'react';
import { useAppContext } from '../../store/AppContext';
import { runSmartFix } from '../../engine/Orchestrator';
import { applyFixes } from '../../engine/FixApplicator';
import { createLogger } from '../../utils/Logger';
import { exportToExcel, generatePCFText } from '../../utils/ImportExport';
import { runValidationChecklist } from '../../engine/Validator';
import { runDataProcessor } from '../../engine/DataProcessor';

export function StatusBar() {
  const { state, dispatch } = useAppContext();

  const handleSmartFix = () => {
    dispatch({ type: "SET_SMART_FIX_STATUS", status: "running" });
    const logger = createLogger();
    const result = runSmartFix(state.dataTable, state.config, logger);

    // Save logs to state
    logger.getLog().forEach(entry => dispatch({ type: "ADD_LOG", payload: entry }));

    dispatch({ type: "SMART_FIX_COMPLETE", payload: result });
  };

  const handleApplyFixes = () => {
    dispatch({ type: "SET_SMART_FIX_STATUS", status: "applying" });
    const logger = createLogger();
    const result = applyFixes(state.dataTable, state.smartFix.chains, state.config, logger);

    logger.getLog().forEach(entry => dispatch({ type: "ADD_LOG", payload: entry }));

    dispatch({ type: "FIXES_APPLIED", payload: result });
  };

  const isDataLoaded = state.dataTable.length > 0;
  const isPreviewing = state.smartFix.status === "previewing";
  const isRunning = state.smartFix.status === "running";
  const isApplying = state.smartFix.status === "applying";

  const handleExportExcel = async () => {
    try {
      await exportToExcel(state.dataTable);
      dispatch({ type: "ADD_LOG", payload: { type: "Info", message: "Exported Data Table to Excel." }});
    } catch (err) {
      alert("Error exporting Excel: " + err.message);
    }
  };

  const handleExportPCF = () => {
    const text = generatePCFText(state.dataTable, state.config);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.pcf';
    a.click();
    window.URL.revokeObjectURL(url);
    dispatch({ type: "ADD_LOG", payload: { type: "Info", message: "Exported PCF file." }});
  };

  const d = new Date();
  const verString = `Ver ${d.getDate().toString().padStart(2, '0')}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getFullYear()} (1)`;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-12 bg-slate-800 text-white flex items-center justify-between px-4 text-sm z-50">
      <div className="flex items-center space-x-4">
        <span className="text-slate-300">Ready</span>
        <button onClick={handleExportExcel} disabled={!isDataLoaded} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50">
          Export Data Table ↓
        </button>
        <button onClick={handleExportPCF} disabled={!isDataLoaded} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50">
          Export PCF ↓
        </button>
        <button
          onClick={() => {
            const logger = createLogger();
            const processedTable = runDataProcessor(state.dataTable, state.config, logger);
            runValidationChecklist(processedTable, state.config, logger);
            logger.getLog().forEach(entry => dispatch({ type: "ADD_LOG", payload: entry }));

            logger.getLog().forEach(entry => {
              if (entry.row && entry.tier) {
                const row = processedTable.find(r => r._rowIndex === entry.row);
                if (row && !row.fixingAction) {
                  row.fixingAction = entry.message;
                  row.fixingActionTier = entry.tier;
                  row.fixingActionRuleId = entry.ruleId;
                }
              }
            });
            dispatch({ type: "SET_DATA_TABLE", payload: processedTable });

            alert("Processing & Validation complete! Check Debug tab and Data Table for results.");
          }}
          disabled={!isDataLoaded}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50"
        >
          Run Validator ▶
        </button>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={handleSmartFix}
          disabled={!isDataLoaded || isRunning}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded font-medium disabled:opacity-50 transition-colors"
        >
          {isRunning ? "Analyzing..." : "Smart Fix 🔧"}
        </button>

        <button
          onClick={handleApplyFixes}
          disabled={!isPreviewing || isApplying}
          className="px-4 py-1.5 bg-green-600 hover:bg-green-500 rounded font-medium disabled:opacity-50 transition-colors"
        >
          {isApplying ? "Applying..." : "Apply Fixes ✓"}
        </button>

        <span className="text-slate-400 font-mono text-xs">{verString}</span>
      </div>
    </div>
  );
}
