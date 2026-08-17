import React from 'react';
import { 
  RefreshCw, 
  Plus, 
  Upload, 
  Search, 
  SlidersHorizontal, 
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { SheetTab } from '../types';

interface HeaderProps {
  activeTab?: SheetTab;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSync: () => void;
  isSyncing: boolean;
  pendingCount?: number;
  onAddRecord: () => void;
  onOpenDataTypeModal: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  searchQuery,
  onSearchChange,
  onSync,
  isSyncing,
  pendingCount = 0,
  onAddRecord,
  onOpenDataTypeModal,
  onOpenSettings,
}) => {

  return (
    <header className="bg-teal-950 border-b border-teal-900 px-3 py-2 sm:px-4 min-h-[52px] flex flex-wrap items-center justify-between gap-2.5 sticky top-0 z-20 text-teal-50">
      {/* Active Tab & Info */}
      <div className="flex items-center gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight leading-none">
              {activeTab?.name || 'Google Sheet'}
            </h2>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono bg-teal-900 text-teal-200 border border-teal-800 font-medium">
              GID: {activeTab?.gid}
            </span>
          </div>
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="flex-1 max-w-md min-w-[180px]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-teal-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            id="global-search-input"
            type="text"
            placeholder="Search across all columns..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-teal-900/90 hover:bg-teal-900 focus:bg-teal-900 border border-teal-800 focus:border-teal-400 rounded-md text-xs text-white placeholder-teal-500 transition focus:outline-none focus:ring-1 focus:ring-teal-400/40"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-teal-400 hover:text-white text-xs font-semibold"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5">
        {/* Sync Button */}
        <button
          id="sync-table-btn"
          onClick={onSync}
          disabled={isSyncing && pendingCount === 0}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition ${
            pendingCount > 0
              ? 'bg-amber-950/80 text-amber-100 border-amber-600/80 shadow-md font-semibold'
              : isSyncing
              ? 'bg-teal-950 text-teal-600 border-teal-900 cursor-not-allowed'
              : 'bg-teal-900 hover:bg-teal-800 text-teal-100 border-teal-800 hover:border-teal-700 shadow-2xs hover:text-white'
          }`}
          title={
            pendingCount > 0
              ? `${pendingCount} operation${pendingCount > 1 ? 's' : ''} syncing to Google Sheets...`
              : 'Fetch latest data from Google Sheet'
          }
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${
              pendingCount > 0 || isSyncing ? 'animate-spin text-amber-300' : 'text-teal-300'
            }`}
          />
          <span>{pendingCount > 0 ? 'Syncing' : isSyncing ? 'Syncing...' : 'Sync Table'}</span>
          {pendingCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.5 bg-amber-500 text-slate-950 font-extrabold rounded-full text-[10px] leading-tight animate-pulse shadow-xs">
              {pendingCount}
            </span>
          )}
        </button>

        {/* Input Types / Column Types Config */}
        <button
          id="header-column-types-btn"
          onClick={onOpenDataTypeModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-teal-900 hover:bg-teal-800 text-teal-100 border border-teal-800 hover:border-teal-700 hover:text-white transition shadow-2xs"
          title="Configure column input types for Data Type sheet (GID: 613025814)"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-teal-300" />
          <span>Column Types</span>
        </button>

        {/* Add Record */}
        <button
          id="header-add-record-btn"
          onClick={onAddRecord}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-teal-500 hover:bg-teal-400 text-teal-950 shadow-sm shadow-teal-950/30 transition active:scale-98"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Record</span>
        </button>
      </div>
    </header>
  );
};
