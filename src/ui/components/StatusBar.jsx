import React from 'react';
import { useAppContext } from '../../store/AppContext';
import { runSmartFix } from '../../engine/Orchestrator';
import { applyFixes } from '../../engine/FixApplicator';
import { createLogger } from '../../utils/Logger';
import { exportToExcel, generatePCFText } from '../../utils/ImportExport';
import { runValidationChecklist } from '../../engine/Validator';
import { runDataProcessor } from '../../engine/DataProcessor';

import { PcfTopologyGraph2, applyApprovedMutations } from '../../engine/PcfTopologyGraph2';
import { useStore } from '../../store/useStore';

export function StatusBar() {
  const [showModal, setShowModal] = React.useState(false);
  const [runGroup, setRunGroup] = React.useState('group1');
  const { state, dispatch } = useAppContext();
  const setZustandData = useStore(state => state.setDataTable);
  const setZustandProposals = useStore(state => state.setProposals);

  React.useEffect(() => {
    const handleManualValidation = () => {
        const logger = createLogger();
        const results = runValidationChecklist(state.stage2Data, state.config, logger);
        logger.getLog().forEach(entry => dispatch({ type: "ADD_LOG", payload: entry }));

        let updatedTable = [...state.stage2Data];
        logger.getLog().forEach(entry => {
          if (entry.row && entry.tier) {
            const row = updatedTable.find(r => r._rowIndex === entry.row);
            if (row) {
               // Preserve existing proposals if any, otherwise set validation message
               if (!row.fixingAction || row.fixingAction.includes('ERROR') || row.fixingAction.includes('WARNING')) {
                  row.fixingAction = entry.message;
                  row.fixingActionTier = entry.tier;
                  row.fixingActionRuleId = entry.ruleId;
               }
            }
          }
        });

        dispatch({ type: "SET_STAGE_2_DATA", payload: updatedTable });
        alert(`Validation Complete: ${results.errorCount} Errors, ${results.warnCount} Warnings found.`);
    };

    window.addEventListener('RUN_VALIDATOR_MANUAL', handleManualValidation);
    return () => window.removeEventListener('RUN_VALIDATOR_MANUAL', handleManualValidation);
  }, [state.stage2Data, state.config, dispatch]);

  React.useEffect(() => {
    const handleSync = (e) => {
        const { rowIndex, status } = e.detail;
        let updatedTable = state.stage2Data.map(r =>
            r._rowIndex === rowIndex ? { ...r, _fixApproved: status } : r
        );

        // If approved via 3D Canvas, immediately apply fixes for that row
        if (status === true && state.smartFix.chains) {
            const logger = createLogger();
            // Re-run applicator purely for approved rows
            const result = applyFixes(updatedTable, state.smartFix.chains, state.config, logger);
            updatedTable = result.updatedTable;
            setZustandData(updatedTable); // Ensure 3D updates immediately
        }

        dispatch({ type: "SET_STAGE_2_DATA", payload: updatedTable });
    };
    window.addEventListener('zustand-fix-status-changed', handleSync);
    return () => window.removeEventListener('zustand-fix-status-changed', handleSync);
  }, [state.stage2Data, state.smartFix.chains, state.config, dispatch, setZustandData]);

  const handleSmartFix = () => {
    dispatch({ type: "SET_SMART_FIX_STATUS", status: "running" });
    const logger = createLogger();
    const result = runSmartFix(state.stage2Data, state.config, logger);

    // Save logs to state
    logger.getLog().forEach(entry => dispatch({ type: "ADD_LOG", payload: entry }));

    dispatch({ type: "SMART_FIX_COMPLETE", payload: result });
  };

  const handleApplyFixes = () => {
    dispatch({ type: "SET_SMART_FIX_STATUS", status: "applying" });
    const logger = createLogger();

    // For Group 2 / proposals (from PcfTopologyGraph2), applying fixes means mutating the geometries that were approved.
    let tableToProcess = state.stage2Data;
    if (useStore.getState().proposals.length > 0) {
        tableToProcess = applyApprovedMutations(tableToProcess, useStore.getState().proposals, logger);
    }

    const result = applyFixes(tableToProcess, state.smartFix.chains, state.config, logger);

    logger.getLog().forEach(entry => dispatch({ type: "ADD_LOG", payload: entry }));

    setZustandData(result.updatedTable);
    dispatch({ type: "FIXES_APPLIED", payload: result });
  };

  const isDataLoaded = state.stage2Data && state.stage2Data.length > 0;
  const isRunning = state.smartFix.status === "running";
  const isApplying = state.smartFix.status === "applying";
  const passNum = state.smartFix.pass || 1;
  const isSecondPassReady = state.smartFix.status === "applied" && state.config.pteMode?.autoMultiPassMode;

  // Apply Fixes should be enabled if any row is approved and we're not currently applying
  const hasApprovedFixes = state.stage2Data && state.stage2Data.some(r => r._fixApproved === true);
  const canApplyFixes = hasApprovedFixes && !isApplying;

  const handleSecondPass = () => {
    dispatch({ type: "SET_SMART_FIX_STATUS", status: "running" });
    const logger = createLogger();
    // Before running we flag the table that it's pass 2
    let pass2Table = state.stage2Data.map(r => ({ ...r, _currentPass: 2, _passApplied: r._passApplied || 2 }));
    const result = runSmartFix(pass2Table, { ...state.config, currentPass: 2 }, logger);
    logger.getLog().forEach(entry => dispatch({ type: "ADD_LOG", payload: entry }));
    // Update data table explicitly so UI picks up the pass 2 prefixes
    dispatch({ type: "SET_STAGE_2_DATA", payload: pass2Table });
    dispatch({ type: "SMART_FIX_COMPLETE", payload: { ...result, pass: 2 } });
  };

  const handleExportExcel = async () => {
    try {
      await exportToExcel(state.stage2Data);
      dispatch({ type: "ADD_LOG", payload: { type: "Info", message: "Exported Data Table to Excel." }});
    } catch (err) {
      alert("Error exporting Excel: " + err.message);
    }
  };

  const handleExportPCF = () => {
    const text = generatePCFText(state.stage2Data, state.config);
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
      let processedTable = runDataProcessor(state.stage2Data, state.config, logger);
      runValidationChecklist(processedTable, state.config, logger);

      if (runGroup === 'group2') {
          // Pass data table through PcfTopologyGraph_2
          const { proposals } = PcfTopologyGraph2(processedTable, state.config, logger);
          setZustandProposals(proposals);
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
      dispatch({ type: "SET_STAGE_2_DATA", payload: processedTable });
      setZustandData(processedTable);
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
            setZustandData(processedTable);

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
          onClick={() => {
            dispatch({ type: "UNDO_FIXES" });
            // ensure Zustand syncs with the undone state
            if (state.history.length > 0) {
              const prevTable = state.history[state.history.length - 1];
              setZustandData(prevTable);
            }
          }}
          disabled={state.history.length === 0}
          className="px-4 py-1.5 bg-yellow-600 hover:bg-yellow-500 rounded font-medium disabled:opacity-50 transition-colors text-white"
          title="Undo last applied fixes"
        >
          ↶ Undo
        </button>

        <button
          onClick={handleSmartFix}
          disabled={!isDataLoaded || isRunning}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded font-medium disabled:opacity-50 transition-colors"
        >
          {isRunning ? "Analyzing..." : "Smart Fix 🔧"}
        </button>

        <button
          onClick={handleApplyFixes}
          disabled={!canApplyFixes}
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
