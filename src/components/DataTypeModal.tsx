import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Save, 
  Loader2, 
  Database, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Folder,
  FolderUp,
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
  Key,
  Layout,
  Info,
  ChevronDown,
  Check
} from 'lucide-react';
import { SheetTab, INPUT_TYPE_OPTIONS, FILTER_TYPE_OPTIONS, DATA_TYPE_GID, ColumnConfig } from '../types';

const SearchableControlSelect: React.FC<{
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
}> = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOpt = options.find(o => o.value === value) || options[0];

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return options;
    return options.filter(o => o.label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm]);

  return (
    <div ref={containerRef} className="relative w-full z-20">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 transition flex items-center justify-between gap-1.5 cursor-pointer hover:border-slate-400 shadow-2xs"
      >
        <span className="font-semibold text-slate-700 truncate">{selectedOpt?.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180 text-teal-600' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg p-2 space-y-1.5 max-h-60 overflow-y-auto">
          <input
            type="text"
            placeholder="Search control types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-500"
            autoFocus
          />

          <div className="space-y-0.5 max-h-44 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-xs text-slate-400 p-2 text-center">No options found</div>
            ) : (
              filtered.map((opt) => {
                const isSelected = value === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer text-xs font-semibold transition ${
                      isSelected ? 'bg-teal-50 text-teal-900 font-bold' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-teal-600" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const SearchableFilterTypeSelect: React.FC<{
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
}> = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOpt = options.find(o => o.value === value) || options.find(o => o.value === 'auto') || options[0];

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return options;
    return options.filter(o => o.label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm]);

  return (
    <div ref={containerRef} className="relative w-full z-15">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-850 transition flex items-center justify-between gap-1.5 cursor-pointer hover:border-slate-400 shadow-2xs"
      >
        <span className="font-semibold text-slate-700 truncate">{selectedOpt?.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180 text-teal-600' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg p-2 space-y-1.5 max-h-60 overflow-y-auto">
          <input
            type="text"
            placeholder="Search filter types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-500"
            autoFocus
          />

          <div className="space-y-0.5 max-h-44 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-xs text-slate-400 p-2 text-center">No options found</div>
            ) : (
              filtered.map((opt) => {
                const isSelected = value === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer text-xs font-semibold transition ${
                      isSelected ? 'bg-teal-50 text-teal-900 font-bold' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-teal-600" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
import { normalizeColumnConfig, getOrderedHeaders, isNamedColumn } from '../services/sheetService';

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
  const [filterTypesMap, setFilterTypesMap] = useState<Record<string, string>>({});
  const [selectOptionsMap, setSelectOptionsMap] = useState<Record<string, string>>({});
  const [selectModesMap, setSelectModesMap] = useState<Record<string, 'single' | 'multi' | 'tab'>>({});
  const [folderPathsMap, setFolderPathsMap] = useState<Record<string, string>>({});
  const [showInTableMap, setShowInTableMap] = useState<Record<string, boolean>>({});
  const [showInFormMap, setShowInFormMap] = useState<Record<string, boolean>>({});
  const [showInFilterMap, setShowInFilterMap] = useState<Record<string, boolean>>({});
  const [allowMissingFilterMap, setAllowMissingFilterMap] = useState<Record<string, boolean>>({});
  
  // Visual Form Designer states
  const [configTab, setConfigTab] = useState<'types' | 'designer'>('designer');
  const [formSettings, setFormSettings] = useState<any>({
    title: '',
    modal_size: 'lg',
    layout_type: 'grid',
    columns_per_row: 12
  });
  const [gridSpansMap, setGridSpansMap] = useState<Record<string, number>>({});
  const [requiredFieldsMap, setRequiredFieldsMap] = useState<Record<string, boolean>>({});
  const [placeholdersMap, setPlaceholdersMap] = useState<Record<string, string>>({});
  const [labelsMap, setLabelsMap] = useState<Record<string, string>>({});

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
      filterTypesMap,
      selectOptionsMap,
      selectModesMap,
      folderPathsMap,
      showInTableMap,
      showInFormMap,
      showInFilterMap,
      allowMissingFilterMap,
      primaryColumn,
      gridSpansMap,
      requiredFieldsMap,
      placeholdersMap,
      labelsMap,
      formSettings,
    });
    return currentSnapshot !== initialSnapshot;
  }, [
    hasInitialized,
    initialSnapshot,
    orderedHeaders,
    typesMap,
    filterTypesMap,
    selectOptionsMap,
    selectModesMap,
    folderPathsMap,
    showInTableMap,
    showInFormMap,
    showInFilterMap,
    allowMissingFilterMap,
    primaryColumn,
    gridSpansMap,
    requiredFieldsMap,
    placeholdersMap,
    labelsMap,
    formSettings,
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

      const validHeaders = headers.filter(isNamedColumn);

      // Sort initial headers based on saved order
      const sorted = getOrderedHeaders(validHeaders, currentColumnTypes);
      // Ensure all valid headers from current sheet are included
      const allSorted = [...sorted];
      validHeaders.forEach((h) => {
        if (!allSorted.includes(h)) {
          allSorted.push(h);
        }
      });
      setOrderedHeaders(allSorted);

      const initialTypes: Record<string, string> = {};
      const initialFilterTypes: Record<string, string> = {};
      const initialOptions: Record<string, string> = {};
      const initialSelectModes: Record<string, 'single' | 'multi' | 'tab'> = {};
      const initialFolders: Record<string, string> = {};
      const initialShowInTable: Record<string, boolean> = {};
      const initialShowInForm: Record<string, boolean> = {};
      const initialShowInFilter: Record<string, boolean> = {};
      const initialAllowMissingFilter: Record<string, boolean> = {};

      const initialGridSpans: Record<string, number> = {};
      const initialRequiredFields: Record<string, boolean> = {};
      const initialPlaceholders: Record<string, string> = {};
      const initialLabels: Record<string, string> = {};

      validHeaders.forEach((h) => {
        const rawConfig = currentColumnTypes[h] || currentColumnTypes[h.trim()];
        const norm = normalizeColumnConfig(rawConfig);
        const lower = h.toLowerCase().trim();
        const isTextarea = (norm.type || 'text') === 'textarea';
        
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
        initialFilterTypes[h] = norm.filterType || 'auto';
        initialOptions[h] = norm.options || '';
        initialSelectModes[h] = norm.selectMode || 'single';
        initialFolders[h] = defaultFolderForCol;
        initialShowInTable[h] = norm.showInTable !== false;
        initialShowInForm[h] = norm.showInForm !== false;
        initialShowInFilter[h] = norm.showInFilter !== false;
        initialAllowMissingFilter[h] = norm.allowMissingFilter !== false;

        initialGridSpans[h] = (norm as any).gridSpan !== undefined ? (norm as any).gridSpan : (isTextarea ? 12 : 6);
        initialRequiredFields[h] = !!(norm as any).required;
        initialPlaceholders[h] = (norm as any).placeholder || `Enter ${h}...`;
        initialLabels[h] = (norm as any).label || h;
      });

      let pCol = validHeaders.find((h) => {
        const rawConfig = currentColumnTypes[h] || currentColumnTypes[h.trim()];
        if (typeof rawConfig === 'object' && rawConfig.isPrimary) return true;
        return false;
      }) || '';
      setPrimaryColumn(pCol);

      setTypesMap(initialTypes);
      setFilterTypesMap(initialFilterTypes);
      setSelectOptionsMap(initialOptions);
      setSelectModesMap(initialSelectModes);
      setFolderPathsMap(initialFolders);
      setShowInTableMap(initialShowInTable);
      setShowInFormMap(initialShowInForm);
      setShowInFilterMap(initialShowInFilter);
      setAllowMissingFilterMap(initialAllowMissingFilter);

      setGridSpansMap(initialGridSpans);
      setRequiredFieldsMap(initialRequiredFields);
      setPlaceholdersMap(initialPlaceholders);
      setLabelsMap(initialLabels);

      // Load formSettings metadata
      const rawFormSettings = currentColumnTypes['_formSettings'];
      let loadedFormSettings = {
        title: `${activeTab?.name || 'Application'} Form`,
        modal_size: 'lg',
        layout_type: 'grid',
        columns_per_row: 12
      };
      if (rawFormSettings && typeof rawFormSettings === 'object') {
        loadedFormSettings = {
          title: (rawFormSettings as any).title || `${activeTab?.name || 'Application'} Form`,
          modal_size: (rawFormSettings as any).modal_size || 'lg',
          layout_type: (rawFormSettings as any).layout_type || 'grid',
          columns_per_row: (rawFormSettings as any).columns_per_row || 12
        };
      }
      setFormSettings(loadedFormSettings);

      const snapshot = JSON.stringify({
        orderedHeaders: allSorted,
        typesMap: initialTypes,
        filterTypesMap: initialFilterTypes,
        selectOptionsMap: initialOptions,
        selectModesMap: initialSelectModes,
        folderPathsMap: initialFolders,
        showInTableMap: initialShowInTable,
        showInFormMap: initialShowInForm,
        showInFilterMap: initialShowInFilter,
        allowMissingFilterMap: initialAllowMissingFilter,
        primaryColumn: pCol,
        gridSpansMap: initialGridSpans,
        requiredFieldsMap: initialRequiredFields,
        placeholdersMap: initialPlaceholders,
        labelsMap: initialLabels,
        formSettings: loadedFormSettings,
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
      const addedHeaders = headers.filter(h => isNamedColumn(h) && !orderedHeaders.includes(h));
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
        setShowInFilterMap(prev => {
          const next = { ...prev };
          addedHeaders.forEach(h => next[h] = true);
          return next;
        });
        setAllowMissingFilterMap(prev => {
          const next = { ...prev };
          addedHeaders.forEach(h => next[h] = true);
          return next;
        });
        setGridSpansMap(prev => {
          const next = { ...prev };
          addedHeaders.forEach(h => next[h] = 6);
          return next;
        });
        setRequiredFieldsMap(prev => {
          const next = { ...prev };
          addedHeaders.forEach(h => next[h] = false);
          return next;
        });
        setPlaceholdersMap(prev => {
          const next = { ...prev };
          addedHeaders.forEach(h => next[h] = `Enter ${h}...`);
          return next;
        });
        setLabelsMap(prev => {
          const next = { ...prev };
          addedHeaders.forEach(h => next[h] = h);
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
        const showInFilter = showInFilterMap[h] !== false;
        const allowMissingFilter = allowMissingFilterMap[h] !== false;
        let options = '';
        let folderPath = '';

        if (typeVal === 'select') {
          options = selectOptionsMap[h]?.trim() || '';
        } else if (typeVal === 'file') {
          folderPath = folderPathsMap[h]?.trim() || 'Murad Rahman Saud';
        }

        finalPayload[h] = {
          type: typeVal,
          filterType: filterTypesMap[h] || 'auto',
          options,
          folderPath,
          showInTable,
          showInForm,
          showInFilter,
          allowMissingFilter,
          order: idx,
          isPrimary: h === primaryColumn,
          selectMode: selectModesMap[h] || 'single',
          // Merge form builder parameters:
          gridSpan: gridSpansMap[h] !== undefined ? gridSpansMap[h] : (typeVal === 'textarea' ? 12 : 6),
          required: !!requiredFieldsMap[h],
          placeholder: '',
          label: labelsMap[h] || h,
        } as any;
      });

      // Save top-level form settings metadata inside the same payload
      finalPayload['_formSettings'] = formSettings as any;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-7xl xl:max-w-[1400px] h-[94vh] max-h-[840px] flex flex-col overflow-hidden">
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
          <style>{`
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .no-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
          {/* Left Sidebar: Column Tabs with Drag-and-Drop */}
          <div className="w-60 sm:w-68 bg-slate-50 border-r border-slate-200 flex flex-col flex-shrink-0">
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
          {/* Visual Interactive Form Designer Panel */}
          <div className="flex-1 bg-slate-50 flex flex-col lg:flex-row overflow-hidden">
              {/* Designer Settings Sidebar */}
              <div className="w-full lg:w-80 bg-white border-r border-slate-200 flex flex-col overflow-hidden shrink-0">
                {/* Sidebar Content Scrollable Area */}
                <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-5 no-scrollbar">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-100">
                      <Sliders className="w-4 h-4 text-teal-600" />
                      <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Field Customizer</h3>
                    </div>

                      {activeCol ? (
                        <div className="space-y-4">
                          {/* Active Field Name tag */}
                          <div className="bg-teal-50 border border-teal-100 p-2.5 rounded-lg flex items-center justify-between">
                            <span className="text-[10px] text-teal-800 font-bold uppercase tracking-wider font-mono truncate">{activeCol}</span>
                            <span className="text-[9px] bg-teal-600 text-white font-bold px-2 py-0.5 rounded">Active Field</span>
                          </div>

                          {/* Part 1: Field Identity */}
                          <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <h4 className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wide">1. Visual Properties</h4>
                            
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Custom Label</label>
                              <input
                                type="text"
                                value={labelsMap[activeCol] || ''}
                                onChange={(e) => setLabelsMap(prev => ({ ...prev, [activeCol]: e.target.value }))}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs"
                              />
                            </div>

                            <div className="flex items-center gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={!!requiredFieldsMap[activeCol]}
                                  onChange={(e) => setRequiredFieldsMap(prev => ({ ...prev, [activeCol]: e.target.checked }))}
                                  className="w-3.5 h-3.5 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                                />
                                <span className="text-xs text-slate-700 font-semibold">Required *</span>
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={showInFormMap[activeCol] !== false}
                                  onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    setShowInFormMap(prev => ({ ...prev, [activeCol]: isChecked }));
                                  }}
                                  className="w-3.5 h-3.5 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                                />
                                <span className="text-xs text-slate-700 font-semibold">Show in Form</span>
                              </label>
                            </div>

                            <div className="pt-1.5">
                              <div className="flex justify-between items-center text-xs text-slate-700 font-semibold mb-1">
                                <span>Grid Width (Span):</span>
                                <span className="font-bold font-mono text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded">
                                  {gridSpansMap[activeCol] || 6} / {formSettings.columns_per_row}
                                </span>
                              </div>
                              <input
                                type="range"
                                min="1"
                                max={formSettings.columns_per_row}
                                value={gridSpansMap[activeCol] || 6}
                                onChange={(e) => setGridSpansMap(prev => ({ ...prev, [activeCol]: parseInt(e.target.value) || 6 }))}
                                className="w-full accent-teal-600 cursor-pointer"
                              />
                              <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
                                <span>Narrow</span>
                                <span>Full Width</span>
                              </div>
                            </div>
                          </div>

                          {/* Part 2: Input Type Controller */}
                          <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wide">2. Input Control Type</h4>
                              <button
                                type="button"
                                onClick={() => {
                                  if (primaryColumn === activeCol) {
                                    setPrimaryColumn('');
                                  } else {
                                    setPrimaryColumn(activeCol);
                                  }
                                }}
                                className={`px-2 py-0.5 rounded-md text-[9.5px] font-bold flex items-center gap-1 transition shadow-2xs ${
                                  primaryColumn === activeCol
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-amber-50'
                                }`}
                                title="Primary Unique ID Key Column"
                              >
                                <Key className="w-3 h-3" />
                                <span>{primaryColumn === activeCol ? 'Primary' : 'Set Primary'}</span>
                              </button>
                            </div>

                            <SearchableControlSelect
                              value={activeColType}
                              options={INPUT_TYPE_OPTIONS}
                              onChange={(val) => handleTypeChange(activeCol, val)}
                            />

                            {/* Options configuration for Dropdown Select */}
                            {isActiveColSelect && (
                              <div className="pt-2 border-t border-slate-200 space-y-2">
                                <div className="flex items-center justify-between gap-1">
                                  <label className="block text-[10.5px] font-semibold text-teal-900">
                                    Dropdown Options:
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-1 text-[10px] font-medium text-slate-700 cursor-pointer">
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
                                        className="w-3 h-3 text-teal-600 rounded border-slate-300"
                                      />
                                      <span>Multi</span>
                                    </label>
                                    <label className="flex items-center gap-1 text-[10px] font-medium text-slate-700 cursor-pointer">
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
                                        className="w-3 h-3 text-teal-600 rounded border-slate-300"
                                      />
                                      <span>Tab</span>
                                    </label>
                                  </div>
                                </div>
                                <input
                                  type="text"
                                  placeholder="e.g. Male, Female, Other"
                                  value={selectOptionsMap[activeCol] || ''}
                                  onChange={(e) => handleOptionsChange(activeCol, e.target.value)}
                                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 font-mono shadow-2xs"
                                />
                              </div>
                            )}

                            {/* File Target Folder config */}
                            {isActiveColFile && (
                              <div className="pt-2 border-t border-teal-200/50 space-y-2">
                                <label className="block text-[10.5px] font-semibold text-teal-950 flex items-center gap-1">
                                  <Folder className="w-3 h-3 text-teal-700" />
                                  <span>Drive Path:</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder="Google Drive subfolder path..."
                                  value={folderPathsMap[activeCol] || 'Murad Rahman Saud'}
                                  onChange={(e) => handleFolderPathChange(activeCol, e.target.value)}
                                  className="w-full px-2 py-1.5 bg-white border border-teal-200 rounded text-xs text-teal-950 font-mono focus:outline-none focus:border-teal-600 shadow-2xs"
                                />
                              </div>
                            )}
                          </div>

                          {/* Part 3: Left Filter Panel sidebar config */}
                          <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <h4 className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wide">3. Sidebar Filter Panel</h4>
                            
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-semibold text-slate-600">Show in Filter:</label>
                              <button
                                type="button"
                                onClick={() => setShowInFilterMap(prev => ({ ...prev, [activeCol]: !(prev[activeCol] !== false) }))}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                  (showInFilterMap[activeCol] !== false)
                                    ? 'bg-teal-600 text-white shadow-2xs'
                                    : 'bg-slate-200 text-slate-500'
                                }`}
                              >
                                {(showInFilterMap[activeCol] !== false) ? 'SHOWING' : 'HIDDEN'}
                              </button>
                            </div>
                             {showInFilterMap[activeCol] !== false && (
                              <div className="space-y-2.5 pt-1 border-t border-slate-200/60">
                                <div>
                                  <label className="block text-[11px] text-slate-500 font-medium mb-1">Filter Type:</label>
                                  <SearchableFilterTypeSelect
                                    value={filterTypesMap[activeCol] || 'auto'}
                                    options={FILTER_TYPE_OPTIONS}
                                    onChange={(val) => setFilterTypesMap(prev => ({ ...prev, [activeCol]: val }))}
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] text-slate-500 font-medium" title="Allow filtering empty rows">Missing Filter:</span>
                                  <button
                                    type="button"
                                    onClick={() => setAllowMissingFilterMap(prev => ({ ...prev, [activeCol]: !prev[activeCol] }))}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                                      allowMissingFilterMap[activeCol]
                                        ? 'bg-amber-600 text-white shadow-2xs'
                                        : 'bg-slate-200 text-slate-600'
                                    }`}
                                  >
                                    {allowMissingFilterMap[activeCol] ? 'ON' : 'OFF'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-10 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                          <Sliders className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-[11px] text-slate-400">Click any field card in the live form canvas to customize its properties.</p>
                        </div>
                      )}
                    </div>
                </div>
              </div>

              {/* Dynamic Interactive Layout Grid Preview Area */}
              <div className="flex-1 p-6 overflow-y-auto flex flex-col">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">Live Interactive Grid Preview</h4>
                    <p className="text-[11px] text-slate-500">Visual layout rendering of the generated action form. Adjust positions & widths dynamically.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Interactive Builder
                    </span>
                  </div>
                </div>

                {/* Form Layout Global Settings Row */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 flex flex-col md:flex-row gap-3 items-end shrink-0">
                  <div className="flex-1 space-y-1 w-full">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Form Modal Title</label>
                    <input
                      type="text"
                      value={formSettings.title}
                      onChange={(e) => setFormSettings(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter action form title..."
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-teal-500 transition shadow-2xs font-medium"
                    />
                  </div>
                  <div className="w-full md:w-48 space-y-1">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Form Modal Width</label>
                    <select
                      value={formSettings.modal_size}
                      onChange={(e) => setFormSettings(prev => ({ ...prev, modal_size: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-teal-500 transition shadow-2xs font-medium"
                    >
                      <option value="sm">Small (sm)</option>
                      <option value="md">Medium (md)</option>
                      <option value="lg">Large (lg) - Recommended</option>
                      <option value="xl">Extra Large (xl)</option>
                      <option value="2xl">2-Extra Large (2xl)</option>
                      <option value="full">Full Screen (full)</option>
                    </select>
                  </div>
                  <div className="w-full md:w-56 space-y-1">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Grid Base Columns</label>
                    <select
                      value={formSettings.columns_per_row}
                      onChange={(e) => setFormSettings(prev => ({ ...prev, columns_per_row: parseInt(e.target.value) || 12 }))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-teal-500 transition shadow-2xs font-medium"
                    >
                      <option value="12">12 Columns (Extremely Precise)</option>
                      <option value="6">6 Columns (Standard)</option>
                      <option value="4">4 Columns (Compact)</option>
                    </select>
                  </div>
                </div>

                {/* Form Canvas Preview Container */}
                <div className="border-0 rounded-xl bg-white shadow-xs p-6 flex-1 min-h-[400px]">
                  {/* Mock Modal Header */}
                  <div className="border-b border-slate-100 pb-4 mb-6 border-l-4 border-teal-600 pl-4">
                    <h2 className="text-base font-extrabold text-teal-800 tracking-tight">
                      {formSettings.title || 'Dynamic Request Form'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">Please complete the details below to submit your request.</p>
                  </div>

                  {/* Mock Form Grid Layout */}
                  <div className="grid gap-x-3 gap-y-2" style={{ gridTemplateColumns: `repeat(${formSettings.columns_per_row}, minmax(0, 1fr))` }}>
                    {orderedHeaders
                      .filter(h => showInFormMap[h] !== false)
                      .map((h, idx) => {
                        const colSpan = gridSpansMap[h] !== undefined ? gridSpansMap[h] : 6;
                        const isColActive = h === activeCol;
                        const labelText = labelsMap[h] || h;
                        const isRequired = !!requiredFieldsMap[h];
                        const currentType = typesMap[h] || 'text';
                        const isSelect = currentType === 'select';
                        const selectMode = selectModesMap[h] || 'single';
                        const isDateTimeType = ['date', 'time', 'datetime-local'].includes(currentType);
                        const shouldFloat = isColActive || isDateTimeType || currentType === 'checkbox' || (isSelect && selectMode === 'tab');
                        const labelWithRequired = labelText + (isRequired ? ' *' : '');

                        return (
                          <div
                            key={h}
                            draggable
                            onDragStart={(e) => handleDragStart(e, orderedHeaders.indexOf(h))}
                            onDragOver={(e) => handleDragOver(e, orderedHeaders.indexOf(h))}
                            onDragEnd={handleDragEnd}
                            onDrop={(e) => handleDrop(e, orderedHeaders.indexOf(h))}
                            onClick={() => setSelectedColumn(h)}
                            style={{ gridColumn: `span ${colSpan} / span ${colSpan}` }}
                            className={`group pt-3 pb-1 transition cursor-grab select-none ${
                              isColActive
                                ? 'ring-2 ring-teal-500/10 rounded-md px-1'
                                : 'hover:ring-1 hover:ring-slate-200 rounded-md px-1'
                            } ${dragOverIndex === orderedHeaders.indexOf(h) ? 'opacity-50 border-dashed border-2 border-teal-500' : ''}`}
                          >
                            {/* Render different fields based on actual configured input type */}
                            <div className="relative">
                              {/* Modern Floating Label for Visual Builder Preview */}
                              <label className={`absolute left-[11px] -translate-y-1/2 transition-all duration-200 pointer-events-none select-none z-10 ${
                                shouldFloat
                                  ? `top-0 text-[10px] font-bold bg-white px-1.5 ${isColActive ? 'text-teal-600' : 'text-slate-500'}`
                                  : currentType === 'textarea'
                                    ? 'top-[18px] text-xs text-slate-400 font-medium'
                                    : 'top-1/2 text-xs text-slate-400 font-medium'
                              }`}>
                                {labelWithRequired}
                              </label>
                              {currentType === 'textarea' ? (
                                <textarea
                                  disabled
                                  placeholder=""
                                  rows={3}
                                  className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-xs text-slate-400 placeholder-slate-400 resize-none pointer-events-none ${
                                    isColActive ? 'border-teal-500 ring-1 ring-teal-500/20' : 'border-slate-300'
                                  }`}
                                />
                              ) : isSelect ? (
                                selectMode === 'multi' ? (
                                  <div className={`w-full min-h-[34px] px-2.5 py-1 bg-white border rounded-md text-xs transition flex items-center justify-between gap-1.5 pointer-events-none ${
                                    isColActive ? 'border-teal-500 ring-1 ring-teal-500/20' : 'border-slate-300'
                                  }`}>
                                    <div className="flex flex-wrap gap-1 items-center">
                                    </div>
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  </div>
                                ) : selectMode === 'tab' ? (
                                  <div className={`flex flex-wrap gap-1.5 p-1 bg-slate-50 rounded-lg border pointer-events-none w-full ${
                                    isColActive ? 'border-teal-500 ring-1 ring-teal-500/20' : 'border-slate-200'
                                  }`}>
                                    {(() => {
                                      const opts = (selectOptionsMap[h] || '')
                                        .split(',')
                                        .map((s) => s.trim())
                                        .filter(Boolean);
                                      const selectOptions = opts.length > 0 ? opts : ['Active', 'Pending', 'Completed'];
                                      return selectOptions.slice(0, 3).map((opt, idx) => (
                                        <button
                                          key={opt}
                                          type="button"
                                          disabled
                                          className={`flex-1 min-w-[60px] px-2.5 py-1 rounded text-[10px] font-bold transition text-center truncate ${
                                            idx === 0
                                              ? 'bg-teal-700 text-white shadow-xs'
                                              : 'bg-white text-slate-500 border border-slate-200/80'
                                          }`}
                                        >
                                          {opt}
                                        </button>
                                      ));
                                    })()}
                                  </div>
                                ) : (
                                  <div className={`w-full min-h-[34px] px-2.5 py-1.5 bg-white border rounded-md text-xs transition flex items-center justify-between gap-1.5 pointer-events-none ${
                                    isColActive ? 'border-teal-500 ring-1 ring-teal-500/20' : 'border-slate-300'
                                  }`}>
                                    <span className="text-slate-400 font-medium"></span>
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  </div>
                                )
                              ) : currentType === 'checkbox' ? (
                                <label className={`flex items-center gap-2.5 p-2 bg-white border rounded-md transition pointer-events-none w-full ${
                                  isColActive ? 'border-teal-500 ring-1 ring-teal-500/20' : 'border-slate-300'
                                }`}>
                                  <input
                                     type="checkbox"
                                     disabled
                                     checked={true}
                                     className="w-4 h-4 text-teal-600 rounded border-slate-300"
                                  />
                                  <span className="text-xs font-semibold text-slate-500">
                                    Yes / Active (Preview)
                                  </span>
                                </label>
                              ) : currentType === 'file' ? (
                                <div className="space-y-2 pointer-events-none w-full">
                                  <div className="flex items-stretch w-full">
                                    <input
                                      type="text"
                                      disabled
                                      placeholder=""
                                      className={`flex-1 min-w-0 pl-2.5 pr-2.5 py-1.5 bg-white border rounded-l-md text-xs text-slate-400 font-mono border-r-0 ${
                                        isColActive ? 'border-teal-500 ring-1 ring-teal-500/20' : 'border-slate-300'
                                      }`}
                                    />
                                    <button
                                      type="button"
                                      disabled
                                      className="px-3 bg-teal-600 text-white rounded-r-md flex items-center justify-center shrink-0 border border-teal-600 border-l-0"
                                    >
                                      <FolderUp className="w-4 h-4 text-teal-100" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <input
                                  type={
                                    currentType === 'date'
                                      ? 'date'
                                      : currentType === 'time'
                                      ? 'time'
                                      : currentType === 'datetime-local'
                                      ? 'datetime-local'
                                      : currentType === 'number'
                                      ? 'number'
                                      : currentType === 'email'
                                      ? 'email'
                                      : currentType === 'tel'
                                      ? 'tel'
                                      : currentType === 'url'
                                      ? 'url'
                                      : 'text'
                                  }
                                  disabled
                                  placeholder=""
                                  className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-xs text-slate-400 placeholder-slate-400 pointer-events-none ${
                                    isColActive ? 'border-teal-500 ring-1 ring-teal-500/20' : 'border-slate-300'
                                  }`}
                                />
                              )}
                            </div>

                            {/* Active quick adjust buttons */}
                            {isColActive && (
                              <div className="absolute -top-1.5 right-2 bg-teal-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-xs flex items-center gap-1 z-10">
                                <Sliders className="w-2.5 h-2.5" />
                                Customizing
                              </div>
                            )}
                          </div>
                        );
                      })}

                    {headers.filter(h => showInFormMap[h] !== false).length === 0 && (
                      <div className="col-span-full py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
                        <EyeOff className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-xs">No visible form fields.</p>
                        <p className="text-[11px] text-slate-400 mt-1">Check column visibility in the side sidebar to make fields visible.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
