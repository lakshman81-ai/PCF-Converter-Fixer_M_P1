import React, { useState } from 'react';
import { useAppContext } from '../../store/AppContext';

export function ConfigTab() {
  const { state, dispatch } = useAppContext();
  const [localConfig, setLocalConfig] = useState(state.config);

  const handleSave = () => {
    dispatch({ type: "SET_CONFIG", payload: localConfig });
    // Push a log for transparency
    dispatch({ type: "ADD_LOG", payload: { type: "Info", message: "Configuration updated successfully." }});
  };

  const updateSmartFixer = (key, val) => {
    setLocalConfig(prev => ({
      ...prev,
      smartFixer: {
        ...prev.smartFixer,
        [key]: parseFloat(val) || 0
      }
    }));
  };

  return (
    <div className="p-6 h-[calc(100vh-12rem)] overflow-auto bg-white rounded shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-xl font-bold text-slate-800">Smart Fixer Configuration</h2>
        <button
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow-sm transition"
        >
          Save Configuration
        </button>
      </div>

      <div className="bg-blue-50 p-4 rounded border border-blue-200 shadow-sm mb-6">
        <h3 className="font-bold text-blue-800 mb-3">Multi-Pass PTE Mode & Line Key Routing</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <input type="checkbox" checked={localConfig.pteMode?.autoMultiPassMode ?? true} onChange={(e) => setLocalConfig(p => ({...p, pteMode: {...p.pteMode, autoMultiPassMode: e.target.checked}}))} className="w-4 h-4 text-blue-600 rounded border-gray-300" />
              <label className="text-sm font-medium text-slate-700">Auto Multi-Pass Mode</label>
            </div>
            <div className="flex items-center space-x-3">
              <input type="checkbox" checked={localConfig.pteMode?.sequentialMode ?? true} onChange={(e) => setLocalConfig(p => ({...p, pteMode: {...p.pteMode, sequentialMode: e.target.checked}}))} className="w-4 h-4 text-blue-600 rounded border-gray-300" />
              <label className="text-sm font-medium text-slate-700">Sequential Walk ON</label>
            </div>
            <div className="flex items-center space-x-3">
              <input type="checkbox" checked={localConfig.pteMode?.lineKeyMode ?? true} onChange={(e) => setLocalConfig(p => ({...p, pteMode: {...p.pteMode, lineKeyMode: e.target.checked}}))} className="w-4 h-4 text-blue-600 rounded border-gray-300" />
              <label className="text-sm font-medium text-slate-700">Line_Key Constraints ON</label>
            </div>
        </div>
        <div className="mt-4 pt-4 border-t border-blue-100 flex items-center space-x-4">
            <label className="text-sm font-semibold text-slate-700">Line_Key Target Column:</label>
            <select
                className="p-1.5 border border-slate-300 rounded text-sm w-48"
                value={localConfig.pteMode?.lineKeyColumn ?? "pipelineRef"}
                onChange={(e) => setLocalConfig(p => ({...p, pteMode: {...p.pteMode, lineKeyColumn: e.target.value}}))}
            >
                <option value="pipelineRef">PIPELINE-REFERENCE</option>
                <option value="text">MESSAGE-SQUARE Text</option>
                <option value="ca97">CA97 (RefNo)</option>
                <option value="ca98">CA98 (SeqNo)</option>
            </select>
            <span className="text-xs text-slate-500 italic">Determines the boundary for multi-pass segment logic.</span>
        </div>
        <div className="mt-4 pt-4 border-t border-blue-100 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col">
              <label className="text-xs text-slate-600 mb-1">Bore Ratio Min</label>
              <input type="number" step="0.1" value={localConfig.pteMode?.boreRatioMin ?? 0.7} onChange={(e) => setLocalConfig(p => ({...p, pteMode: {...p.pteMode, boreRatioMin: parseFloat(e.target.value)}}))} className="p-1 border rounded text-sm font-mono w-full" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-slate-600 mb-1">Bore Ratio Max</label>
              <input type="number" step="0.1" value={localConfig.pteMode?.boreRatioMax ?? 1.5} onChange={(e) => setLocalConfig(p => ({...p, pteMode: {...p.pteMode, boreRatioMax: parseFloat(e.target.value)}}))} className="p-1 border rounded text-sm font-mono w-full" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-slate-600 mb-1">Sweep Radii Min (xNB)</label>
              <input type="number" step="0.1" value={localConfig.pteMode?.sweepRadiusMinMultiplier ?? 0.2} onChange={(e) => setLocalConfig(p => ({...p, pteMode: {...p.pteMode, sweepRadiusMinMultiplier: parseFloat(e.target.value)}}))} className="p-1 border rounded text-sm font-mono w-full" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-slate-600 mb-1">Sweep Radii Max (mm)</label>
              <input type="number" step="10" value={localConfig.pteMode?.sweepRadiusMax ?? 13000} onChange={(e) => setLocalConfig(p => ({...p, pteMode: {...p.pteMode, sweepRadiusMax: parseFloat(e.target.value)}}))} className="p-1 border rounded text-sm font-mono w-full" />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Core Geometry Thresholds */}
        <div className="bg-slate-50 p-4 rounded border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-3">Geometry Thresholds (mm)</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm text-slate-600">Micro-Pipe Deletion</label>
              <input type="number" step="0.1" value={localConfig.smartFixer.microPipeThreshold} onChange={(e) => updateSmartFixer('microPipeThreshold', e.target.value)} className="w-24 p-1 border rounded text-right text-sm font-mono" />
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm text-slate-600">Micro-Fitting Warning</label>
              <input type="number" step="0.1" value={localConfig.smartFixer.microFittingThreshold} onChange={(e) => updateSmartFixer('microFittingThreshold', e.target.value)} className="w-24 p-1 border rounded text-right text-sm font-mono" />
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm text-slate-600">Off-Axis Snapping</label>
              <input type="number" step="0.1" value={localConfig.smartFixer.diagonalMinorThreshold} onChange={(e) => updateSmartFixer('diagonalMinorThreshold', e.target.value)} className="w-24 p-1 border rounded text-right text-sm font-mono" />
            </div>
          </div>
        </div>

        {/* Gap & Overlap Logic */}
        <div className="bg-slate-50 p-4 rounded border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-3">Gap & Overlap Limits (mm)</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm text-slate-600">Silent Snap Micro-Gap</label>
              <input type="number" step="0.1" value={localConfig.smartFixer.negligibleGap} onChange={(e) => updateSmartFixer('negligibleGap', e.target.value)} className="w-24 p-1 border rounded text-right text-sm font-mono" />
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm text-slate-600">Auto-Fill Pipe Max Gap</label>
              <input type="number" step="0.1" value={localConfig.smartFixer.autoFillMaxGap} onChange={(e) => updateSmartFixer('autoFillMaxGap', e.target.value)} className="w-24 p-1 border rounded text-right text-sm font-mono" />
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm text-slate-600">Auto-Trim Max Overlap</label>
              <input type="number" step="0.1" value={localConfig.smartFixer.autoTrimMaxOverlap} onChange={(e) => updateSmartFixer('autoTrimMaxOverlap', e.target.value)} className="w-24 p-1 border rounded text-right text-sm font-mono" />
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm text-slate-600">Gap Review Warning</label>
              <input type="number" step="0.1" value={localConfig.smartFixer.reviewGapMax} onChange={(e) => updateSmartFixer('reviewGapMax', e.target.value)} className="w-24 p-1 border rounded text-right text-sm font-mono" />
            </div>
          </div>
        </div>

        {/* Topological Constraints */}
        <div className="bg-slate-50 p-4 rounded border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-3">Topological Rules</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm text-slate-600">Route Closure Warning (mm)</label>
              <input type="number" step="0.1" value={localConfig.smartFixer.closureWarningThreshold} onChange={(e) => updateSmartFixer('closureWarningThreshold', e.target.value)} className="w-24 p-1 border rounded text-right text-sm font-mono" />
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm text-slate-600">Route Closure Error (mm)</label>
              <input type="number" step="0.1" value={localConfig.smartFixer.closureErrorThreshold} onChange={(e) => updateSmartFixer('closureErrorThreshold', e.target.value)} className="w-24 p-1 border rounded text-right text-sm font-mono" />
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm text-slate-600">OLET Max Branch Ratio</label>
              <input type="number" step="0.01" value={localConfig.smartFixer.oletMaxRatioError} onChange={(e) => updateSmartFixer('oletMaxRatioError', e.target.value)} className="w-24 p-1 border rounded text-right text-sm font-mono" />
            </div>
             <div className="flex justify-between items-center">
              <label className="text-sm text-slate-600">Connection Tolerance (mm)</label>
              <input type="number" step="0.1" value={localConfig.smartFixer.connectionTolerance} onChange={(e) => updateSmartFixer('connectionTolerance', e.target.value)} className="w-24 p-1 border rounded text-right text-sm font-mono" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
