import React from 'react';
import { useAppContext } from '../../store/AppContext';
import { runSmartFix } from '../../engine/Orchestrator';
import { applyFixes } from '../../engine/FixApplicator';
import { createLogger } from '../../utils/Logger';
import { runValidationChecklist } from '../../engine/Validator';
import { runDataProcessor } from '../../engine/DataProcessor';

import { PcfTopologyGraph2, applyApprovedMutations } from '../../engine/PcfTopologyGraph2';
import { useStore } from '../../store/useStore';

export function StatusBar({ activeTab, activeStage }) {
  const [showModal, setShowModal] = React.useState(false);
  const [runGroup, setRunGroup] = React.useState('group1');
  const [isStatusExpanded, setIsStatusExpanded] = React.useState(false);
  const { state, dispatch } = useAppContext();
  const setZustandData = useStore(state => state.setDataTable);
  const setZustandProposals = useStore(state => state.setProposals);

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

    let errorFixes = 0;
    let warnFixes = 0;

    // Save logs to state
    logger.getLog().forEach(entry => {
         dispatch({ type: "ADD_LOG", payload: entry });
         if (entry.tier && entry.tier <= 2) errorFixes++;
         if (entry.tier && entry.tier === 3) warnFixes++;
    });

    dispatch({ type: "SMART_FIX_COMPLETE", payload: result });
    dispatch({ type: "SET_STATUS_MESSAGE", payload: `Analysis Complete: ${errorFixes} Auto-Fixes (T1/2), ${warnFixes} Warnings (T3)` });
    setTimeout(() => dispatch({ type: "SET_STATUS_MESSAGE", payload: null }), 6000);
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
  const isSecondPassReady = (state.smartFix.status === "applied" || state.smartFix.status === "previewing") && state.config.pteMode?.autoMultiPassMode;

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

  const d = new Date();
  const verString = `Ver ${d.getDate().toString().padStart(2, '0')}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getFullYear()} (1)`;

  const handleExecute = () => {
      setShowModal(false);
      const logger = createLogger();
      // Only process geometry parsing and V15 validation (Stage 2) here
      let processedTable = runDataProcessor(state.stage2Data, state.config, logger);
      runValidationChecklist(processedTable, state.config, logger, "2");

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
      dispatch({ type: "SET_STATUS_MESSAGE", payload: "Processing & Validation complete!" });
      setTimeout(() => dispatch({ type: "SET_STATUS_MESSAGE", payload: null }), 5000);
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

    <div className="fixed bottom-0 left-0 right-0 h-12 bg-slate-800 text-white flex items-center justify-between px-4 text-sm z-50 shadow-lg">
      <div className="flex items-center space-x-2 relative h-full">
        {/* Collapsible Status Container */}
        <div
            className={`absolute bottom-0 left-0 bg-slate-700 border-t border-r border-slate-600 rounded-tr-lg shadow-xl transition-all duration-300 ease-in-out flex flex-col ${isStatusExpanded ? 'h-48 w-[500px] p-4' : 'h-12 w-[300px] px-3 py-0 flex-row items-center cursor-pointer hover:bg-slate-600'}`}
            onClick={() => !isStatusExpanded && setIsStatusExpanded(true)}
        >
            <div className="flex justify-between items-center w-full mb-2">
                <span className={`font-mono text-slate-300 ${isStatusExpanded ? 'text-sm' : 'text-xs truncate'}`}>
                    {state.statusMessage || "Ready"}
                </span>
                {isStatusExpanded && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsStatusExpanded(false); }}
                        className="text-slate-400 hover:text-white"
                    >
                        ✕
                    </button>
                )}
            </div>
            {isStatusExpanded && (
                <div className="flex-1 overflow-y-auto mt-2 text-xs text-slate-400 space-y-1">
                    {/* If we had a message history, we'd map it here. For now just show the current message wrapped. */}
                    <div className="bg-slate-800/50 p-2 rounded whitespace-pre-wrap font-mono">
                        {state.statusMessage || "System is idle."}
                    </div>
                </div>
            )}
        </div>

        {/* Push content past the status box when collapsed */}
        <div className="ml-[320px] flex items-center space-x-2">
        {(!state.dataTable || state.dataTable.length === 0) && (
            <button
                onClick={() => {
                  const mockData = [
                    { _rowIndex: 1, type: "PIPE", ep1: {x: 0, y: 0, z: 0}, ep2: {x: 1000, y: 0, z: 0}, bore: 100 },
                    { _rowIndex: 2, type: "PIPE", ep1: {x: 1005, y: 0, z: 0}, ep2: {x: 2000, y: 0, z: 0}, bore: 100 },
                    { _rowIndex: 3, type: "TEE", ep1: {x: 2000, y: 0, z: 0}, ep2: {x: 2300, y: 0, z: 0}, cp: {x: 2150, y: 0, z: 0}, bp: {x: 2150, y: 150, z: 0}, bore: 100, branchBore: 50 },
                    { _rowIndex: 4, type: "PIPE", ep1: {x: 2300, y: 0, z: 0}, ep2: {x: 3000, y: 0, z: 0}, bore: 100 },
                    { _rowIndex: 5, type: "PIPE", ep1: {x: 2980, y: 0, z: 0}, ep2: {x: 4000, y: 0, z: 0}, bore: 100 },
                    { _rowIndex: 6, type: "PIPE", ep1: {x: 2150, y: 150, z: 0}, ep2: {x: 2150, y: 154, z: 0}, bore: 50 },
                    { _rowIndex: 7, type: "VALVE", ep1: {x: 2150, y: 154, z: 0}, ep2: {x: 2150, y: 354, z: 0}, bore: 50, skey: "VBFL" },
                  ];
                  dispatch({ type: "SET_DATA_TABLE", payload: mockData });
                  useStore.getState().setDataTable(mockData);
                }}
                className="px-2 py-1 bg-indigo-900/50 hover:bg-indigo-800 text-indigo-300 rounded text-xs transition border border-indigo-700/50"
            >
              Load Mock Test Data
            </button>
        )}

        <button
          onClick={() => {
            const logger = createLogger();
            const processedTable = runDataProcessor(state.stage2Data, state.config, logger);
            runValidationChecklist(processedTable, state.config, logger, "2"); // Pass "2" to isolate V15
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

            // intercept to show modal instead
            setShowModal(true);
          }}
          disabled={!isDataLoaded}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50 h-8 flex items-center"
        >
          Run Phase 1 Validator (Only Pipe filling/Trimming) ▶
        </button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Only show these action buttons if we are on Tab 2 (Stage 2 / 3D Canvas) */}
        {activeTab === 'tab2' && (
            <>
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
                  className="px-4 py-1.5 bg-yellow-600 hover:bg-yellow-500 rounded font-medium disabled:opacity-50 transition-colors text-white h-full"
                  title="Undo last applied fixes"
                >
                  ↶ Undo
                </button>

                <button
                  onClick={handleSmartFix}
                  disabled={!isDataLoaded || isRunning}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded font-medium disabled:opacity-50 transition-colors h-full"
                >
                  {isRunning ? "Analyzing..." : "Smart Fix 🔧"}
                </button>

                <button
                  onClick={handleApplyFixes}
                  disabled={!canApplyFixes}
                  className="px-4 py-1.5 bg-green-600 hover:bg-green-500 rounded font-medium disabled:opacity-50 transition-colors h-full"
                >
                  {isApplying ? "Applying..." : "Apply Fixes ✓"}
                </button>

                <button
                  onClick={handleSecondPass}
                  disabled={!isSecondPassReady}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 rounded font-medium disabled:opacity-50 transition-colors h-full"
                  title="Run Second Pass on Non-Pipe components"
                >
                  🚀 Run Second Pass
                </button>
            </>
        )}

        <span className="text-slate-400 font-mono text-xs">{verString}</span>
      </div>
    </div>
    </>
  );
}
