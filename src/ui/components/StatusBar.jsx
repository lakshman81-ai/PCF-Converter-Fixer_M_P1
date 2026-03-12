import React from 'react';
import { useAppContext } from '../../store/AppContext';
import { runSmartFix } from '../../engine/Orchestrator';
import { applyFixes } from '../../engine/FixApplicator';
import { createLogger } from '../../utils/Logger';
import { exportToExcel, generatePCFText } from '../../utils/ImportExport';
import { runValidationChecklist } from '../../engine/Validator';
import { runDataProcessor } from '../../engine/DataProcessor';

import { PcfTopologyGraph2, applyApprovedMutations } from '../../engine/PcfTopologyGraph2';

export function StatusBar() {
  const [showModal, setShowModal] = React.useState(false);
  const [runGroup, setRunGroup] = React.useState('group1');
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
  const passNum = state.smartFix.pass || 1;
  const isSecondPassReady = state.smartFix.status === "applied" && state.config.pteMode?.autoMultiPassMode;

  const handleSecondPass = () => {
    dispatch({ type: "SET_SMART_FIX_STATUS", status: "running" });
    const logger = createLogger();
    // Simulate second pass triggering by modifying state temporarily or just calling smart fix again with pass 2 context
    const result = runSmartFix(state.dataTable, { ...state.config, currentPass: 2 }, logger);
    logger.getLog().forEach(entry => dispatch({ type: "ADD_LOG", payload: entry }));
    dispatch({ type: "SMART_FIX_COMPLETE", payload: { ...result, pass: 2 } });
  };

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

  const handleExecute = () => {
      setShowModal(false);
      const logger = createLogger();
      let processedTable = runDataProcessor(state.dataTable, state.config, logger);
      runValidationChecklist(processedTable, state.config, logger);

      if (runGroup === 'group2') {
          // Pass data table through PcfTopologyGraph_2
          const { proposals } = PcfTopologyGraph2(processedTable, state.config, logger);
          // Auto-apply logic or just attach them for the UI
          processedTable = applyApprovedMutations(processedTable, proposals, logger);
      }

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
  };

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white p-6 rounded-lg shadow-xl w-[500px] text-slate-800">
            <h2 className="text-xl font-bold mb-4">Select Validation Engine</h2>

            <div className="space-y-4 mb-6">
              <label className="flex items-start space-x-3 p-3 border rounded hover:bg-slate-50 cursor-pointer">
                <input type="radio" name="engineGroup" value="group1" checked={runGroup === 'group1'} onChange={() => setRunGroup('group1')} className="mt-1" />
                <div>
                  <div className="font-semibold">Group (1): Original Smart Fixer</div>
                  <div className="text-sm text-slate-500">Standard First Pass and Second Pass logic tracking components and applying rules.</div>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-3 border rounded hover:bg-slate-50 cursor-pointer">
                <input type="radio" name="engineGroup" value="group2" checked={runGroup === 'group2'} onChange={() => setRunGroup('group2')} className="mt-1" />
                <div>
                  <div className="font-semibold">Group (2): PcfTopologyGraph_2</div>
                  <div className="text-sm text-slate-500">3-Pass System: Sequential Tracing, Global Sweep (Major Axis), Global Fuzzy Search. Includes Immutable Translations and Pipe Injection.</div>
                </div>
              </label>
            </div>

            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded hover:bg-slate-100 text-slate-700">Cancel</button>
              <button onClick={handleExecute} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">Run Engine</button>
            </div>
          </div>
        </div>
      )}

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

            // intercept to show modal instead
            setShowModal(true);
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
          className="px-4 py-1.5 bg-green-600 hover:bg-green-500 rounded font-medium disabled:opacity-50 transition-colors mr-2"
        >
          {isApplying ? "Applying..." : "Apply Fixes ✓"}
        </button>

        <button
          onClick={handleSecondPass}
          disabled={!isSecondPassReady}
          className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 rounded font-medium disabled:opacity-50 transition-colors"
          title="Run Second Pass on Non-Pipe components"
        >
          🚀 Run Second Pass
        </button>

        <span className="text-slate-400 font-mono text-xs">{verString}</span>
      </div>
    </div>
    </>
  );
}
