import React, { useState, useEffect, useCallback } from 'react';
import { 
  fetchSheetData, 
  fetchSheetTabs,
  fetchDataTypeConfigs,
  saveColumnTypesToSheet,
  saveAppConfigToSheet,
  fetchAppConfigFromSheet,
  saveSheetTabsConfigToSheet,
  fetchSheetTabsConfigFromSheet,
  addRowToSheet, 
  updateRowInSheet, 
  deleteRowFromSheet,
  addSheetColumn,
  DEFAULT_SPREADSHEET_ID,
  DEFAULT_WEB_APP_URL,
  DEFAULT_FOLDER_PATH,
  INITIAL_TABS
} from './services/sheetService';
import { SheetConfig, SheetTab, SheetDataState, ColumnTypeMap, ColumnConfig } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DataTable } from './components/DataTable';
import { RecordModal } from './components/RecordModal';
import { DataTypeModal } from './components/DataTypeModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { SettingsModal } from './components/SettingsModal';
import { AlertCircle, CheckCircle2, RefreshCw, X } from 'lucide-react';

export interface SyncTask {
  id: string;
  type: 'add' | 'edit' | 'delete' | 'config' | 'tabs_config';
  gid: string;
  spreadsheetId: string;
  webAppUrl: string;
  formData?: Record<string, any>;
  idKey?: string;
  idValue?: string | number;
  deleteDriveFiles?: boolean;
  rowToDelete?: Record<string, any>;
  sheetName?: string;
  columnTypes?: Record<string, ColumnConfig>;
  tabsPayload?: SheetTab[];
}

