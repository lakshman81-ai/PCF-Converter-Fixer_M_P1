import React from 'react';
import { useAppContext } from '../../store/AppContext';
import { useStore } from '../../store/useStore';

export function DataTableTab({ stage = "1" }) {
  const { state, dispatch } = useAppContext();
  const [filterAction, setFilterAction] = React.useState('ALL');

  let currentData;
  if (stage === "1") currentData = state.dataTable;
  else if (stage === "2") currentData = state.stage2Data;
  else if (stage === "3") currentData = state.stage3Data;

  const dataTable = currentData;

  const handleApprove = (rowIndex, approve) => {
      const updatedTable = [...dataTable];
      const rowIdx = updatedTable.findIndex(r => r._rowIndex === rowIndex);
      if (rowIdx > -1) {
          updatedTable[rowIdx] = { ...updatedTable[rowIdx], _fixApproved: approve };
          if (stage === "1") dispatch({ type: "SET_DATA_TABLE", payload: updatedTable });
          if (stage === "2") dispatch({ type: "SET_STAGE_2_DATA", payload: updatedTable });
          if (stage === "3") dispatch({ type: "SET_STAGE_3_DATA", payload: updatedTable });
          // Ensure Zustand proposals match this state so 3D canvas popups turn green
          if (stage === "2") useStore.getState().setProposalStatus(rowIndex, approve);
      }
  };

  const handleAutoApproveAll = () => {
      const updatedTable = dataTable.map(r => {
          if (r.fixingActionTier && r.fixingActionTier <= 2) {
              if (stage === "2") useStore.getState().setProposalStatus(r._rowIndex, true);
              return { ...r, _fixApproved: true };
          }
          return r;
      });
      if (stage === "1") dispatch({ type: "SET_DATA_TABLE", payload: updatedTable });
      if (stage === "2") dispatch({ type: "SET_STAGE_2_DATA", payload: updatedTable });
      if (stage === "3") dispatch({ type: "SET_STAGE_3_DATA", payload: updatedTable });
  };

  const handleIgnoreAllWarnings = () => {
      const updatedTable = dataTable.map(r => {
          if (r.fixingAction && r.fixingActionRuleId && r.fixingAction.includes('WARNING')) {
              return { ...r, _fixIgnored: true };
          }
          return r;
      });
      if (stage === "1") dispatch({ type: "SET_DATA_TABLE", payload: updatedTable });
      if (stage === "2") dispatch({ type: "SET_STAGE_2_DATA", payload: updatedTable });
      if (stage === "3") dispatch({ type: "SET_STAGE_3_DATA", payload: updatedTable });
  };

  const handleCalculateMissingGeometry = () => {
       const updatedTable = dataTable.map((row, index, arr) => {
            const r = { ...row };
            // Auto inherit bore from previous row if missing
            if ((!r.bore || r.bore === "") && index > 0) {
                 const prev = arr[index - 1];
                 if (prev.bore) {
                     r.bore = prev.bore;
                     r._modified = r._modified || {};
                     r._modified.bore = "Inherited";
                 }
            }
            // Missing Bore fallback for PIPES
            if ((!r.bore || r.bore === "") && r.type === "PIPE" && r.ep1 && r.ep2) {
                r.bore = 100;
                r._modified = r._modified || {};
                r._modified.bore = "Fallback";
            }
            // Missing CP for TEES
            if (r.type === "TEE" && (!r.cp || (r.cp.x === undefined && r.cp.y === undefined && r.cp.z === undefined) || (r.cp.x === 0 && r.cp.y === 0 && r.cp.z === 0)) && r.ep1 && r.ep2) {
                r.cp = {
                    x: (r.ep1.x + r.ep2.x) / 2,
                    y: (r.ep1.y + r.ep2.y) / 2,
                    z: (r.ep1.z + r.ep2.z) / 2
                };
                r._modified = r._modified || {};
                r._modified.cp = "Calculated Midpoint";
            }

            // Calculate Vector Deltas (Axis) if missing
            if (r.ep1 && r.ep2 && (r.deltaX === undefined || r.deltaY === undefined || r.deltaZ === undefined)) {
                r.deltaX = r.ep2.x - r.ep1.x;
                r.deltaY = r.ep2.y - r.ep1.y;
                r.deltaZ = r.ep2.z - r.ep1.z;
                r._modified = r._modified || {};
                r._modified.deltaX = "Calc";
            }

            return r;
       });
       if (stage === "1") dispatch({ type: "SET_DATA_TABLE", payload: updatedTable });
       if (stage === "2") dispatch({ type: "SET_STAGE_2_DATA", payload: updatedTable });
       if (stage === "3") dispatch({ type: "SET_STAGE_3_DATA", payload: updatedTable });

       // Trigger a sync so StatusBar knows table changed if needed
       if (stage === "2") window.dispatchEvent(new CustomEvent('zustand-force-sync'));
  };

  const handlePullStage1 = () => {
      // Pulls Data Table from Stage 1 into Stage 2 minus fixingAction
      const stage1Data = state.dataTable.map(r => {
          const newRow = { ...r };
          delete newRow.fixingAction;
          delete newRow.fixingActionTier;
          delete newRow.fixingActionRuleId;
          delete newRow._fixApproved;
          delete newRow._passApplied;
          return newRow;
      });
      dispatch({ type: "SET_STAGE_2_DATA", payload: stage1Data });
      alert("Successfully pulled Stage 1 data into Stage 2.");
  };

  const handleValidateSyntax = () => {
      // Trigger the engine's validator to run manually
      // We need to simulate the event bus trigger that StatusBar uses
      const event = new CustomEvent('RUN_VALIDATOR_MANUAL');
      window.dispatchEvent(event);
  };

  const fixingActionStats = React.useMemo(() => {
    let approved = 0, rejected = 0, pending = 0;
    let errPass1 = 0, warnPass1 = 0;
    let errPass2 = 0, warnPass2 = 0;

    if (dataTable) {
        dataTable.forEach(r => {
          if (r.fixingAction) {
            if (r._fixApproved === true) approved++;
            else if (r._fixApproved === false) rejected++;
            else pending++;

            const isP2 = r._passApplied === 2 || r.fixingAction.includes('[2nd Pass]');
            const isErr = r.fixingActionTier === 4 || r.fixingAction.includes('ERROR');
            const isWarn = r.fixingActionTier === 3 || r.fixingAction.includes('WARNING');

            if (isP2) {
                if (isErr) errPass2++;
                if (isWarn) warnPass2++;
            } else {
                if (isErr) errPass1++;
                if (isWarn) warnPass1++;
            }
          }
        });
    }
    return { approved, rejected, pending, errPass1, warnPass1, errPass2, warnPass2 };
  }, [state.dataTable]);

  const filteredDataTable = React.useMemo(() => {
     if (!dataTable) return [];
     if (filterAction === 'ALL') return dataTable;
     if (filterAction === 'ERRORS_WARNINGS') return dataTable.filter(r => r.fixingAction && (r.fixingAction.includes('ERROR') || r.fixingAction.includes('WARNING')));
     if (filterAction === 'PROPOSALS') return dataTable.filter(r => r.fixingAction && !r.fixingAction.includes('ERROR') && !r.fixingAction.includes('WARNING'));
     if (filterAction === 'PENDING') return dataTable.filter(r => r.fixingAction && r._fixApproved === undefined);
     if (filterAction === 'APPROVED') return dataTable.filter(r => r._fixApproved === true);
     if (filterAction === 'REJECTED') return dataTable.filter(r => r._fixApproved === false);
     return dataTable;
  }, [dataTable, filterAction]);

  if (stage === "3" && (!currentData || currentData.length === 0)) {
      return (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] text-slate-500 p-8">
              <h2 className="text-xl font-bold mb-2 text-slate-700">Stage 3: Final Checking</h2>
              <p className="max-w-xl text-center">This is the final validation stage where VXX syntax rules and RXX topological rules are executed one last time before export to ensure no regressions were introduced during Stage 2 fixing.</p>
              <button onClick={() => {
                  dispatch({ type: "SET_STAGE_3_DATA", payload: state.stage2Data });
              }} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded font-medium shadow">
                  Pull Data from Stage 2
              </button>
          </div>
      );
  }

  if (!dataTable || dataTable.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] text-slate-500">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-slate-400">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <h2 className="text-xl font-medium mb-2">No Data Loaded</h2>
        <p className="max-w-md text-center">Import a PCF, CSV, or Excel file using the buttons in the header to populate the Data Table.</p>
      </div>
    );
  }

  const renderFixingAction = (row) => {
    if (!row.fixingAction) return <span className="text-slate-400">—</span>;

    const tierColors = {
      1: { bg: "bg-green-50", text: "text-green-800", border: "border-green-500", label: "AUTO T1" },
      2: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-500", label: "FIX T2" },
      3: { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-500", label: "REVIEW T3" },
      4: { bg: "bg-red-50", text: "text-red-800", border: "border-red-500", label: "ERROR T4" },
    };

    let colors = tierColors[row.fixingActionTier] || tierColors[3];
    if (row._passApplied > 0) {
      colors = { bg: "bg-green-100", text: "text-green-900", border: "border-green-600", label: "FIX APPLIED" };
    }

    // Attempt to split into validation warning and proposal/action.
    // E.g., Validator puts "[V2] ERROR...", SmartFixer appends action.
    let validationMsg = row.fixingActionOriginalError || "";
    let actionMsg = row.fixingAction;

    if (!row.fixingActionOriginalError && (row.fixingAction.includes('ERROR') || row.fixingAction.includes('WARNING'))) {
         // It's primarily a validation message or it hasn't been split yet
         if (row.fixingAction.includes('—')) {
             const parts = row.fixingAction.split('—');
             validationMsg = parts[0].trim();
             actionMsg = parts.slice(1).join('—').trim();
         } else {
             validationMsg = row.fixingAction;
             actionMsg = "";
         }
    }

    const passPrefix = row._passApplied === 2 ? "[2nd Pass]" : "[1st Pass]";

    return (
      <div className={`${colors.bg} ${colors.text} border-l-4 ${colors.border} p-2 font-mono text-xs leading-relaxed whitespace-pre-wrap rounded-r shadow-sm min-w-[280px]`}>
        <div className="font-semibold mb-1">
             <span className="text-slate-600 mr-1">{passPrefix}</span>
             {validationMsg}
        </div>
        {actionMsg && (
            <>
                <div className={`mt-1 pl-2 border-l-2 ${row._passApplied > 0 ? 'border-green-400 text-green-800' : 'border-amber-400 text-amber-800'}`}>
                     <span className="font-bold mr-1">{row._passApplied > 0 ? "[Action Taken]" : "[Proposal]"}</span>
                     <span className={row._fixApproved === false ? "line-through opacity-70" : ""}>{actionMsg}</span>
                     {row._passApplied === undefined && row._fixApproved === true && !row._isPassiveFix && (
                        <div className="text-[9px] text-blue-600 mt-1 italic">(Click 'Apply Fixes ✓' in footer to mutate geometry)</div>
                     )}
                </div>
                {row._passApplied !== 1 && row._passApplied !== 2 && !row._isPassiveFix && (
                    <div className="mt-2 flex space-x-2">
                        <button onClick={() => handleApprove(row._rowIndex, true)} className={`px-2 py-1 text-xs rounded shadow-sm transition-colors ${row._fixApproved === true ? 'bg-green-100 text-green-800 border border-green-400 font-semibold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'}`}>✓ Approve</button>
                        <button onClick={() => handleApprove(row._rowIndex, false)} className={`px-2 py-1 text-xs rounded shadow-sm transition-colors ${row._fixApproved === false ? 'bg-slate-200 text-slate-500 border border-slate-400 font-semibold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'}`}>✗ Reject</button>
                    </div>
                )}
            </>
        )}
      </div>
    );
  };

  const fmtCoord = (c) => c ? `${c.x?.toFixed(1)}, ${c.y?.toFixed(1)}, ${c.z?.toFixed(1)}` : '—';
  const getCellClass = (row, field) => {
    if (row._modified && row._modified[field]) {
        // Color coding based on pass
        if (row._passApplied === 1) return 'bg-cyan-50 text-cyan-800 font-semibold';
        if (row._passApplied === 2) return 'bg-purple-50 text-purple-800 font-semibold';
        return 'bg-cyan-50 text-cyan-800 font-semibold';
    }
    if (row._modified && row._modified[field]) return 'bg-cyan-50 text-cyan-800 font-semibold';
    return 'text-slate-600';
  };

  return (
    <>
      <div className="mb-2 flex flex-col xl:flex-row justify-between xl:items-end gap-2">
        <div className="flex flex-wrap gap-2 text-sm font-medium">
            <div className="text-slate-600 bg-slate-100 px-3 py-1.5 rounded border border-slate-200 shadow-sm flex items-center">
                Validation [Pass 1]:
                <span className="text-red-600 ml-2 font-bold">Errors({fixingActionStats.errPass1})</span>,
                <span className="text-orange-500 ml-2 font-bold">Warnings({fixingActionStats.warnPass1})</span>
            </div>
            {(fixingActionStats.errPass2 > 0 || fixingActionStats.warnPass2 > 0) && (
                <div className="text-slate-600 bg-slate-100 px-3 py-1.5 rounded border border-slate-200 shadow-sm flex items-center">
                    Validation [Pass 2]:
                    <span className="text-red-600 ml-2 font-bold">Errors({fixingActionStats.errPass2})</span>,
                    <span className="text-orange-500 ml-2 font-bold">Warnings({fixingActionStats.warnPass2})</span>
                </div>
            )}
            <div className="text-slate-600 bg-indigo-50 px-3 py-1.5 rounded border border-indigo-200 shadow-sm flex items-center">
                Fixing Action:
                <span className="text-green-600 ml-2 font-bold">Approved({fixingActionStats.approved})</span>,
                <span className="text-slate-500 ml-2 font-bold">Rejected({fixingActionStats.rejected})</span>,
                <span className="text-amber-600 ml-2 font-bold">Pending({fixingActionStats.pending})</span>
            </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 bg-white px-2 py-1 rounded border border-slate-300 shadow-sm">
            {stage === "2" && (
                <button onClick={handlePullStage1} className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-xs font-bold border border-amber-200 transition-all shadow-sm mr-2 whitespace-nowrap">
                    📥 Pull from Stage 1
                </button>
            )}

            <div className="flex items-center space-x-2 border-r border-slate-200 pr-3 mr-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">FILTER:</span>
                <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="text-sm bg-slate-50 text-slate-700 border-none outline-none cursor-pointer py-1 px-1 rounded font-medium">
                    <option value="ALL">All Rows</option>
                    <option value="ERRORS_WARNINGS">Errors & Warnings</option>
                    <option value="PROPOSALS">Smart Fix Proposals</option>
                    <option value="PENDING">Pending Approval</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                </select>
            </div>

            <div className="flex items-center space-x-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1 hidden md:inline-block">Tools:</span>

                {stage === "1" && (
                    <>
                        <button onClick={handleValidateSyntax} className="px-2.5 py-1 bg-white hover:bg-teal-50 text-slate-600 hover:text-teal-700 rounded text-xs font-semibold border border-transparent hover:border-teal-200 transition-all shadow-sm" title="Run strict Data Table validation checks">
                            <span className="mr-1">🛡️</span>Check Syntax
                        </button>
                        <button onClick={handleCalculateMissingGeometry} className="px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded text-xs font-semibold border border-transparent hover:border-blue-200 transition-all shadow-sm" title="Calculate missing bores, midpoints, and vectors">
                            <span className="mr-1">📐</span>Calc Missing Geo
                        </button>
                    </>
                )}

                {(stage === "2" || stage === "3") && (
                    <>
                        <button onClick={handleValidateSyntax} className="px-2.5 py-1 bg-white hover:bg-teal-50 text-slate-600 hover:text-teal-700 rounded text-xs font-semibold border border-transparent hover:border-teal-200 transition-all shadow-sm" title="Run strict Data Table validation checks">
                            <span className="mr-1">🛡️</span>Validate Rules
                        </button>
                        <button onClick={handleIgnoreAllWarnings} className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded text-xs font-semibold border border-transparent hover:border-slate-300 transition-all shadow-sm" title="Acknowledge and dismiss all current warnings">
                            <span className="mr-1">👁️‍🗨️</span>Ignore Warnings
                        </button>
                        <button onClick={handleAutoApproveAll} className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-bold border border-indigo-200 transition-all shadow-sm ml-2" title="Approve all Tier 1/2 automated fixes">
                            <span className="mr-1">⚡</span>Auto Approve (&lt;25mm)
                        </button>
                    </>
                )}
            </div>
        </div>
      </div>
  <div className="overflow-auto h-[calc(100vh-14rem)] border rounded shadow-sm bg-white relative">
      <table className="min-w-max divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-100 sticky top-0 z-20 shadow-sm whitespace-nowrap">
          <tr>
            {/* Identity & Reference */}
            <th className="px-3 py-2 text-left font-semibold text-slate-700 border-r border-slate-300 sticky left-0 z-30 bg-slate-100"># Row</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-700 border-r border-slate-300 sticky left-[60px] z-30 bg-slate-100">CSV SEQ NO</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-700 border-r border-slate-300 sticky left-[160px] z-30 bg-slate-100">Type</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200">TEXT (MSG)</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200">PIPELINE-REF</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200">REF NO.</th>

            {/* Geometry */}
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200 bg-blue-50/50">BORE</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200 bg-blue-50/50">EP1</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200 bg-blue-50/50">EP2</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200 bg-blue-50/50">CP</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200 bg-blue-50/50">BP</th>

            {/* Fitting & Support */}
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200">SKEY</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200">SUPPORT COOR</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200">SUPPORT GUID</th>

            {/* Smart Fix */}
            <th className="px-3 py-2 text-left font-semibold text-slate-700 border-r border-slate-300 bg-amber-50">Fixing Action</th>

            {/* Calculated Deltas & Lens */}
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200 bg-slate-50">LEN1</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200 bg-slate-50">AXIS1</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200 bg-slate-50">LEN2</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200 bg-slate-50">AXIS2</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200 bg-slate-50">LEN3</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200 bg-slate-50">AXIS3</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200 bg-slate-50">BRLEN</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200 bg-slate-50">DELTA X</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200 bg-slate-50">DELTA Y</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200 bg-slate-50">DELTA Z</th>

            {/* Derived & Pointers */}
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200">DIAMETER</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200">WALL_THICK</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200">BEND_PTR</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200">RIGID_PTR</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500 border-r border-slate-200">INT_PTR</th>

            {/* CAs */}
            {[1,2,3,4,5,6,7,8,9,10,97,98].map(n => (
                <th key={`ca${n}`} className="px-3 py-2 text-left font-medium text-slate-400 border-r border-slate-200">CA{n}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {filteredDataTable.map((row) => (
            <tr key={row._rowIndex} className="hover:bg-slate-50 transition-colors whitespace-nowrap">
              <td className="px-3 py-2 text-slate-500 border-r border-slate-200 sticky left-0 z-10 bg-white font-mono">{row._rowIndex}</td>
              <td className={`px-3 py-2 border-r border-slate-200 sticky left-[60px] z-10 bg-white font-mono ${getCellClass(row, 'csvSeqNo')}`}>{row.csvSeqNo || '—'}</td>
              <td className="px-3 py-2 font-medium text-slate-900 border-r border-slate-300 sticky left-[160px] z-10 bg-white">{row.type}</td>
              <td className="px-3 py-2 text-slate-500 border-r border-slate-200 truncate max-w-[200px]" title={row.text}>{row.text || '—'}</td>
              <td className="px-3 py-2 text-slate-500 border-r border-slate-200">{row.pipelineRef || '—'}</td>
              <td className={`px-3 py-2 border-r border-slate-200 ${getCellClass(row, 'refNo')}`}>{row.refNo || '—'}</td>

              <td className={`px-3 py-2 font-mono border-r border-slate-200 ${getCellClass(row, 'bore')}`}>{row.bore || '—'}</td>
              <td className={`px-3 py-2 font-mono border-r border-slate-200 ${getCellClass(row, 'ep1')}`}>{fmtCoord(row.ep1)}</td>
              <td className={`px-3 py-2 font-mono border-r border-slate-200 ${getCellClass(row, 'ep2')}`}>{fmtCoord(row.ep2)}</td>
              <td className={`px-3 py-2 font-mono border-r border-slate-200 ${getCellClass(row, 'cp')}`}>{fmtCoord(row.cp)}</td>
              <td className={`px-3 py-2 font-mono border-r border-slate-200 ${getCellClass(row, 'bp')}`}>{fmtCoord(row.bp)}</td>

              <td className="px-3 py-2 font-mono text-slate-600 border-r border-slate-200">{row.skey || '—'}</td>
              <td className="px-3 py-2 font-mono text-slate-600 border-r border-slate-200">{fmtCoord(row.supportCoor)}</td>
              <td className="px-3 py-2 font-mono text-slate-600 border-r border-slate-200">{row.supportGuid || '—'}</td>

              <td className="px-3 py-2 border-r border-slate-200 align-top">{renderFixingAction(row)}</td>

              <td className="px-3 py-2 font-mono text-cyan-700 border-r border-slate-200 bg-slate-50/50">{row.len1?.toFixed(1) || '—'}</td>
              <td className="px-3 py-2 text-cyan-700 border-r border-slate-200 bg-slate-50/50">{row.axis1 || '—'}</td>
              <td className="px-3 py-2 font-mono text-cyan-700 border-r border-slate-200 bg-slate-50/50">{row.len2?.toFixed(1) || '—'}</td>
              <td className="px-3 py-2 text-cyan-700 border-r border-slate-200 bg-slate-50/50">{row.axis2 || '—'}</td>
              <td className="px-3 py-2 font-mono text-cyan-700 border-r border-slate-200 bg-slate-50/50">{row.len3?.toFixed(1) || '—'}</td>
              <td className="px-3 py-2 text-cyan-700 border-r border-slate-200 bg-slate-50/50">{row.axis3 || '—'}</td>
              <td className="px-3 py-2 font-mono text-cyan-700 border-r border-slate-200 bg-slate-50/50">{row.brlen?.toFixed(1) || '—'}</td>
              <td className="px-3 py-2 font-mono text-cyan-700 border-r border-slate-200 bg-slate-50/50">{row.deltaX?.toFixed(1) || '—'}</td>
              <td className="px-3 py-2 font-mono text-cyan-700 border-r border-slate-200 bg-slate-50/50">{row.deltaY?.toFixed(1) || '—'}</td>
              <td className="px-3 py-2 font-mono text-cyan-700 border-r border-slate-200 bg-slate-50/50">{row.deltaZ?.toFixed(1) || '—'}</td>

              <td className="px-3 py-2 text-slate-500 border-r border-slate-200">{row.diameter || '—'}</td>
              <td className="px-3 py-2 text-slate-500 border-r border-slate-200">{row.wallThick || '—'}</td>
              <td className="px-3 py-2 font-mono text-slate-400 border-r border-slate-200">{row.bendPtr || '—'}</td>
              <td className="px-3 py-2 font-mono text-slate-400 border-r border-slate-200">{row.rigidPtr || '—'}</td>
              <td className="px-3 py-2 font-mono text-slate-400 border-r border-slate-200">{row.intPtr || '—'}</td>

              {[1,2,3,4,5,6,7,8,9,10,97,98].map(n => (
                  <td key={`ca${n}`} className="px-3 py-2 text-slate-500 border-r border-slate-200">{row.ca?.[n] || '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
          </table>
    </div>
    </>
  );
}
