import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Settings as SettingsIcon, 
  Save, 
  FileSpreadsheet, 
  Globe, 
  FolderCheck, 
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Sliders,
  Layers
} from 'lucide-react';
import { SheetConfig, SheetTab } from '../types';
import { 
  DEFAULT_SPREADSHEET_ID, 
  DEFAULT_WEB_APP_URL, 
  DEFAULT_FOLDER_PATH, 
  fetchSheetData,
  fetchSheetTabs,
  createSheetTab,
  fetchServerDefaultConfig
} from '../services/sheetService';
import { AppsScriptGuideModal } from './AppsScriptGuideModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SheetConfig;
  onSaveConfig: (newConfig: SheetConfig) => Promise<boolean | void> | void;
  tabs: SheetTab[];
  onUpdateTabs: (tabs: SheetTab[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  tabs,
  onUpdateTabs,
}) => {
  const [spreadsheetId, setSpreadsheetId] = useState(config.spreadsheetId);
  const [webAppUrl, setWebAppUrl] = useState(config.webAppUrl);
  const [folderPath, setFolderPath] = useState(config.folderPath);
  const [localTabs, setLocalTabs] = useState<SheetTab[]>(tabs);
  const [activeModalTab, setActiveModalTab] = useState<'config' | 'tabs'>('config');

  useEffect(() => {
    if (isOpen) {
      setSpreadsheetId(config.spreadsheetId);
      setWebAppUrl(config.webAppUrl);
      setFolderPath(config.folderPath);
      setLocalTabs(tabs);
    }
  }, [isOpen, config, tabs]);

  const isDirty = useMemo(() => {
    const spreadsheetIdChanged = spreadsheetId.trim() !== (config.spreadsheetId || '').trim();
    const webAppUrlChanged = webAppUrl.trim() !== (config.webAppUrl || '').trim();
    const folderPathChanged = folderPath.trim() !== (config.folderPath || '').trim();
    const tabsChanged = JSON.stringify(localTabs) !== JSON.stringify(tabs);
    return spreadsheetIdChanged || webAppUrlChanged || folderPathChanged || tabsChanged;
  }, [spreadsheetId, webAppUrl, folderPath, localTabs, config, tabs]);

  const [newTabName, setNewTabName] = useState('');

  const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; message?: string } | null>(null);
  const [isDetectingTabs, setIsDetectingTabs] = useState(false);
  const [isCreatingTab, setIsCreatingTab] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  if (!isOpen) return null;

  const handleResetDefaults = async () => {
    const serverDefaults = await fetchServerDefaultConfig();
    setSpreadsheetId(serverDefaults?.spreadsheetId || DEFAULT_SPREADSHEET_ID);
    setWebAppUrl(serverDefaults?.webAppUrl || DEFAULT_WEB_APP_URL);
    setFolderPath(serverDefaults?.folderPath || DEFAULT_FOLDER_PATH);
  };

  const handleTestConnection = async () => {
    try {
      setTestStatus({ loading: true });
      const firstGid = localTabs[0]?.gid || '0';
      const result = await fetchSheetData(spreadsheetId, firstGid);
      
      setTestStatus({
        loading: false,
        success: true,
        message: `Successfully connected! Found ${result.headers.length} columns and ${result.rows.length} rows in sheet (GID: ${firstGid}).`,
      });
    } catch (err: any) {
      setTestStatus({
        loading: false,
        success: false,
        message: `Connection failed: ${err.message || 'Check Sheet sharing permissions and Web App URL.'}`,
      });
    }
  };

  const handleAutoDetectTabs = async () => {
    try {
      setIsDetectingTabs(true);
      const fetchedTabs = await fetchSheetTabs(spreadsheetId.trim());
      if (fetchedTabs && fetchedTabs.length > 0) {
        setLocalTabs(fetchedTabs);
        setTestStatus({
          loading: false,
          success: true,
          message: `Detected ${fetchedTabs.length} tabs directly from Google Sheet: ${fetchedTabs.map(t => t.name).join(', ')}`,
        });
      }
    } catch (err: any) {
      setTestStatus({
        loading: false,
        success: false,
        message: `Failed to detect tabs: ${err.message}`,
      });
    } finally {
      setIsDetectingTabs(false);
    }
  };

  const handleAddTab = async () => {
    if (!newTabName.trim()) {
      setTestStatus({
        loading: false,
        success: false,
        message: 'Please enter a name for the new tab.',
      });
      return;
    }

    setIsCreatingTab(true);
    try {
      const res = await createSheetTab(spreadsheetId.trim(), newTabName.trim(), webAppUrl.trim());
      if (res.success && res.tab) {
        setLocalTabs([...localTabs, res.tab]);
        setNewTabName('');
        setTestStatus({
          loading: false,
          success: true,
          message: `Created new tab "${res.tab.name}" successfully!`,
        });
      } else {
        setTestStatus({
          loading: false,
          success: false,
          message: `Failed to create tab: ${res.error}`,
        });
      }
    } catch (err: any) {
      setTestStatus({
        loading: false,
        success: false,
        message: `Failed to create tab: ${err.message}`,
      });
    } finally {
      setIsCreatingTab(false);
    }
  };

  const handleDeleteTab = (id: string) => {
    if (localTabs.length <= 1) return;
    setLocalTabs(localTabs.filter((t) => t.id !== id));
  };

  const handleToggleTabVisibility = (id: string) => {
    setLocalTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, hidden: !t.hidden } : t))
    );
  };

  const handleSave = () => {
    try {
      onSaveConfig({
        spreadsheetId: spreadsheetId.trim(),
        webAppUrl: webAppUrl.trim(),
        folderPath: folderPath.trim(),
      });
      onUpdateTabs(localTabs);
      onClose();
    } catch (e) {
      console.error("Save error:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center border border-teal-500">
              <SettingsIcon className="w-4 h-4 text-teal-100" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Configuration & Sheet Tabs</h3>
              <p className="text-[11px] text-teal-200">Google Sheet ID, Apps Script URL & Drive Folder</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-teal-200 hover:text-white hover:bg-teal-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body with Vertical Tabs */}
        <div className="flex flex-1 min-h-[360px] overflow-hidden">
          {/* Vertical Sidebar */}
          <div className="w-48 bg-slate-100/80 border-r border-slate-200 p-2.5 flex flex-col gap-1.5 shrink-0">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Category
            </div>
            <button
              type="button"
              onClick={() => setActiveModalTab('config')}
              className={`w-full px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-between transition text-left cursor-pointer ${
                activeModalTab === 'config'
                  ? 'bg-teal-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sliders className={`w-4 h-4 ${activeModalTab === 'config' ? 'text-white' : 'text-teal-600'}`} />
                <span>Configuration</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveModalTab('tabs')}
              className={`w-full px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-between transition text-left cursor-pointer ${
                activeModalTab === 'tabs'
                  ? 'bg-teal-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Layers className={`w-4 h-4 shrink-0 ${activeModalTab === 'tabs' ? 'text-white' : 'text-teal-600'}`} />
                <span className="truncate">Sheet Tabs</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                  activeModalTab === 'tabs' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'
                }`}
              >
                {localTabs.length}
              </span>
            </button>
          </div>

          {/* Right Main Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Test Status Banner */}
          {testStatus && (
            <div
              className={`p-3 rounded-lg border flex items-start gap-2 ${
                testStatus.loading
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : testStatus.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {testStatus.loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 mt-0.5 flex-shrink-0" />
              ) : testStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <span className="font-semibold">
                  {testStatus.loading
                    ? 'Testing Connection...'
                    : testStatus.success
                    ? 'Connection Active'
                    : 'Connection Notice'}
                </span>
                <p className="text-[11px] mt-0.5">{testStatus.message}</p>
              </div>
            </div>
          )}

          {activeModalTab === 'config' ? (
            /* TAB 1: App Configuration */
            <div className="space-y-4">
              {/* Google Spreadsheet ID */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                    Google Spreadsheet ID
                  </span>
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-teal-600 hover:text-teal-800 flex items-center gap-1 font-normal"
                  >
                    <span>Open in Sheet</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <input
                  type="text"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  placeholder="e.g. 1ryDvcsvIFv85mGX8SF4o7L5EHXb7f6at4-Yf7pck3lk"
                  className="w-full px-2.5 py-1.5 bg-slate-50 focus:bg-white border border-slate-300 focus:border-teal-500 rounded-md font-mono text-xs text-slate-800"
                />
                <p className="text-[11px] text-slate-400">
                  Extracted from your sheet URL between /d/ and /edit
                </p>
              </div>

              {/* Web App URL */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-teal-600" />
                    Google Apps Script Web App URL
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsGuideOpen(true)}
                    className="text-[11px] text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded font-medium transition flex items-center gap-1"
                    title="View Apps Script Code and setup guide to fix Drive Access Denied"
                  >
                    <span>🛠️ Apps Script Code & Drive Fix Guide</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={webAppUrl}
                  onChange={(e) => setWebAppUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-2.5 py-1.5 bg-slate-50 focus:bg-white border border-slate-300 focus:border-teal-500 rounded-md font-mono text-xs text-slate-800"
                />
                <p className="text-[11px] text-slate-400">
                  Deployed Apps Script executable URL for ADD, UPDATE, DELETE & UPLOAD_FILE
                </p>
              </div>

              {/* Google Drive Upload Folder */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <FolderCheck className="w-3.5 h-3.5 text-teal-600" />
                  Google Drive Target Folder Name / Path
                </label>
                <input
                  type="text"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  placeholder="Murad Rahman Saud"
                  className="w-full px-2.5 py-1.5 bg-slate-50 focus:bg-white border border-slate-300 focus:border-teal-500 rounded-md text-xs text-slate-800"
                />
                <p className="text-[11px] text-slate-400">
                  Files & photos will be saved inside this Google Drive folder automatically
                </p>
              </div>
            </div>
          ) : (
            /* TAB 2: Sheet Tabs Management */
            <div className="space-y-3">
              <div className="font-semibold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                  Managed Sheet Tabs (GIDs)
                </span>
                <button
                  type="button"
                  id="auto-detect-tabs-btn"
                  onClick={handleAutoDetectTabs}
                  disabled={isDetectingTabs}
                  className="text-[11px] text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 transition"
                  title="Fetch tab names directly from Google Sheet"
                >
                  <RefreshCw className={`w-3 h-3 ${isDetectingTabs ? 'animate-spin' : ''}`} />
                  <span>{isDetectingTabs ? 'Detecting...' : 'Auto-Detect Names'}</span>
                </button>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {localTabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs transition ${
                      tab.hidden ? 'bg-slate-100/90 border-slate-300' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate flex-1 min-w-0 mr-2">
                      <span className={`font-medium truncate ${tab.hidden ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {tab.name}
                      </span>
                      <span className="font-mono text-[11px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 shrink-0">
                        GID: {tab.gid}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleTabVisibility(tab.id)}
                        className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition ${
                          tab.hidden
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                        }`}
                        title={tab.hidden ? 'Tab is hidden from sidebar navigation. Click to show.' : 'Tab is visible in sidebar navigation. Click to hide.'}
                      >
                        {tab.hidden ? (
                          <>
                            <EyeOff className="w-3 h-3 text-amber-600" />
                            <span>Hidden</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3 text-emerald-600" />
                            <span>Visible</span>
                          </>
                        )}
                      </button>

                      {localTabs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTab(tab.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                          title="Delete Tab"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Tab inputs */}
              <div className="flex gap-2 pt-2 border-t border-slate-200">
                <input
                  type="text"
                  placeholder="New Tab Name"
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800"
                />
                <button
                  type="button"
                  onClick={handleAddTab}
                  disabled={isCreatingTab || !newTabName.trim()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-medium flex items-center gap-1 transition disabled:opacity-50"
                >
                  {isCreatingTab ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{isCreatingTab ? 'Creating...' : 'Create & Add'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaults}
              className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded text-xs flex items-center gap-1 transition"
              title="Reset to initial values"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Defaults</span>
            </button>
            <button
              onClick={handleTestConnection}
              disabled={testStatus?.loading}
              className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded text-xs font-medium transition"
            >
              {testStatus?.loading ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-medium transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className={`px-4 py-1.5 rounded font-semibold flex items-center gap-1.5 transition shadow-xs ${
                isSaving || !isDirty
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                  : 'bg-teal-600 hover:bg-teal-700 text-white cursor-pointer'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-200" />
                  <span>Saving to GID 0...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <AppsScriptGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        webAppUrl={webAppUrl}
        spreadsheetId={spreadsheetId}
      />
    </div>
  );
};