export default function App() {
  // Check if defaults changed in code, to bust cache
  const codeDefaultsHash = `${DEFAULT_SPREADSHEET_ID}|${DEFAULT_WEB_APP_URL}|${JSON.stringify(INITIAL_TABS)}`;
  const cachedDefaultsHash = localStorage.getItem('sheetsync_code_defaults_hash');
  
  if (cachedDefaultsHash !== codeDefaultsHash) {
    // Developer changed the defaults in code. Clear outdated local data.
    localStorage.removeItem('sheetsync_config');
    localStorage.removeItem('sheetsync_tabs');
    localStorage.setItem('sheetsync_code_defaults_hash', codeDefaultsHash);
  }

  // Application Configuration (loaded from localStorage or defaults)
  const [config, setConfig] = useState<SheetConfig>(() => {
    const saved = localStorage.getItem('sheetsync_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      spreadsheetId: DEFAULT_SPREADSHEET_ID,
      webAppUrl: DEFAULT_WEB_APP_URL,
      folderPath: DEFAULT_FOLDER_PATH,
    };
  });

  // Sheet Tabs (loaded from localStorage or defaults)
  const [tabs, setTabs] = useState<SheetTab[]>(() => {
    const saved = localStorage.getItem('sheetsync_tabs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_TABS;
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    return tabs[0]?.id || 'tab-1';
  });

  // Active Sheet Data state
  const [dataState, setDataState] = useState<SheetDataState>({
    headers: [],
    rows: [],
    loading: false,
    error: null,
    lastSynced: null,
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSyncingTabs, setIsSyncingTabs] = useState<boolean>(false);

  // Column Input Types map { [gid]: { [columnName]: inputType } }
  const [columnTypeMap, setColumnTypeMap] = useState<ColumnTypeMap>({});

  // In-memory tab data cache per GID for instant tab switching
  const [tabCache, setTabCache] = useState<
    Record<string, { headers: string[]; rows: Record<string, any>[]; lastSynced: Date }>
  >({});

  // Modals state
  const [recordModal, setRecordModal] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    data: Record<string, any> | null;
  }>({
    isOpen: false,
    mode: 'add',
    data: null,
  });

  const [isDataTypeModalOpen, setIsDataTypeModalOpen] = useState<boolean>(false);

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    row: Record<string, any> | null;
  }>({
    isOpen: false,
    row: null,
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    url: string | null;
    title: string;
  }>({
    isOpen: false,
    url: null,
    title: '',
  });

  // Sequential Sync Queue state
  const [syncQueue, setSyncQueue] = useState<SyncTask[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState<boolean>(false);

  const pendingSyncCount = syncQueue.length + (isProcessingQueue ? 1 : 0);

  // Sequentially process items in syncQueue
  useEffect(() => {
    if (isProcessingQueue || syncQueue.length === 0) return;

    const currentTask = syncQueue[0];
    setIsProcessingQueue(true);

    const processTask = async () => {
      try {
        if (currentTask.type === 'add') {
          const res = await addRowToSheet(
            currentTask.spreadsheetId,
            currentTask.gid,
            currentTask.formData!,
            currentTask.webAppUrl
          );
          if (!res.success) {
            console.warn('Background add sync warning:', res.error);
          }
        } else if (currentTask.type === 'edit') {
          const res = await updateRowInSheet(
            currentTask.spreadsheetId,
            currentTask.gid,
            currentTask.idKey!,
            currentTask.idValue!,
            currentTask.formData!,
            currentTask.webAppUrl
          );
          if (!res.success) {
            console.warn('Background edit sync warning:', res.error);
          }
        } else if (currentTask.type === 'delete') {
          const res = await deleteRowFromSheet(
            currentTask.spreadsheetId,
            currentTask.gid,
            currentTask.idKey!,
            currentTask.idValue!,
            currentTask.webAppUrl,
            {
              row: currentTask.rowToDelete,
              deleteAssociatedFiles: currentTask.deleteDriveFiles,
            }
          );
          if (!res.success) {
            console.warn('Background delete sync warning:', res.error);
          }
        } else if (currentTask.type === 'config') {
          const res = await saveColumnTypesToSheet(
            currentTask.spreadsheetId,
            currentTask.gid,
            currentTask.sheetName!,
            currentTask.columnTypes!,
            currentTask.webAppUrl
          );
          if (!res.success) {
            console.warn('Background config sync warning:', res.error);
          }
        } else if (currentTask.type === 'tabs_config') {
          const res = await saveSheetTabsConfigToSheet(
            currentTask.spreadsheetId,
            currentTask.tabsPayload!,
            currentTask.webAppUrl
          );
          if (!res.success) {
            console.warn('Background tabs config sync warning:', res.error);
          }
        }
      } catch (err) {
        console.error('Error executing sync task:', err);
      } finally {
        setSyncQueue((prev) => prev.slice(1));
        setIsProcessingQueue(false);
      }
    };

    processTask();
  }, [syncQueue, isProcessingQueue]);

  // Toast Notification state
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Find active tab object
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Save config to localStorage & sync to Google Sheet (GID: 0)
  const handleSaveConfig = async (newConfig: SheetConfig): Promise<boolean> => {
    if (newConfig.spreadsheetId !== config.spreadsheetId) {
      setTabCache({});
    }
    setConfig(newConfig);
    localStorage.setItem('sheetsync_config', JSON.stringify(newConfig));

    try {
      const res = await saveAppConfigToSheet(newConfig, newConfig.webAppUrl);
      if (res.success) {
        showToast('success', 'Configuration saved to GID 0 and active in application!');
      } else {
        showToast('info', 'Configuration saved locally. (' + (res.error || 'GID 0 sync pending') + ')');
      }
    } catch (err: any) {
      console.warn('Could not sync config to GID 0:', err);
      showToast('info', 'Configuration saved locally.');
    }

    // Trigger re-sync with the updated configuration
    syncSheetTabs(newConfig.spreadsheetId, false);
    syncDataTypeConfigs(newConfig.spreadsheetId);
    loadSheetData(newConfig, activeTab?.gid, true);
    return true;
  };

  // Save tabs to localStorage & queue sync to GID 0
  const handleUpdateTabs = (newTabs: SheetTab[]) => {
    setTabs(newTabs);
    localStorage.setItem('sheetsync_tabs', JSON.stringify(newTabs));

    const visibleTabs = newTabs.filter((t) => !t.hidden);
    const validTabs = visibleTabs.length > 0 ? visibleTabs : newTabs;
    if (!validTabs.some((t) => t.id === activeTabId)) {
      setActiveTabId(validTabs[0]?.id || '');
    }

    // Queue background task to save tab configuration to Settings sheet (GID 0)
    const newTask: SyncTask = {
      id: `tabs_config-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'tabs_config',
      gid: '0',
      spreadsheetId: config.spreadsheetId,
      webAppUrl: config.webAppUrl,
      tabsPayload: newTabs,
    };
    setSyncQueue((prev) => [...prev, newTask]);
  };

  // Dynamically fetch and sync sheet tab names based on GID from Google Sheets
  const syncSheetTabs = useCallback(async (currentSpreadsheetId = config.spreadsheetId, notify = false) => {
    setIsSyncingTabs(true);
    try {
      const fetchedTabs = await fetchSheetTabs(currentSpreadsheetId);
      if (fetchedTabs && fetchedTabs.length > 0) {
        setTabs((prevTabs) => {
          // Keep only tabs that still exist in fetchedTabs, preserving hidden flag
          const updated = prevTabs
            .filter((pt) => fetchedTabs.some((ft) => String(ft.gid).trim() === String(pt.gid).trim()))
            .map((pt) => {
              const match = fetchedTabs.find((ft) => String(ft.gid).trim() === String(pt.gid).trim());
              if (match && match.name) {
                return { ...pt, name: match.name, hidden: pt.hidden };
              }
              return pt;
            });

          // Add any newly discovered tabs from the Google Sheet
          fetchedTabs.forEach((ft) => {
            if (!updated.some((ut) => String(ut.gid).trim() === String(ft.gid).trim())) {
              updated.push(ft);
            }
          });

          localStorage.setItem('sheetsync_tabs', JSON.stringify(updated));
          
          // Ensure activeTabId is valid if the currently active tab was deleted
          setActiveTabId((currentActiveId) => {
            if (updated.length > 0 && !updated.some((t) => t.id === currentActiveId)) {
              return updated[0].id;
            }
            return currentActiveId;
          });

          return updated;
        });

        // Do not show notification after sync as requested
      }
    } catch (e) {
      console.error('Failed to sync sheet tabs:', e);
      if (notify) {
        showToast('error', 'Could not fetch tab names from Google Sheet.');
      }
    } finally {
      setIsSyncingTabs(false);
    }
  }, [config.spreadsheetId]);

  // Fetch and sync configuration from GID 0 if present in Google Sheet
  const syncAppConfig = useCallback(async (currentSpreadsheetId = config.spreadsheetId) => {
    try {
      const remoteConfig = await fetchAppConfigFromSheet(currentSpreadsheetId);
      if (remoteConfig) {
        setConfig((prev) => {
          const updated = {
            spreadsheetId: remoteConfig.spreadsheetId || prev.spreadsheetId,
            webAppUrl: remoteConfig.webAppUrl || prev.webAppUrl,
            folderPath: remoteConfig.folderPath || prev.folderPath,
          };
          localStorage.setItem('sheetsync_config', JSON.stringify(updated));
          return updated;
        });
      }

      // Sync tab configurations (hidden status) saved in GID 0
      const remoteTabsConfig = await fetchSheetTabsConfigFromSheet(currentSpreadsheetId);
      if (remoteTabsConfig && remoteTabsConfig.length > 0) {
        setTabs((prevTabs) => {
          const merged = prevTabs.map((pt) => {
            const rTab = remoteTabsConfig.find(
              (rt) => String(rt.gid).trim() === String(pt.gid).trim() || rt.id === pt.id
            );
            if (rTab && typeof rTab.hidden === 'boolean') {
              return { ...pt, hidden: rTab.hidden };
            }
            return pt;
          });
          localStorage.setItem('sheetsync_tabs', JSON.stringify(merged));
          return merged;
        });
      }
    } catch (e) {
      console.warn('Could not sync app config from GID 0:', e);
    }
  }, [config.spreadsheetId]);

  // Fetch and sync column input types from Settings sheet (GID 0)
  const syncDataTypeConfigs = useCallback(async (currentSpreadsheetId = config.spreadsheetId) => {
    try {
      const fetchedMap = await fetchDataTypeConfigs(currentSpreadsheetId);
      if (fetchedMap && Object.keys(fetchedMap).length > 0) {
        setColumnTypeMap((prev) => {
          const merged = { ...prev, ...fetchedMap };
          return merged;
        });
      }
    } catch (e) {
      console.error('Failed to fetch data type configs:', e);
    }
  }, [config.spreadsheetId]);

  // Initial sync of real sheet tab names, app config & column types from Google Sheet
  useEffect(() => {
    syncAppConfig(config.spreadsheetId);
    syncSheetTabs(config.spreadsheetId, false);
    syncDataTypeConfigs(config.spreadsheetId);
  }, [config.spreadsheetId, syncAppConfig, syncSheetTabs, syncDataTypeConfigs]);

  const handleAddColumn = async (columnName: string) => {
    if (!activeTab) return false;
    try {
      const res = await addSheetColumn(config.spreadsheetId, activeTab.gid, columnName, config.webAppUrl);
      if (res.success) {
        showToast('success', `Column "${columnName}" added to Google Sheet!`);
        // Refresh sheet data to load new column
        loadSheetData(config, activeTab.gid, true);
        return true;
      }
      throw new Error(res.error || 'Failed to add column');
    } catch (err: any) {
      showToast('error', `Failed to add column: ${err.message}`);
      return false;
    }
  };

  // Save column input types to Settings sheet - Updates local state immediately & queues sequential sync
  const handleSaveColumnTypes = (
    gid: string,
    sheetName: string,
    columnTypes: Record<string, ColumnConfig>
  ): boolean => {
    // 1. Optimistic UI update immediately
    setColumnTypeMap((prev) => ({
      ...prev,
      [gid]: columnTypes,
    }));

    // 2. Queue background task
    const newTask: SyncTask = {
      id: `config-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'config',
      gid,
      sheetName,
      spreadsheetId: config.spreadsheetId,
      webAppUrl: config.webAppUrl,
      columnTypes,
    };
    setSyncQueue((prev) => [...prev, newTask]);

    return true;
  };

  // Load Sheet Data function with local tab caching for instant switching
  const loadSheetData = useCallback(
    async (currentConfig = config, currentGid = activeTab?.gid, forceRefresh = false) => {
      if (!currentGid) return;

      if (!forceRefresh && tabCache[currentGid]) {
        const cached = tabCache[currentGid];
        setDataState({
          headers: cached.headers,
          rows: cached.rows,
          loading: false,
          error: null,
          lastSynced: cached.lastSynced,
        });
        return;
      }

      setDataState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const { headers, rows } = await fetchSheetData(currentConfig.spreadsheetId, currentGid);
        const syncedAt = new Date();

        setDataState({
          headers,
          rows,
          loading: false,
          error: null,
          lastSynced: syncedAt,
        });

        setTabCache((prev) => ({
          ...prev,
          [currentGid]: {
            headers,
            rows,
            lastSynced: syncedAt,
          },
        }));
      } catch (err: any) {
        console.error('Error fetching sheet data:', err);
        const errMsg = err.message || 'Failed to load sheet data';
        setDataState((prev) => ({
          ...prev,
          loading: false,
          error: errMsg,
        }));
        showToast('error', errMsg);
      }
    },
    [config, activeTab?.gid, tabCache]
  );

  // Sync on active tab or config change
  useEffect(() => {
    if (activeTab?.gid) {
      if (tabCache[activeTab.gid]) {
        const cached = tabCache[activeTab.gid];
        setDataState({
          headers: cached.headers,
          rows: cached.rows,
          loading: false,
          error: null,
          lastSynced: cached.lastSynced,
        });
      } else {
        loadSheetData(config, activeTab.gid, false);
      }
    }
  }, [activeTabId, activeTab?.gid, config.spreadsheetId]);

  // Handle Save Record (Add or Edit) - Updates local state immediately & queues sequential sync
  const handleSaveRecord = (
    formData: Record<string, any>,
    idKey?: string,
    idValue?: string | number
  ): boolean => {
    if (!activeTab?.gid) return false;

    const gid = activeTab.gid;

    if (recordModal.mode === 'add') {
      // 1. Optimistic UI update: append row immediately
      setDataState((prev) => ({
        ...prev,
        rows: [...prev.rows, formData],
      }));
      setTabCache((prev) => {
        const existing = prev[gid];
        if (!existing) return prev;
        return {
          ...prev,
          [gid]: { ...existing, rows: [...existing.rows, formData] },
        };
      });

      // 2. Queue background task
      const newTask: SyncTask = {
        id: `add-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: 'add',
        gid,
        spreadsheetId: config.spreadsheetId,
        webAppUrl: config.webAppUrl,
        formData,
      };
      setSyncQueue((prev) => [...prev, newTask]);
    } else {
      // Edit mode
      if (!idKey || idValue === undefined || idValue === null) return false;

      // 1. Optimistic UI update: update row immediately
      setDataState((prev) => ({
        ...prev,
        rows: prev.rows.map((r) => {
          const val = r[idKey] ?? r[idKey.trim()];
          if (String(val) === String(idValue)) {
            return { ...r, ...formData };
          }
          return r;
        }),
      }));
      setTabCache((prev) => {
        const existing = prev[gid];
        if (!existing) return prev;
        return {
          ...prev,
          [gid]: {
            ...existing,
            rows: existing.rows.map((r) => {
              const val = r[idKey] ?? r[idKey.trim()];
              if (String(val) === String(idValue)) {
                return { ...r, ...formData };
              }
              return r;
            }),
          },
        };
      });

      // 2. Queue background task
      const newTask: SyncTask = {
        id: `edit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: 'edit',
        gid,
        spreadsheetId: config.spreadsheetId,
        webAppUrl: config.webAppUrl,
        formData,
        idKey,
        idValue,
      };
      setSyncQueue((prev) => [...prev, newTask]);
    }

    return true;
  };

  // Handle Delete Record - Updates local state immediately & queues sequential sync
  const handleConfirmDelete = (
    idKey: string,
    idValue: string | number,
    deleteDriveFiles: boolean = true,
    rowToDelete?: Record<string, any>
  ): boolean => {
    if (!activeTab?.gid) return false;

    const gid = activeTab.gid;
    const targetRow = rowToDelete || deleteModal.row || undefined;

    // 1. Optimistic UI update: remove row immediately
    setDataState((prev) => ({
      ...prev,
      rows: prev.rows.filter((r) => {
        const val = r[idKey] ?? r[idKey.trim()];
        return String(val) !== String(idValue);
      }),
    }));
    setTabCache((prev) => {
      const existing = prev[gid];
      if (!existing) return prev;
      return {
        ...prev,
        [gid]: {
          ...existing,
          rows: existing.rows.filter((r) => {
            const val = r[idKey] ?? r[idKey.trim()];
            return String(val) !== String(idValue);
          }),
        },
      };
    });

    // 2. Queue background task
    const newTask: SyncTask = {
      id: `delete-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'delete',
      gid,
      spreadsheetId: config.spreadsheetId,
      webAppUrl: config.webAppUrl,
      idKey,
      idValue,
      deleteDriveFiles,
      rowToDelete: targetRow,
    };
    setSyncQueue((prev) => [...prev, newTask]);

    return true;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-800">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-3.5 py-2.5 rounded-lg shadow-lg border text-xs flex items-center gap-2 animate-in slide-in-from-top-2 duration-200 ${
            toast.type === 'success'
              ? 'bg-teal-900 text-white border-teal-700'
              : toast.type === 'error'
              ? 'bg-rose-900 text-white border-rose-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-teal-300 flex-shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-300 flex-shrink-0" />
          ) : (
            <RefreshCw className="w-4 h-4 text-blue-300 flex-shrink-0" />
          )}
          <span className="font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-slate-300 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={(id) => {
          setActiveTabId(id);
          setSearchQuery('');
        }}
        onSyncTabs={() => syncSheetTabs(config.spreadsheetId, true)}
        isSyncingTabs={isSyncingTabs}
        config={config}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isSyncing={dataState.loading}
        totalRows={dataState.rows.length}
        lastSynced={dataState.lastSynced}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        {/* Header */}
        <Header
          activeTab={activeTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSync={() => loadSheetData(config, activeTab?.gid, true)}
          isSyncing={dataState.loading}
          pendingCount={pendingSyncCount}
          onAddRecord={() =>
            setRecordModal({
              isOpen: true,
              mode: 'add',
              data: null,
            })
          }
          onOpenDataTypeModal={() => setIsDataTypeModalOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Error Notification Alert */}
        {dataState.error && (
          <div className="m-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="font-semibold block text-amber-950">
                  Google Sheet Sync Notice
                </strong>
                <p className="text-amber-800 mt-0.5">{dataState.error}</p>
                <p className="text-[11px] text-amber-700 mt-1">
                  💡 Tip: Make sure the Google Sheet sharing permission is set to <strong>"Anyone with the link can view"</strong> so the table data can be read.
                </p>
              </div>
            </div>
            <button
              onClick={() => loadSheetData(config, activeTab?.gid, true)}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium text-xs flex items-center gap-1 flex-shrink-0 transition"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Table View */}
        <DataTable
          headers={dataState.headers}
          rows={dataState.rows}
          loading={dataState.loading}
          searchQuery={searchQuery}
          columnConfigs={columnTypeMap[activeTab?.gid || ''] || {}}
          onOpenDataTypeModal={() => setIsDataTypeModalOpen(true)}
          onEditRow={(row) =>
            setRecordModal({
              isOpen: true,
              mode: 'edit',
              data: row,
            })
          }
          onDeleteRow={(row) =>
            setDeleteModal({
              isOpen: true,
              row,
            })
          }
          onPreviewImage={(url, title) =>
            setPreviewModal({
              isOpen: true,
              url,
              title: title || 'File Preview',
            })
          }
          onAddRecord={() =>
            setRecordModal({
              isOpen: true,
              mode: 'add',
              data: null,
            })
          }
          onSync={() => loadSheetData(config, activeTab?.gid, true)}
        />
      </div>

      {/* Add / Edit Record Modal */}
      <RecordModal
        isOpen={recordModal.isOpen}
        onClose={() => setRecordModal({ isOpen: false, mode: 'add', data: null })}
        mode={recordModal.mode}
        headers={dataState.headers}
        initialData={recordModal.data}
        columnTypes={columnTypeMap[activeTab?.gid || ''] || {}}
        onSave={handleSaveRecord}
        targetDriveFolder={config.folderPath}
        webAppUrl={config.webAppUrl}
      />

      {/* Column Input Types Configuration Modal (Saves to Data Type GID: 613025814) */}
      <DataTypeModal
        isOpen={isDataTypeModalOpen}
        onClose={() => setIsDataTypeModalOpen(false)}
        activeTab={activeTab}
        headers={dataState.headers}
        currentColumnTypes={columnTypeMap[activeTab?.gid || ''] || {}}
        onSaveColumnTypes={handleSaveColumnTypes}
        onAddColumn={handleAddColumn}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, row: null })}
        row={deleteModal.row}
        headers={dataState.headers}
        columnTypes={columnTypeMap[activeTab?.gid || ''] || {}}
        onConfirm={handleConfirmDelete}
      />

      {/* Image / Drive File Preview Modal */}
      <ImagePreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, url: null, title: '' })}
        url={previewModal.url}
        title={previewModal.title}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
        tabs={tabs}
        onUpdateTabs={handleUpdateTabs}
      />
    </div>
  );
}
