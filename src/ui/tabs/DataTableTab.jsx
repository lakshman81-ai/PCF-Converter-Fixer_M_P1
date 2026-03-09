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
      <div className={`${colors.bg} ${colors.text} border-l-4 ${colors.border} p-2 font-mono text-xs leading-relaxed whitespace-pre-wrap rounded-r shadow-sm max-w-sm`}>
        <span className={`inline-block ${colors.border.replace('border-', 'bg-')} text-white px-1.5 py-0.5 rounded text-[10px] font-bold mb-1 mr-2`}>
          {colors.label}
        </span>
        <span className="font-semibold">{row.fixingActionRuleId}</span>
        <br />
        {row.fixingAction}
      </div>
    );
  };

  return (
    <div className="overflow-auto max-h-[calc(100vh-12rem)] border rounded shadow-sm bg-white">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Row</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Type</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Bore</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">EP1 (x, y, z)</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">EP2 (x, y, z)</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap min-w-[320px]">Smart Fix Preview</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {dataTable.map((row) => (
            <tr key={row._rowIndex} className={`hover:bg-slate-50 transition-colors ${row._modified ? 'bg-cyan-50/30' : ''}`}>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-500">{row._rowIndex}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-slate-900">{row.type}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-500">{row.bore}</td>
              <td className={`px-3 py-2 whitespace-nowrap text-sm font-mono text-slate-600 ${row._modified?.ep1 ? 'text-cyan-700 font-semibold' : ''}`}>
                {row.ep1 ? `${row.ep1.x.toFixed(1)}, ${row.ep1.y.toFixed(1)}, ${row.ep1.z.toFixed(1)}` : '—'}
              </td>
              <td className={`px-3 py-2 whitespace-nowrap text-sm font-mono text-slate-600 ${row._modified?.ep2 ? 'text-cyan-700 font-semibold' : ''}`}>
                {row.ep2 ? `${row.ep2.x.toFixed(1)}, ${row.ep2.y.toFixed(1)}, ${row.ep2.z.toFixed(1)}` : '—'}
              </td>
              <td className="px-3 py-2 align-top">
                {renderFixingAction(row)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
