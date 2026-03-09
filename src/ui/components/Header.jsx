import React from 'react';

export function Header() {
  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
            PCF Validator & Smart Fixer
          </h1>
          <nav className="flex space-x-2">
            <button className="px-3 py-1.5 text-sm font-medium rounded hover:bg-slate-800 transition-colors flex items-center">
              Import PCF ▼
            </button>
            <button className="px-3 py-1.5 text-sm font-medium rounded hover:bg-slate-800 transition-colors flex items-center">
              Import Excel/CSV ▼
            </button>
          </nav>
        </div>

        <div className="flex items-center space-x-4 text-sm text-slate-400">
          <span>Project: <span className="text-slate-200">Default</span></span>
          <div className="h-4 w-px bg-slate-700"></div>
          <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div> Online</span>
        </div>
      </div>
    </header>
  );
}
