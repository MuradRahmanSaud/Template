import React, { useState } from 'react';
import { 
  Table, 
  FolderGit2, 
  Plus, 
  Settings, 
  HardDrive, 
  FileSpreadsheet, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Database,
  Trash2,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { SheetTab, SheetConfig, SheetDataState } from '../types';

interface SidebarProps {
  tabs: SheetTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onSyncTabs?: () => void;
  isSyncingTabs?: boolean;
  config: SheetConfig;
  onOpenSettings: () => void;
  isSyncing: boolean;
  totalRows: number;
  lastSynced?: Date | null;
  tabsData?: Record<string, SheetDataState>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onSyncTabs,
  isSyncingTabs = false,
  config,
  onOpenSettings,
  isSyncing,
  totalRows,
  lastSynced,
  tabsData,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside 
      className={`bg-teal-950 text-teal-50 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      {/* Brand & App Info */}
      <div className="px-3 py-2 min-h-[52px] border-b border-teal-900 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-400/30 flex-shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h1 className="font-bold text-xs text-white leading-tight truncate">
                SheetSync Hub
              </h1>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="mx-auto w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-400/30">
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </div>
        )}

        <button
          id="toggle-sidebar-btn"
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded text-teal-400 hover:text-white hover:bg-teal-900 text-xs transition"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Sheet Tabs List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 py-1 mt-2">
        {(tabs.filter((t) => !t.hidden).length > 0
          ? tabs.filter((t) => !t.hidden)
          : tabs
        ).map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className="group relative flex items-center"
            >
              <button
                id={`tab-btn-${tab.gid}`}
                onClick={() => onSelectTab(tab.id)}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition font-medium ${
                  isActive
                    ? 'bg-teal-700 text-white shadow-sm shadow-teal-950/40 font-semibold'
                    : 'text-teal-100/80 hover:bg-teal-900/80 hover:text-white'
                }`}
                title={`${tab.name}`}
              >
                <Table className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-teal-200' : 'text-teal-400 group-hover:text-teal-300'}`} />
                {!collapsed && (
                  <div className="truncate flex-1">
                    <div className="truncate leading-tight">{tab.name}</div>
                  </div>
                )}
                {isActive && !collapsed && (
                  <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold bg-teal-900 text-teal-100 rounded-full border border-teal-800">
                    {totalRows}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer Actions */}
      <div className={`px-2 py-1 border-t border-teal-900 flex ${collapsed ? 'flex-col' : 'flex-row'} items-center justify-center gap-1 min-h-[40px]`}>
        <button
          id="sidebar-settings-btn"
          onClick={onOpenSettings}
          className="p-1.5 flex-1 flex items-center justify-center rounded-lg text-teal-200 hover:bg-teal-900 hover:text-white text-xs transition w-full"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        <a
          id="open-google-sheet-external"
          href={`https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 flex-1 flex items-center justify-center rounded-lg text-teal-200 hover:bg-teal-900 hover:text-white text-xs transition w-full"
          title="Open Google Sheet in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        
        {onSyncTabs && (
          <button
            id="sync-sheet-tabs-btn"
            onClick={onSyncTabs}
            disabled={isSyncingTabs}
            className="p-1.5 flex-1 flex items-center justify-center rounded-lg text-teal-200 hover:bg-teal-900 hover:text-white text-xs transition w-full"
            title="Sync Tabs"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingTabs ? 'animate-spin text-teal-200' : ''}`} />
          </button>
        )}
      </div>
    </aside>
  );
};
