import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Save, 
  Loader2, 
  Database, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Folder,
  Sliders,
  FolderKanban,
  Table,
  FileText,
  Eye,
  EyeOff,
  Search,
  ChevronRight,
  Columns,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  RotateCcw,
  ArrowUpDown,
  ListOrdered,
  Key
} from 'lucide-react';
import { SheetTab, INPUT_TYPE_OPTIONS, DATA_TYPE_GID, ColumnConfig } from '../types';
import { normalizeColumnConfig, getOrderedHeaders } from '../services/sheetService';

interface DataTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: SheetTab;
  headers: string[];
  currentColumnTypes: Record<string, string | ColumnConfig>;
  onSaveColumnTypes: (
    gid: string, 
    sheetName: string, 
    columnTypes: Record<string, ColumnConfig>
  ) => Promise<boolean>;
  onAddColumn?: (columnName: string) => Promise<boolean>;
}

export const DataTypeModal: React.FC<DataTypeModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  headers,
  currentColumnTypes,
  onSaveColumnTypes,
  onAddColumn,
}) => {
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [columnSearchQuery, setColumnSearchQuery] = useState<string>('');
  
  // Ordered headers state for Drag-and-Drop sequence
  const [orderedHeaders, setOrderedHeaders] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [typesMap, setTypesMap] = useState<Record<string, string>>({});
  const [selectOptionsMap, setSelectOptionsMap] = useState<Record<string, string>>({});
  const [selectModesMap, setSelectModesMap] = useState<Record<string, 'single' | 'multi' | 'tab'>>({});
  const [folderPathsMap, setFolderPathsMap] = useState<Record<string, string>>({});
  const [showInTableMap, setShowInTableMap] = useState<Record<string, boolean>>({});
  const [showInFormMap, setShowInFormMap] = useState<Record<string, boolean>>({});
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [hasInitialized, setHasInitialized] = useState<boolean>(false);
  const [initialSnapshot, setInitialSnapshot] = useState<string>('');
  const [newColumnName, setNewColumnName] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [primaryColumn, setPrimaryColumn] = useState<string>('');

  const isDirty = useMemo(() => {
    if (!hasInitialized || !initialSnapshot) return false;
    const currentSnapshot = JSON.stringify({
      orderedHeaders,
      typesMap,
      selectOptionsMap,
      selectModesMap,
      folderPathsMap,
      showInTableMap,
      showInFormMap,
      primaryColumn,
    });
    return currentSnapshot !== initialSnapshot;
  }, [
    hasInitialized,
    initialSnapshot,
    orderedHeaders,
    typesMap,
    selectOptionsMap,
    selectModesMap,
    folderPathsMap,
    showInTableMap,
    showInFormMap,
    primaryColumn,
  ]);

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim() || !onAddColumn) return;
    setIsAddingColumn(true);
    setErrorMsg(null);
    try {
      const ok = await onAddColumn(newColumnName.trim());
      if (ok) {
        setSuccessMsg(`Column "${newColumnName.trim()}" added to sheet successfully!`);
        setNewColumnName('');
      }
    } catch(err: any) {
      setErrorMsg(err.message || 'Failed to add column');
    } finally {
      setIsAddingColumn(false);
    }
  };

  useEffect(() => {
    if (isOpen && !hasInitialized) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsSubmitting(false);
      setColumnSearchQuery('');
      setDraggedIndex(null);
      setDragOverIndex(null);

      // Sort initial headers based on saved order
      const sorted = getOrderedHeaders(headers, currentColumnTypes);
      // Ensure all headers from current sheet are included
      const allSorted = [...sorted];
      headers.forEach((h) => {
        if (!allSorted.includes(h)) {
          allSorted.push(h);
        }
      });
      setOrderedHeaders(allSorted);

      const initialTypes: Record<string, string> = {};
      const initialOptions: Record<string, string> = {};
      const initialSelectModes: Record<string, 'single' | 'multi' | 'tab'> = {};
      const initialFolders: Record<string, string> = {};
      const initialShowInTable: Record<string, boolean> = {};
      const initialShowInForm: Record<string, boolean> = {};

      headers.forEach((h) => {
        const rawConfig = currentColumnTypes[h] || currentColumnTypes[h.trim()];
        const norm = normalizeColumnConfig(rawConfig);
        const lower = h.toLowerCase().trim();
        
        let defaultFolderForCol = norm.folderPath || 'Murad Rahman Saud';
        if (!norm.folderPath) {
          if (/profile|avatar/i.test(lower)) {
            defaultFolderForCol = 'Murad Rahman Saud/Profile Pictures';
          } else if (/cover/i.test(lower)) {
            defaultFolderForCol = 'Murad Rahman Saud/Cover Photos';
          } else if (/photo|image|pic|picture/i.test(lower)) {
            defaultFolderForCol = 'Murad Rahman Saud/Photos';
          } else if (/doc|pdf|attachment/i.test(lower)) {
            defaultFolderForCol = 'Murad Rahman Saud/Documents';
          }
        }

        initialTypes[h] = norm.type || 'text';
        initialOptions[h] = norm.options || '';
        initialSelectModes[h] = norm.selectMode || 'single';
        initialFolders[h] = defaultFolderForCol;
        initialShowInTable[h] = norm.showInTable !== false;
        initialShowInForm[h] = norm.showInForm !== false;
      });

      let pCol = headers.find((h) => {
        const rawConfig = currentColumnTypes[h] || currentColumnTypes[h.trim()];
        if (typeof rawConfig === 'object' && rawConfig.isPrimary) return true;
        return false;
      }) || '';
      setPrimaryColumn(pCol);

      setTypesMap(initialTypes);
      setSelectOptionsMap(initialOptions);
      setSelectModesMap(initialSelectModes);
      setFolderPathsMap(initialFolders);
      setShowInTableMap(initialShowInTable);
      setShowInFormMap(initialShowInForm);

      const snapshot = JSON.stringify({
        orderedHeaders: allSorted,
        typesMap: initialTypes,
        selectOptionsMap: initialOptions,
        selectModesMap: initialSelectModes,
        folderPathsMap: initialFolders,
        showInTableMap: initialShowInTable,
        showInFormMap: initialShowInForm,
        primaryColumn: pCol,
      });
      setInitialSnapshot(snapshot);

      if (allSorted.length > 0) {
        setSelectedColumn(allSorted[0]);
      } else if (headers.length > 0) {
        setSelectedColumn(headers[0]);
      } else {
        setSelectedColumn('');
      }
      setHasInitialized(true);
    } else if (!isOpen) {
      setHasInitialized(false);
      setInitialSnapshot('');
    } else if (isOpen && hasInitialized) {
      // Append any newly added headers without resetting existing state
      const addedHeaders = headers.filter(h => !orderedHeaders.includes(h));
      if (addedHeaders.length > 0) {
        setOrderedHeaders(prev => [...prev, ...addedHeaders]);
        setTypesMap(prev => {
          const next = { ...prev };
          addedHeaders.forEach(h => next[h] = 'text');
          return next;
        });
        setFolderPathsMap(prev => {
          const next = { ...prev };
          addedHeaders.forEach(h => next[h] = 'Murad Rahman Saud');
          return next;
        });
        setShowInTableMap(prev => {
          const next = { ...prev };
          addedHeaders.forEach(h => next[h] = true);
          return next;
        });
        setShowInFormMap(prev => {
          const next = { ...prev };
          addedHeaders.forEach(h => next[h] = true);
          return next;
        });
        setSelectedColumn(addedHeaders[0]);
      }
    }
  }, [isOpen, headers, currentColumnTypes, hasInitialized, orderedHeaders]);

  if (!isOpen) return null;

  const handleTypeChange = (colName: string, typeVal: string) => {
    setTypesMap((prev) => ({
      ...prev,
      [colName]: typeVal,
    }));
    if (typeVal === 'file' && !folderPathsMap[colName]) {
      setFolderPathsMap((prev) => ({
        ...prev,
        [colName]: 'Murad Rahman Saud',
      }));
    }
  };

  const handleOptionsChange = (colName: string, optsVal: string) => {
    setSelectOptionsMap((prev) => ({
      ...prev,
      [colName]: optsVal,
    }));
  };

  const handleFolderPathChange = (colName: string, pathVal: string) => {
    setFolderPathsMap((prev) => ({
      ...prev,
      [colName]: pathVal,
    }));
  };

  const toggleTableVisibility = (colName: string) => {
    setShowInTableMap((prev) => ({
      ...prev,
      [colName]: prev[colName] === false ? true : false,
    }));
  };

  const toggleFormVisibility = (colName: string) => {
    setShowInFormMap((prev) => ({
      ...prev,
      [colName]: prev[colName] === false ? true : false,
    }));
  };

  // Bulk actions
  const setAllTableVisibility = (visible: boolean) => {
    const updated: Record<string, boolean> = {};
    headers.forEach((h) => {
      updated[h] = visible;
    });
    setShowInTableMap(updated);
  };

  const setAllFormVisibility = (visible: boolean) => {
    const updated: Record<string, boolean> = {};
    headers.forEach((h) => {
      updated[h] = visible;
    });
    setShowInFormMap(updated);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    setOrderedHeaders((prev) => {
      const updated = [...prev];
      const [movedItem] = updated.splice(draggedIndex, 1);
      updated.splice(targetIndex, 0, movedItem);
      return updated;
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Move Column Up/Down
  const handleMoveColumn = (colName: string, direction: 'up' | 'down') => {
    setOrderedHeaders((prev) => {
      const currentIndex = prev.indexOf(colName);
      if (currentIndex === -1) return prev;
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const updated = [...prev];
      const temp = updated[currentIndex];
      updated[currentIndex] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  // Smart Auto-Detect Input Types based on column names
  const handleAutoDetect = () => {
    const detectedTypes: Record<string, string> = {};
    const detectedFolders: Record<string, string> = {};

    headers.forEach((h) => {
      const lower = h.toLowerCase().trim();
      if (/date|dob|birth|joining|time_stamp|created_at/i.test(lower)) {
        detectedTypes[h] = 'date';
      } else if (/email|e-mail|mail/i.test(lower)) {
        detectedTypes[h] = 'email';
      } else if (/phone|mobile|cell|contact|tel|fax|whatsapp/i.test(lower)) {
        detectedTypes[h] = 'tel';
      } else if (/photo|image|pic|picture|avatar|attachment|doc|pdf/i.test(lower) || /\bfile\b/i.test(lower)) {
        detectedTypes[h] = 'file';
        if (/photo|image|pic|picture|avatar/i.test(lower)) {
          detectedFolders[h] = 'Murad Rahman Saud/Profile Pictures';
        } else {
          detectedFolders[h] = 'Murad Rahman Saud/Documents';
        }
      } else if (/url|website|link|site/i.test(lower)) {
        detectedTypes[h] = 'url';
      } else if (/address|description|notes|details|comment|bio|summary|remark/i.test(lower)) {
        detectedTypes[h] = 'textarea';
      } else if (/age|qty|quantity|amount|price|cost|score|rate|count|num|number|total|salary|id_no|sl/i.test(lower)) {
        detectedTypes[h] = 'number';
      } else if (/gender|sex|status|type|category|department|role/i.test(lower)) {
        detectedTypes[h] = 'select';
        if (/gender|sex/i.test(lower)) {
          setSelectOptionsMap((prev) => ({ ...prev, [h]: 'Male, Female, Other' }));
        } else if (/status/i.test(lower)) {
          setSelectOptionsMap((prev) => ({ ...prev, [h]: 'Active, Pending, Completed, Inactive' }));
        }
      } else if (/is_|has_|active|approved|verified|yes_no/i.test(lower)) {
        detectedTypes[h] = 'checkbox';
      } else {
        detectedTypes[h] = 'text';
      }
    });

    setTypesMap((prev) => ({ ...prev, ...detectedTypes }));
    setFolderPathsMap((prev) => ({ ...prev, ...detectedFolders }));
    setSuccessMsg('Auto-detected input types and Drive folder paths based on column names!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTab) return;

    try {
      // Build final columnTypes payload with full visibility, types, and sequence order
      const finalPayload: Record<string, ColumnConfig> = {};
      orderedHeaders.forEach((h, idx) => {
        const typeVal = typesMap[h] || 'text';
        const showInTable = showInTableMap[h] !== false;
        const showInForm = showInFormMap[h] !== false;
        let options = '';
        let folderPath = '';

        if (typeVal === 'select') {
          options = selectOptionsMap[h]?.trim() || '';
        } else if (typeVal === 'file') {
          folderPath = folderPathsMap[h]?.trim() || 'Murad Rahman Saud';
        }

        finalPayload[h] = {
          type: typeVal,
          options,
          folderPath,
          showInTable,
          showInForm,
          order: idx,
          isPrimary: h === primaryColumn,
          selectMode: selectModesMap[h] || 'single',
        };
      });

      onSaveColumnTypes(
        activeTab.gid,
        activeTab.name,
        finalPayload
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save column types');
    }
  };

  // Filter column tabs by search
  const filteredHeaders = orderedHeaders.filter((h) =>
    h.toLowerCase().includes(columnSearchQuery.toLowerCase().trim())
  );

  const activeCol = selectedColumn || (filteredHeaders.length > 0 ? filteredHeaders[0] : '');
  const activeColIndex = orderedHeaders.indexOf(activeCol);
  const activeColType = typesMap[activeCol] || 'text';
  const isActiveColSelect = activeColType === 'select';
  const isActiveColFile = activeColType === 'file';
  const isActiveColTableVisible = showInTableMap[activeCol] !== false;
  const isActiveColFormVisible = showInFormMap[activeCol] !== false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[92vh] max-h-[760px] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-4 py-3 bg-teal-800 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-700/80 flex items-center justify-center border border-teal-600">
              <Sliders className="w-4 h-4 text-teal-200" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight flex items-center gap-2">
                <span>Configure Column Input Types, Visibility & Sequence</span>
              </h3>
              <p className="text-[11px] text-teal-200 mt-0.5">
                <strong className="text-white">{activeTab?.name || 'Current Sheet'}</strong> (GID: {activeTab?.gid}) &bull; {headers.length} Columns
              </p>
            </div>
          </div>
          <button
            id="close-data-type-modal-btn"
            onClick={onClose}
            className="p-1 rounded text-teal-200 hover:text-white hover:bg-teal-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Banners */}
        {errorMsg && (
          <div className="mx-4 mt-2 p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-4 mt-2 p-2.5 rounded bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-center gap-2 flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}



        {/* Main Body: Sidebar (Draggable Column Tabs) + Content Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Column Tabs with Drag-and-Drop */}
          <div className="w-68 sm:w-80 bg-slate-50 border-r border-slate-200 flex flex-col flex-shrink-0">
            {/* Search Input in Sidebar */}
            <div className="p-2.5 border-b border-slate-200 bg-white">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search columns..."
                  value={columnSearchQuery}
                  onChange={(e) => setColumnSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 bg-slate-100 border border-slate-200 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-teal-500 transition"
                />
                {columnSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setColumnSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Sidebar Column Tabs List */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-1 divide-y divide-slate-100/80">
              {filteredHeaders.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No columns found
                </div>
              ) : (
                filteredHeaders.map((colName) => {
                  const realIndex = orderedHeaders.indexOf(colName);
                  const isSelected = colName === activeCol;
                  const colType = typesMap[colName] || 'text';
                  const inTable = showInTableMap[colName] !== false;
                  const inForm = showInFormMap[colName] !== false;
                  const isBeingDragged = draggedIndex === realIndex;
                  const isOver = dragOverIndex === realIndex;

                  return (
                    <div
                      key={colName}
                      draggable={!columnSearchQuery}
                      onDragStart={(e) => handleDragStart(e, realIndex)}
                      onDragOver={(e) => handleDragOver(e, realIndex)}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, realIndex)}
                      className={`relative rounded-lg transition-all ${
                        isOver && !isBeingDragged ? 'border-t-2 border-teal-500 pt-0.5' : ''
                      } ${isBeingDragged ? 'opacity-40 bg-teal-50' : ''}`}
                    >
                      <div
                        onClick={() => setSelectedColumn(colName)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-between gap-1.5 group cursor-pointer ${
                          isSelected
                            ? 'bg-teal-700 text-white shadow-xs'
                            : 'text-slate-700 hover:bg-slate-200/70'
                        }`}
                      >
                        {/* Drag Handle & Column Info */}
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <div
                            title={columnSearchQuery ? "Clear search to drag & drop" : "Drag to move up or down"}
                            className={`p-0.5 rounded cursor-grab active:cursor-grabbing ${
                              isSelected ? 'text-teal-200 hover:text-white' : 'text-slate-400 hover:text-slate-600'
                            }`}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className={`truncate font-semibold text-xs leading-tight flex items-center gap-1.5 ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                              <span>{colName}</span>
                              {colName === primaryColumn && (
                                <Key className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" title="Primary / Unique ID Column" />
                              )}
                            </p>
                            <div className="text-[10px] truncate mt-0.5 flex items-center gap-1.5">
                              <span className={`font-mono px-1 py-0.2 rounded font-semibold ${
                                isSelected ? 'bg-teal-800 text-teal-200' : 'bg-slate-200 text-slate-600'
                              }`}>
                                #{realIndex + 1}
                              </span>
                              <span className={`capitalize ${isSelected ? 'text-teal-200' : 'text-slate-500'}`}>{colType}</span>
                            </div>
                          </div>
                        </div>

                        {/* Visibility Toggles on Tab */}
                        <div className="flex items-center gap-1 flex-shrink-0 ml-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTableVisibility(colName);
                            }}
                            title="Toggle Table Visibility"
                            className={`p-1.5 rounded transition shadow-2xs ${
                              inTable
                                ? isSelected ? 'bg-teal-600 text-white hover:bg-teal-500' : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                                : isSelected ? 'bg-teal-900/50 text-teal-400 hover:text-white' : 'bg-slate-200 text-slate-400 hover:bg-slate-300 hover:text-slate-600'
                            }`}
                          >
                            {inTable ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFormVisibility(colName);
                            }}
                            title="Toggle Form Visibility"
                            className={`p-1.5 rounded transition shadow-2xs ${
                              inForm
                                ? isSelected ? 'bg-teal-600 text-white hover:bg-teal-500' : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                                : isSelected ? 'bg-teal-900/50 text-teal-400 hover:text-white' : 'bg-slate-200 text-slate-400 hover:bg-slate-300 hover:text-slate-600'
                            }`}
                          >
                            {inForm ? <FileText className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5 opacity-40" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sidebar Summary Footer */}
            <div className="p-2 border-t border-slate-200 bg-white flex flex-col gap-2">
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>{headers.length} Columns Total</span>
                <span className="font-mono text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                  {Object.values(showInTableMap).filter((v) => v !== false).length} in Table
                </span>
              </div>
              {onAddColumn && (
                <form onSubmit={handleAddColumn} className="flex gap-1.5 pt-1 border-t border-slate-100">
                  <input
                    type="text"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder="New column name..."
                    className="flex-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-800 focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="submit"
                    disabled={isAddingColumn || !newColumnName.trim()}
                    className="px-2 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded text-[11px] font-medium transition disabled:opacity-50"
                  >
                    {isAddingColumn ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Panel: Selected Column Settings Form */}
          <div className="flex-1 bg-white flex flex-col overflow-y-auto">
            {activeCol ? (
              <div className="p-5 sm:p-6 space-y-6 max-w-3xl">
                {/* Section 2: Input Type Configuration */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-teal-600" />
                    <span>Input Type Controller</span>
                  </h5>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-semibold text-slate-700">
                          Select Input Control Type:
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (primaryColumn === activeCol) {
                              setPrimaryColumn('');
                            } else {
                              setPrimaryColumn(activeCol);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition shadow-2xs ${
                            primaryColumn === activeCol
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-300 hover:bg-amber-50 hover:border-amber-300'
                          }`}
                          title="Toggle Primary / Unique ID Column"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>{primaryColumn === activeCol ? 'Primary / Unique ID (Active)' : 'Set as Primary / Unique ID'}</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {INPUT_TYPE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleTypeChange(activeCol, opt.value)}
                            className={`px-3 py-2 border rounded-lg text-xs font-semibold flex items-center justify-center transition-colors shadow-2xs ${
                              activeColType === opt.value
                                ? 'bg-teal-600 text-white border-teal-700'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-teal-50 hover:border-teal-300'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* If select type, option input */}
                    {isActiveColSelect && (
                      <div className="pt-3 border-t border-slate-200 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <label className="block text-xs font-semibold text-teal-900">
                            Dropdown Options (Comma-Separated):
                          </label>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectModesMap[activeCol] === 'multi'}
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  setSelectModesMap(prev => ({
                                    ...prev,
                                    [activeCol]: isChecked ? 'multi' : 'single'
                                  }));
                                }}
                                className="w-3.5 h-3.5 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                              />
                              <span>Multi-Select</span>
                            </label>
                            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectModesMap[activeCol] === 'tab'}
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  setSelectModesMap(prev => ({
                                    ...prev,
                                    [activeCol]: isChecked ? 'tab' : 'single'
                                  }));
                                }}
                                className="w-3.5 h-3.5 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                              />
                              <span>Tab Select</span>
                            </label>
                          </div>
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. Male, Female, Other or Active, Pending, Completed"
                          value={selectOptionsMap[activeCol] || ''}
                          onChange={(e) => handleOptionsChange(activeCol, e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 font-mono shadow-2xs"
                        />
                        <p className="text-[11px] text-slate-500">
                          Options will be presented as a select dropdown menu in the Add/Edit form.
                        </p>
                      </div>
                    )}

                    {/* If File / Drive Upload type, folder path input */}
                    {isActiveColFile && (
                      <div className="pt-3 border-t border-teal-200/80 bg-teal-50/50 p-3.5 rounded-lg space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-teal-950 flex items-center gap-1.5">
                            <FolderKanban className="w-4 h-4 text-teal-700" />
                            <span>Google Drive Target Folder Path:</span>
                          </label>
                        </div>

                        <div className="relative">
                          <Folder className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="e.g. Murad Rahman Saud or Murad Rahman Saud/Photos"
                            value={folderPathsMap[activeCol] || 'Murad Rahman Saud'}
                            onChange={(e) => handleFolderPathChange(activeCol, e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-white border border-teal-300 rounded-lg text-xs text-teal-950 font-mono focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-500/20 shadow-2xs"
                          />
                        </div>

                        {/* Quick preset pills */}
                        <div className="space-y-1 pt-1">
                          <p className="text-[10.5px] font-medium text-slate-600">Quick Path Presets:</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {[
                              'Murad Rahman Saud',
                              'Murad Rahman Saud/Profile Pictures',
                              'Murad Rahman Saud/Cover Photos',
                              'Murad Rahman Saud/Photos',
                              'Murad Rahman Saud/Documents',
                              'Murad Rahman Saud/Uploads'
                            ].map((preset) => {
                              const isSelected = (folderPathsMap[activeCol] || 'Murad Rahman Saud') === preset;
                              return (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => handleFolderPathChange(activeCol, preset)}
                                  className={`px-2 py-1 rounded font-mono transition text-[10.5px] border ${
                                    isSelected
                                      ? 'bg-teal-600 text-white border-teal-700 font-semibold shadow-2xs'
                                      : 'bg-white hover:bg-teal-100 text-teal-800 border-slate-200'
                                  }`}
                                >
                                  {preset}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <Columns className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-xs">Select a column tab from the sidebar to customize its properties.</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs flex-shrink-0">
          <div className="text-[11px] text-slate-500">
            Saves to dedicated row: <strong className="text-teal-800 font-semibold font-mono">Configure Column Input Types - {activeTab?.name || 'Sheet'} (GID: {activeTab?.gid || '0'})</strong> in <span className="font-semibold text-slate-700">Settings (GID: {DATA_TYPE_GID})</span>
          </div>

          <div className="flex gap-2">
            <button
              id="cancel-data-type-modal-btn"
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition"
            >
              Cancel
            </button>
            <button
              id="save-data-type-modal-btn"
              type="button"
              onClick={handleSubmit}
              disabled={!isDirty || headers.length === 0}
              className="px-4 py-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save All Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
