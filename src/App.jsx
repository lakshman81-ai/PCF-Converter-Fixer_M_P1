import React, { useState } from 'react';
import { Header } from './ui/components/Header';
import { StatusBar } from './ui/components/StatusBar';
import { DataTableTab } from './ui/tabs/DataTableTab';
import { CoreProcessorTab } from './ui/tabs/CoreProcessorTab';
import { ConfigTab } from './ui/tabs/ConfigTab';
import { OutputTab } from './ui/tabs/OutputTab';
import { CanvasTab } from './ui/tabs/CanvasTab';
import { AppProvider, useAppContext } from './store/AppContext';
import { useStore } from './store/useStore';

function MainApp() {
  const [activeTab, setActiveTab] = useState('data');
  const { state, dispatch } = useAppContext();
  const setZustandData = useStore(s => s.setDataTable);

  // Mock data loader for testing the UI and logic
  const loadMockData = () => {
    const mockData = [
      { _rowIndex: 1, type: "PIPE", ep1: {x: 0, y: 0, z: 0}, ep2: {x: 1000, y: 0, z: 0}, bore: 100 },
      { _rowIndex: 2, type: "PIPE", ep1: {x: 1005, y: 0, z: 0}, ep2: {x: 2000, y: 0, z: 0}, bore: 100 }, // 5mm gap
      { _rowIndex: 3, type: "TEE", ep1: {x: 2000, y: 0, z: 0}, ep2: {x: 2300, y: 0, z: 0}, cp: {x: 2150, y: 0, z: 0}, bp: {x: 2150, y: 150, z: 0}, bore: 100, branchBore: 50 },
      { _rowIndex: 4, type: "PIPE", ep1: {x: 2300, y: 0, z: 0}, ep2: {x: 3000, y: 0, z: 0}, bore: 100 },
      { _rowIndex: 5, type: "PIPE", ep1: {x: 2980, y: 0, z: 0}, ep2: {x: 4000, y: 0, z: 0}, bore: 100 }, // 20mm overlap
      { _rowIndex: 6, type: "PIPE", ep1: {x: 2150, y: 150, z: 0}, ep2: {x: 2150, y: 154, z: 0}, bore: 50 }, // 4mm micro pipe
      { _rowIndex: 7, type: "VALVE", ep1: {x: 2150, y: 154, z: 0}, ep2: {x: 2150, y: 354, z: 0}, bore: 50, skey: "VBFL" },
    ];
    dispatch({ type: "SET_DATA_TABLE", payload: mockData });
    setZustandData(mockData);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col pb-12">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {/* Mock Data Loader Button for Dev */}
        {state.dataTable.length === 0 && (
          <div className="mb-6 flex justify-center">
            <button onClick={loadMockData} className="px-4 py-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded font-medium transition shadow-sm border border-indigo-200">
              Load Mock Test Data
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 border-b border-slate-300 mb-6">
          <button
            onClick={() => setActiveTab('data')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'data' ? 'border-blue-600 text-blue-700 bg-white rounded-t' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            Data Table
          </button>
          <button
            onClick={() => setActiveTab('core')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'core' ? 'border-blue-600 text-blue-700 bg-white rounded-t' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            Core processor
          </button>
          <button
            onClick={() => setActiveTab('canvas')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-1 ${activeTab === 'canvas' ? 'border-blue-600 text-blue-700 bg-white rounded-t' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            <span>3D Topology</span>
            <span className="bg-blue-100 text-blue-700 py-0.5 px-1.5 rounded text-[10px] uppercase font-bold">New</span>
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'config' ? 'border-blue-600 text-blue-700 bg-white rounded-t' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            Config
          </button>
          <button
            onClick={() => setActiveTab('output')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'output' ? 'border-blue-600 text-blue-700 bg-white rounded-t' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            Output
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded shadow-sm min-h-[500px] border border-slate-200">
          {activeTab === 'data' && <DataTableTab />}
          {activeTab === 'core' && <div className="p-4"><CoreProcessorTab /></div>}
          {activeTab === 'canvas' && <div className="p-2"><CanvasTab /></div>}
          {activeTab === 'config' && <ConfigTab />}
          {activeTab === 'output' && <OutputTab />}
        </div>
      </main>

      <StatusBar />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
