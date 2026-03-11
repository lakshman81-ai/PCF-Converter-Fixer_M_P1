import React from 'react';
import { useAppContext } from '../../store/AppContext';

export function DataTableTab() {
  const { state } = useAppContext();
  const { dataTable } = state;

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


  const handleApprove = (rowIndex, approve) => {
      const updatedTable = [...state.dataTable];
      const rowIdx = updatedTable.findIndex(r => r._rowIndex === rowIndex);
      if (rowIdx > -1) {
          updatedTable[rowIdx]._fixApproved = approve;
          dispatch({ type: "SET_DATA_TABLE", payload: updatedTable });
      }
  };

  const handleAutoApproveAll = () => {
      const updatedTable = state.dataTable.map(r => {
          if (r.fixingActionTier && r.fixingActionTier <= 2) {
              return { ...r, _fixApproved: true };
          }
          return r;
      });
      dispatch({ type: "SET_DATA_TABLE", payload: updatedTable });
  };

  const renderFixingAction = (row) => {
    if (!row.fixingAction) return <span className="text-slate-400">—</span>;

    const tierColors = {
      1: { bg: "bg-green-50", text: "text-green-800", border: "border-green-500", label: "AUTO T1" },
      2: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-500", label: "FIX T2" },
      3: { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-500", label: "REVIEW T3" },
      4: { bg: "bg-red-50", text: "text-red-800", border: "border-red-500", label: "ERROR T4" },
    };
    const colors = tierColors[row.fixingActionTier] || tierColors[3];

    return (
      <div className={`${colors.bg} ${colors.text} border-l-4 ${colors.border} p-2 font-mono text-xs leading-relaxed whitespace-pre-wrap rounded-r shadow-sm min-w-[280px]`}>
        <span className={`inline-block ${colors.border.replace('border-', 'bg-')} text-white px-1.5 py-0.5 rounded text-[10px] font-bold mb-1 mr-2`}>
          {colors.label}
        </span>
        <span className="font-semibold">{row.fixingActionRuleId}</span>
        <br />
        {row.fixingAction}
        <div className="mt-2 flex space-x-2">
            <button onClick={() => handleApprove(row._rowIndex, true)} className={`px-2 py-1 text-xs rounded shadow-sm ${row._fixApproved === true ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>✓ Approve</button>
            <button onClick={() => handleApprove(row._rowIndex, false)} className={`px-2 py-1 text-xs rounded shadow-sm ${row._fixApproved === false ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>✗ Reject</button>
        </div>
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
      <div className="mb-2 flex justify-end">
      <button onClick={handleAutoApproveAll} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-sm font-medium border border-indigo-200 shadow-sm transition-colors">
          Auto Approve First Pass (&lt; 25mm)
      </button>
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
          {dataTable.map((row) => (
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
