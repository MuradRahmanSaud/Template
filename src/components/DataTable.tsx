import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Edit3, 
  Trash2, 
  Image as ImageIcon, 
  ExternalLink, 
  Copy, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Eye,
  FileText,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  Filter,
  X,
  AlertTriangle,
  CheckSquare,
  Square,
  ChevronDown
} from 'lucide-react';
import { ColumnConfig } from '../types';
import { isColumnVisibleInTable, getOrderedHeaders, normalizeColumnConfig } from '../services/sheetService';

const SearchableFilterSelect: React.FC<{
  value: string;
  header: string;
  options: string[];
  onChange: (val: string) => void;
}> = ({ value, header, options, onChange }) => {
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

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return options;
    return options.filter(o => String(o).toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm]);

  return (
    <div ref={containerRef} className="relative w-full z-10">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-850 transition flex items-center justify-between gap-1.5 cursor-pointer hover:border-slate-400 shadow-2xs"
      >
        <span className={value ? 'font-semibold text-teal-850 truncate' : 'text-slate-400 truncate'}>
          {value || `All (${header})`}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180 text-teal-600' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg p-2 space-y-1.5 max-h-60 overflow-y-auto">
          <input
            type="text"
            placeholder="Search options..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-800 focus:outline-none focus:border-teal-500"
            autoFocus
          />

          <div className="space-y-0.5 max-h-44 overflow-y-auto">
            <div
              onClick={() => {
                onChange('');
                setIsOpen(false);
                setSearchTerm('');
              }}
              className={`px-2.5 py-1.5 rounded cursor-pointer text-xs transition ${
                !value ? 'bg-teal-50 text-teal-900 font-bold' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              All ({header})
            </div>
            {filtered.length === 0 ? (
              <div className="text-xs text-slate-400 p-2 text-center font-medium">No options found</div>
            ) : (
              filtered.map((opt) => {
                const isSelected = value === opt;
                return (
                  <div
                    key={opt}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer text-xs font-semibold transition ${
                      isSelected ? 'bg-teal-50 text-teal-900 font-bold' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{opt}</span>
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

interface DataTableProps {
  activeTabGid?: string;
  headers: string[];
  rows: Record<string, any>[];
  loading: boolean;
  searchQuery: string;
  columnConfigs?: Record<string, string | ColumnConfig>;
  isFilterOpen?: boolean;
  onToggleFilter?: (open?: boolean) => void;
  onActiveFilterCountChange?: (count: number) => void;
  onEditRow: (row: Record<string, any>, rowIndex: number) => void;
  onDeleteRow: (row: Record<string, any>, rowIndex: number) => void;
  onPreviewImage: (url: string, title?: string) => void;
  onAddRecord: () => void;
  onSync: () => void;
  onOpenDataTypeModal?: () => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  activeTabGid,
  headers,
  rows,
  loading,
  searchQuery,
  columnConfigs = {},
  isFilterOpen: propIsFilterOpen,
  onToggleFilter,
  onActiveFilterCountChange,
  onEditRow,
  onDeleteRow,
  onPreviewImage,
  onAddRecord,
  onSync,
  onOpenDataTypeModal,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [localIsFilterOpen, setLocalIsFilterOpen] = useState<boolean>(false);
  const isFilterOpen = propIsFilterOpen !== undefined ? propIsFilterOpen : localIsFilterOpen;

  const handleCloseFilter = () => {
    if (onToggleFilter) {
      onToggleFilter(false);
    } else {
      setLocalIsFilterOpen(false);
    }
  };

  const [columnFilters, setColumnFilters] = useState<Record<string, any>>({});
  const [dropdownSearchQueries, setDropdownSearchQueries] = useState<Record<string, string>>({});
  const [missingSearchQuery, setMissingSearchQuery] = useState<string>('');
  const [activeMissingFilters, setActiveMissingFilters] = useState<string[]>([]);

  // Automatically reset search & filters when switching tabs
  useEffect(() => {
    setColumnFilters({});
    setDropdownSearchQueries({});
    setMissingSearchQuery('');
    setActiveMissingFilters([]);
    setCurrentPage(1);
  }, [activeTabGid]);

  // Helper to reliably read a cell value from a row regardless of casing/spacing
  const getRowCellValue = (row: Record<string, any>, col: string) => {
    if (row[col] !== undefined) return row[col];
    const trimmed = col.trim();
    if (row[trimmed] !== undefined) return row[trimmed];
    const matchedKey = Object.keys(row).find((k) => k.trim().toLowerCase() === trimmed.toLowerCase());
    return matchedKey ? row[matchedKey] : undefined;
  };

  // Helper to check if a cell value is missing, empty, or whitespace only
  const isCellBlankOrMissing = (val: any): boolean => {
    if (val === undefined || val === null) return true;
    const str = String(val).trim();
    return str === '' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined';
  };

  // Helper to parse dates from various formats (ISO, DD/MM/YYYY, MM/DD/YYYY, etc.)
  const parseFlexibleDate = (val: any): Date | null => {
    if (val === undefined || val === null || val === '') return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    const str = String(val).trim();
    if (!str) return null;

    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    const dmy = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
    if (dmy) {
      const day = parseInt(dmy[1], 10);
      const month = parseInt(dmy[2], 10) - 1;
      const year = parseInt(dmy[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }

    const ymd = str.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/);
    if (ymd) {
      const year = parseInt(ymd[1], 10);
      const month = parseInt(ymd[2], 10) - 1;
      const day = parseInt(ymd[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }

    return null;
  };

  // Columns configured with allowMissingFilter !== false
  const missingFilterColumns = useMemo(() => {
    return headers.filter((h) => {
      const rawConfig = normalizeColumnConfig(columnConfigs[h]);
      return rawConfig.allowMissingFilter !== false;
    });
  }, [headers, columnConfigs]);

  // Compute missing/blank count for each missing-filter-enabled column
  const missingCountsMap = useMemo(() => {
    const map: Record<string, number> = {};
    missingFilterColumns.forEach((col) => {
      let count = 0;
      rows.forEach((r) => {
        const val = getRowCellValue(r, col);
        if (isCellBlankOrMissing(val)) {
          count++;
        }
      });
      map[col] = count;
    });
    return map;
  }, [missingFilterColumns, rows]);

  // Search filtered missing columns
  const searchedMissingColumns = useMemo(() => {
    if (!missingSearchQuery.trim()) return missingFilterColumns;
    const q = missingSearchQuery.toLowerCase().trim();
    return missingFilterColumns.filter((c) => c.toLowerCase().includes(q));
  }, [missingFilterColumns, missingSearchQuery]);

  // Total active filters count across regular and missing filters
  const totalActiveFilters = useMemo(() => {
    const regularActive = Object.keys(columnFilters).filter((k) => {
      const v = columnFilters[k] as any;
      if (v === undefined || v === null || v === '' || v === 'all') return false;
      if (typeof v === 'object' && v !== null) {
        const hasDate = Boolean((v.from && String(v.from).trim()) || (v.to && String(v.to).trim()));
        const hasRange = Boolean(
          (v.min !== undefined && v.min !== null && String(v.min).trim() !== '') || 
          (v.max !== undefined && v.max !== null && String(v.max).trim() !== '')
        );
        return hasDate || hasRange;
      }
      return true;
    }).length;
    return regularActive + activeMissingFilters.length;
  }, [columnFilters, activeMissingFilters]);

  // Notify parent of total active filters
  useEffect(() => {
    onActiveFilterCountChange?.(totalActiveFilters);
  }, [totalActiveFilters, onActiveFilterCountChange]);

  // Filter visible headers based on column configuration and sort by drag-and-drop sequence
  const displayHeaders = useMemo(() => {
    const visible = headers.filter((h) => isColumnVisibleInTable(h, columnConfigs));
    return getOrderedHeaders(visible, columnConfigs);
  }, [headers, columnConfigs]);

  const hiddenCount = headers.length - displayHeaders.length;

  // Helper to get select options for a column based on config options or unique row values
  const getSelectOptionsForColumn = (header: string): string[] => {
    const rawConfig = normalizeColumnConfig(columnConfigs[header]);
    const optsStr = rawConfig.options || '';
    if (optsStr.trim()) {
      return optsStr.split(/,|\n/).map(s => s.trim()).filter(Boolean);
    }
    const uniqueVals = new Set<string>();
    rows.forEach(r => {
      const v = getRowCellValue(r, header);
      if (!isCellBlankOrMissing(v)) {
        uniqueVals.add(String(v).trim());
      }
    });
    return Array.from(uniqueVals);
  };

  // Filter rows by global search, missing data filter, and column-specific filter panel inputs
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // 1. Global search query check
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesGlobal = Object.values(row).some((val) => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(query);
        });
        if (!matchesGlobal) return false;
      }

      // 1.5. Missing / Blank data filters from left filter panel
      if (activeMissingFilters.length > 0) {
        for (const missingCol of activeMissingFilters) {
          const cellVal = getRowCellValue(row, missingCol);
          if (!isCellBlankOrMissing(cellVal)) {
            return false;
          }
        }
      }

      // 2. Column-specific filters from left filter panel
      for (const [colName, filterVal] of Object.entries(columnFilters)) {
        if (filterVal === undefined || filterVal === null || filterVal === '' || filterVal === 'all') {
          continue;
        }
        const cellVal = getRowCellValue(row, colName);
        const rawConfig = normalizeColumnConfig(columnConfigs[colName]);
        const filterType = (rawConfig.filterType && rawConfig.filterType !== 'auto') ? rawConfig.filterType : rawConfig.type;

        if (filterType === 'exact' || filterType === 'dropdown' || filterType === 'status' || filterType === 'category' || filterType === 'department' || filterType === 'select') {
          if (String(cellVal || '').trim().toLowerCase() !== String(filterVal).trim().toLowerCase()) {
            return false;
          }
        } else if (filterType === 'boolean' || filterType === 'checkbox') {
          const cellBool = Boolean(cellVal) || String(cellVal).toLowerCase() === 'true' || String(cellVal).toLowerCase() === 'yes';
          const filterBool = filterVal === 'true' || filterVal === 'yes';
          if (cellBool !== filterBool) return false;
        } else if (filterType === 'range') {
          let minStr = '';
          let maxStr = '';
          if (typeof filterVal === 'object' && filterVal !== null) {
            minStr = (filterVal as any).min !== undefined && (filterVal as any).min !== null ? String((filterVal as any).min).trim() : '';
            maxStr = (filterVal as any).max !== undefined && (filterVal as any).max !== null ? String((filterVal as any).max).trim() : '';
          } else if (typeof filterVal === 'string' && filterVal.trim()) {
            minStr = filterVal.trim();
          }

          if (minStr !== '' || maxStr !== '') {
            if (isCellBlankOrMissing(cellVal)) return false;
            const cleanStr = String(cellVal).replace(/[^0-9.-]+/g, '');
            const numCell = Number(cleanStr !== '' ? cleanStr : cellVal);
            if (isNaN(numCell)) return false;

            if (minStr !== '') {
              const minNum = Number(minStr);
              if (!isNaN(minNum) && numCell < minNum) return false;
            }
            if (maxStr !== '') {
              const maxNum = Number(maxStr);
              if (!isNaN(maxNum) && numCell > maxNum) return false;
            }
          }
        } else if (filterType === 'number') {
          const numCell = Number(cellVal);
          const numFilter = Number(filterVal);
          if (!isNaN(numCell) && !isNaN(numFilter)) {
            if (numCell !== numFilter) return false;
          } else {
            if (!String(cellVal || '').toLowerCase().includes(String(filterVal).toLowerCase())) return false;
          }
        } else if (filterType === 'null_empty') {
          const isEmpty = isCellBlankOrMissing(cellVal);
          if (filterVal === 'empty' && !isEmpty) return false;
          if (filterVal === 'not_empty' && isEmpty) return false;
        } else if (filterType === 'date_preset') {
          if (cellVal) {
            const cellDate = parseFlexibleDate(cellVal);
            if (!cellDate) return false;
            const now = new Date();
            if (filterVal === 'today') {
              if (cellDate.toDateString() !== now.toDateString()) return false;
            } else if (filterVal === 'this_week') {
              const diffTime = Math.abs(now.getTime() - cellDate.getTime());
              const diffDays = diffTime / (1000 * 3600 * 24);
              if (diffDays > 7) return false;
            } else if (filterVal === 'this_month') {
              if (cellDate.getMonth() !== now.getMonth() || cellDate.getFullYear() !== now.getFullYear()) return false;
            }
          } else {
            return false;
          }
        } else if (filterType === 'date' || filterType === 'datetime-local') {
          let fromStr = '';
          let toStr = '';
          if (typeof filterVal === 'object' && filterVal !== null) {
            fromStr = (filterVal as any).from ? String((filterVal as any).from).trim() : '';
            toStr = (filterVal as any).to ? String((filterVal as any).to).trim() : '';
          } else if (typeof filterVal === 'string' && filterVal.trim()) {
            fromStr = filterVal.trim();
          }

          if (fromStr || toStr) {
            if (isCellBlankOrMissing(cellVal)) return false;
            const cellDate = parseFlexibleDate(cellVal);
            if (!cellDate) {
              const cellStr = String(cellVal).trim();
              if (fromStr && cellStr < fromStr) return false;
              if (toStr && cellStr > toStr) return false;
            } else {
              if (fromStr) {
                const fromDate = new Date(fromStr);
                fromDate.setHours(0, 0, 0, 0);
                if (cellDate < fromDate) return false;
              }
              if (toStr) {
                const toDate = new Date(toStr);
                toDate.setHours(23, 59, 59, 999);
                if (cellDate > toDate) return false;
              }
            }
          }
        } else {
          if (cellVal === null || cellVal === undefined) return false;
          if (!String(cellVal).toLowerCase().includes(String(filterVal).toLowerCase())) {
            return false;
          }
        }
      }

      return true;
    });
  }, [rows, searchQuery, columnFilters, columnConfigs, activeMissingFilters]);

  // Pagination calculation
  const totalRows = filteredRows.length;
  const totalPages = Math.ceil(totalRows / pageSize) || 1;
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);

  // Helper to copy cell content
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCell(key);
    setTimeout(() => setCopiedCell(null), 1500);
  };

  // Check if string is Google Drive link or Image URL
  const isDriveOrImageUrl = (val: any): { isUrl: boolean; isDrive: boolean; isImage: boolean; url: string } => {
    if (typeof val !== 'string') return { isUrl: false, isDrive: false, isImage: false, url: '' };
    const str = val.trim();
    if (!str.startsWith('http://') && !str.startsWith('https://')) {
      return { isUrl: false, isDrive: false, isImage: false, url: '' };
    }
    const isDrive = str.includes('drive.google.com') || str.includes('googleusercontent.com');
    const isImage = /\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i.test(str) || isDrive;
    return { isUrl: true, isDrive, isImage, url: str };
  };

  if (loading && rows.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">Fetching Google Sheet Data...</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Loading rows directly from your Google Sheet with compact formatting.
        </p>
      </div>
    );
  }

  if (headers.length === 0 && !loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
        <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mb-3">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">No Data Found in this Sheet</h3>
        <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
          This Google Sheet tab is empty or couldn't be loaded. Click Sync to retry or Add a new record.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onSync}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium transition"
          >
            Sync Table
          </button>
          <button
            onClick={onAddRecord}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold shadow-xs transition"
          >
            Add First Record
          </button>
        </div>
      </div>
    );
  }

  // If all columns are configured as hidden in Table view
  if (displayHeaders.length === 0 && headers.length > 0 && !loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
        <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-3">
          <Sliders className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">All Columns are Hidden from Table</h3>
        <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
          All {headers.length} columns in this tab are currently set to "Hide in Table" in Configure Column Input Types.
        </p>
        {onOpenDataTypeModal && (
          <button
            onClick={onOpenDataTypeModal}
            className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Configure Column Visibility</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Filter Panel */}
        {isFilterOpen && (
          <div className="w-72 bg-slate-50/90 border-r border-slate-200 flex flex-col flex-shrink-0 z-10 shadow-xs">
            <div className="px-3 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                <Filter className="w-3.5 h-3.5 text-teal-600" />
                <span>Column Filters</span>
              </div>
              <div className="flex items-center gap-1">
                {totalActiveFilters > 0 && (
                  <button
                    onClick={() => {
                      setColumnFilters({});
                      setActiveMissingFilters([]);
                      setCurrentPage(1);
                    }}
                    className="text-[11px] text-teal-700 hover:text-teal-800 font-medium px-1.5 py-0.5 rounded bg-teal-50 hover:bg-teal-100 transition"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={handleCloseFilter}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
                  title="Close Filter Panel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3">
              {/* 1. Missing / Blank Data Filters Section */}
              <div className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Missing Data Filters</span>
                  </div>
                  {activeMissingFilters.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMissingFilters([]);
                        setCurrentPage(1);
                      }}
                      className="text-[10px] text-amber-800 hover:text-amber-900 font-semibold px-1.5 py-0.5 rounded bg-amber-200/80 hover:bg-amber-200 transition"
                    >
                      Reset ({activeMissingFilters.length})
                    </button>
                  )}
                </div>

                {/* Search Bar for Missing Filter Columns */}
                {missingFilterColumns.length > 0 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search missing columns..."
                      value={missingSearchQuery}
                      onChange={(e) => setMissingSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-6 py-1 bg-white border border-amber-200 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-2xs"
                    />
                    {missingSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setMissingSearchQuery('')}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {/* Column List with Badges */}
                {missingFilterColumns.length === 0 ? (
                  <div className="p-2 bg-white/90 rounded border border-amber-200/50 text-center space-y-1">
                    <p className="text-[11px] text-slate-500">No columns have Missing Filter turned ON.</p>
                    {onOpenDataTypeModal && (
                      <button
                        type="button"
                        onClick={onOpenDataTypeModal}
                        className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 underline"
                      >
                        Configure Columns
                      </button>
                    )}
                  </div>
                ) : searchedMissingColumns.length === 0 ? (
                  <p className="text-[11px] text-slate-500 text-center py-2 bg-white/70 rounded">
                    No columns match "{missingSearchQuery}"
                  </p>
                ) : (
                  <div className="space-y-1 max-h-44 overflow-y-auto no-scrollbar pr-0.5">
                    {searchedMissingColumns.map((col) => {
                      const isSelected = activeMissingFilters.includes(col);
                      const count = missingCountsMap[col] || 0;

                      return (
                        <button
                          key={col}
                          type="button"
                          onClick={() => {
                            setActiveMissingFilters((prev) =>
                              prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
                            );
                            setCurrentPage(1);
                          }}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition text-left border ${
                            isSelected
                              ? 'bg-amber-100 border-amber-400 text-amber-950 font-semibold shadow-2xs'
                              : 'bg-white hover:bg-amber-50/50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate mr-1.5">
                            {isSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span className="truncate" title={col}>
                              {col}
                            </span>
                          </div>

                          <span
                            className={`shrink-0 px-2 py-0.2 rounded-full text-[10px] font-bold ${
                              count > 0
                                ? isSelected
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                            title={`${count} blank / missing rows for ${col}`}
                          >
                            {count} missing
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Divider between Missing Data Filters and Standard Column Filters */}
              <div className="flex items-center gap-2 pt-1 pb-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Column Value Filters
                </span>
                <div className="flex-1 border-t border-slate-200" />
              </div>

              {headers.filter(h => {
                if (!isColumnVisibleInTable(h, columnConfigs)) return false;
                const rawConfig = normalizeColumnConfig(columnConfigs[h]);
                return rawConfig.showInFilter !== false;
              }).map((header) => {
                const rawConfig = normalizeColumnConfig(columnConfigs[header]);
                const filterType = (rawConfig.filterType && rawConfig.filterType !== 'auto') ? rawConfig.filterType : rawConfig.type;
                const currentVal = columnFilters[header] ?? '';
                const isFieldActive = Boolean(
                  typeof currentVal === 'object' && currentVal !== null
                    ? ((currentVal.from && String(currentVal.from).trim()) || 
                       (currentVal.to && String(currentVal.to).trim()) ||
                       (currentVal.min !== undefined && currentVal.min !== null && String(currentVal.min).trim() !== '') ||
                       (currentVal.max !== undefined && currentVal.max !== null && String(currentVal.max).trim() !== ''))
                    : (currentVal !== '' && currentVal !== undefined && currentVal !== null && currentVal !== 'all')
                );

                return (
                  <div 
                    key={header} 
                    className={`p-2.5 rounded-lg border shadow-2xs space-y-1.5 transition ${
                      isFieldActive ? 'bg-teal-50/30 border-teal-300 ring-1 ring-teal-300/40' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-700 truncate" title={header}>
                        {header}
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] uppercase tracking-wider font-mono px-1 py-0.2 rounded bg-teal-50 text-teal-700 border border-teal-100" title={`Filter Type: ${filterType}`}>
                          {filterType}
                        </span>
                        {isFieldActive && (
                          <button
                            type="button"
                            onClick={() => {
                              setColumnFilters(prev => {
                                const copy = { ...prev };
                                delete copy[header];
                                return copy;
                              });
                              setCurrentPage(1);
                            }}
                            className="p-0.5 text-slate-400 hover:text-red-500 rounded transition cursor-pointer"
                            title={`Clear ${header} filter`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {filterType === 'dropdown' || filterType === 'exact' || filterType === 'status' || filterType === 'category' || filterType === 'department' || filterType === 'select' ? (() => {
                      const options = getSelectOptionsForColumn(header);
                      return (
                        <SearchableFilterSelect
                          value={String(currentVal || '')}
                          header={header}
                          options={options}
                          onChange={(val) => {
                            setColumnFilters(prev => {
                              if (!val) {
                                const copy = { ...prev };
                                delete copy[header];
                                return copy;
                              }
                              return { ...prev, [header]: val };
                            });
                            setCurrentPage(1);
                          }}
                        />
                      );
                    })() : filterType === 'boolean' || filterType === 'checkbox' ? (
                      <select
                        value={currentVal}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, [header]: e.target.value }))}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                      >
                        <option value="">All</option>
                        <option value="true">True / Yes</option>
                        <option value="false">False / No</option>
                      </select>
                    ) : filterType === 'null_empty' ? (
                      <select
                        value={currentVal}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, [header]: e.target.value }))}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                      >
                        <option value="">All</option>
                        <option value="not_empty">Not Empty</option>
                        <option value="empty">Is Empty / Null</option>
                      </select>
                    ) : filterType === 'date_preset' ? (
                      <select
                        value={currentVal}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, [header]: e.target.value }))}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                      >
                        <option value="">All Dates</option>
                        <option value="today">Today</option>
                        <option value="this_week">This Week (Last 7 Days)</option>
                        <option value="this_month">This Month</option>
                      </select>
                    ) : filterType === 'range' ? (
                      <div className="space-y-1">
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                              Min
                            </label>
                            <input
                              type="number"
                              placeholder="Min value..."
                              value={typeof currentVal === 'object' && currentVal && currentVal.min !== undefined ? currentVal.min : ''}
                              onChange={(e) => {
                                const min = e.target.value;
                                setColumnFilters(prev => {
                                  const existing = typeof prev[header] === 'object' && prev[header] ? prev[header] : {};
                                  const nextVal = { ...existing, min };
                                  if ((nextVal.min === undefined || nextVal.min === '') && (nextVal.max === undefined || nextVal.max === '')) {
                                    const copy = { ...prev };
                                    delete copy[header];
                                    return copy;
                                  }
                                  return { ...prev, [header]: nextVal };
                                });
                                setCurrentPage(1);
                              }}
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                              Max
                            </label>
                            <input
                              type="number"
                              placeholder="Max value..."
                              value={typeof currentVal === 'object' && currentVal && currentVal.max !== undefined ? currentVal.max : ''}
                              onChange={(e) => {
                                const max = e.target.value;
                                setColumnFilters(prev => {
                                  const existing = typeof prev[header] === 'object' && prev[header] ? prev[header] : {};
                                  const nextVal = { ...existing, max };
                                  if ((nextVal.min === undefined || nextVal.min === '') && (nextVal.max === undefined || nextVal.max === '')) {
                                    const copy = { ...prev };
                                    delete copy[header];
                                    return copy;
                                  }
                                  return { ...prev, [header]: nextVal };
                                });
                                setCurrentPage(1);
                              }}
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs"
                            />
                          </div>
                        </div>
                        {Boolean(
                          typeof currentVal === 'object' && currentVal && (
                            (currentVal.min !== undefined && currentVal.min !== '') ||
                            (currentVal.max !== undefined && currentVal.max !== '')
                          )
                        ) && (
                          <div className="flex justify-end pt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setColumnFilters(prev => {
                                  const copy = { ...prev };
                                  delete copy[header];
                                  return copy;
                                });
                                setCurrentPage(1);
                              }}
                              className="text-[10px] text-teal-700 hover:text-red-600 font-medium transition cursor-pointer"
                            >
                              Reset Range
                            </button>
                          </div>
                        )}
                      </div>
                    ) : filterType === 'number' ? (
                      <input
                        type="number"
                        placeholder={`Filter ${header} (Number)...`}
                        value={currentVal}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, [header]: e.target.value }))}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                      />
                    ) : filterType === 'date' || filterType === 'datetime-local' ? (
                      <div className="space-y-1">
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                              From Date
                            </label>
                            <input
                              type="date"
                              value={typeof currentVal === 'object' && currentVal ? currentVal.from || '' : (typeof currentVal === 'string' ? currentVal : '')}
                              onChange={(e) => {
                                const from = e.target.value;
                                setColumnFilters(prev => {
                                  const existing = typeof prev[header] === 'object' && prev[header] ? prev[header] : {};
                                  const nextVal = { ...existing, from };
                                  if (!nextVal.from && !nextVal.to) {
                                    const copy = { ...prev };
                                    delete copy[header];
                                    return copy;
                                  }
                                  return { ...prev, [header]: nextVal };
                                });
                                setCurrentPage(1);
                              }}
                              className="w-full px-1.5 py-1 bg-slate-50 border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                              To Date
                            </label>
                            <input
                              type="date"
                              value={typeof currentVal === 'object' && currentVal ? currentVal.to || '' : ''}
                              onChange={(e) => {
                                const to = e.target.value;
                                setColumnFilters(prev => {
                                  const existing = typeof prev[header] === 'object' && prev[header] ? prev[header] : {};
                                  const nextVal = { ...existing, to };
                                  if (!nextVal.from && !nextVal.to) {
                                    const copy = { ...prev };
                                    delete copy[header];
                                    return copy;
                                  }
                                  return { ...prev, [header]: nextVal };
                                });
                                setCurrentPage(1);
                              }}
                              className="w-full px-1.5 py-1 bg-slate-50 border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs"
                            />
                          </div>
                        </div>
                        {Boolean(
                          (typeof currentVal === 'object' && currentVal && (currentVal.from || currentVal.to)) ||
                          (typeof currentVal === 'string' && currentVal)
                        ) && (
                          <div className="flex justify-end pt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setColumnFilters(prev => {
                                  const copy = { ...prev };
                                  delete copy[header];
                                  return copy;
                                });
                                setCurrentPage(1);
                              }}
                              className="text-[10px] text-teal-700 hover:text-red-600 font-medium transition cursor-pointer"
                            >
                              Reset Dates
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder={`Filter ${header}...`}
                        value={currentVal}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, [header]: e.target.value }))}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Table Scroll Container */}
        <div
          className="flex-1 overflow-auto no-scrollbar bg-white"
        >
          <table className="w-full text-left border-collapse text-xs bg-white">
            <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b border-slate-200 shadow-2xs">
              <tr>
                {displayHeaders.map((header) => (
                  <th
                    key={header}
                    className="px-2.5 py-1.5 font-semibold text-slate-700 select-none border-r border-slate-200 whitespace-nowrap"
                  >
                    <span className="truncate">{header}</span>
                  </th>
                ))}
                <th className="px-2.5 py-1.5 font-semibold text-slate-700 text-center w-20 sticky right-0 bg-slate-100 border-l border-slate-200">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-slate-700 bg-white">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={displayHeaders.length + 1} className="px-4 py-8 text-center text-slate-400 bg-white">
                    <p className="text-xs">No records matched your search query.</p>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, index) => {
                  const globalIndex = (safePage - 1) * pageSize + index + 1;
                  return (
                    <tr
                      key={index}
                      className="hover:bg-teal-50/40 transition group"
                    >
                      {/* Column Cells */}
                      {displayHeaders.map((header) => {
                        const cellVal = row[header];
                        const valStr = cellVal !== undefined && cellVal !== null ? String(cellVal) : '';
                        const urlCheck = isDriveOrImageUrl(cellVal);
                        const cellKey = `${index}-${header}`;

                        return (
                          <td
                            key={header}
                            className="px-2.5 py-1.5 border-r border-slate-100 max-w-[280px] truncate relative bg-white group-hover:bg-teal-50/40"
                          >
                            {urlCheck.isUrl ? (
                              <div className="flex items-center gap-1.5">
                                {urlCheck.isImage ? (
                                  <button
                                    onClick={() => onPreviewImage(urlCheck.url, `${header} Preview`)}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-[11px] font-medium transition cursor-pointer"
                                    title="Click to view file/photo"
                                  >
                                    <ImageIcon className="w-3 h-3 text-teal-600" />
                                    <span className="truncate max-w-[120px]">View File</span>
                                    <Eye className="w-3 h-3 text-teal-500" />
                                  </button>
                                ) : (
                                  <a
                                    href={urlCheck.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[11px] font-medium transition"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span className="truncate max-w-[120px]">Open Link</span>
                                  </a>
                                )}
                                <button
                                  onClick={() => copyToClipboard(urlCheck.url, cellKey)}
                                  className="p-0.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                                  title="Copy link"
                                >
                                  {copiedCell === cellKey ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between group/cell">
                                <span className="truncate" title={valStr}>
                                  {valStr || <span className="text-slate-300 italic">—</span>}
                                </span>
                                {valStr && (
                                  <button
                                    onClick={() => copyToClipboard(valStr, cellKey)}
                                    className="opacity-0 group-hover/cell:opacity-100 p-0.5 ml-1 text-slate-400 hover:text-teal-600 transition flex-shrink-0 cursor-pointer"
                                    title="Copy text"
                                  >
                                    {copiedCell === cellKey ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Row Actions */}
                      <td className="px-2 py-1 text-center sticky right-0 bg-white group-hover:bg-teal-50/40 border-l border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            id={`edit-row-btn-${index}`}
                            onClick={() => onEditRow(row, globalIndex - 1)}
                            className="p-1 rounded text-slate-500 hover:text-teal-700 hover:bg-teal-100 transition cursor-pointer"
                            title="Edit Row"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`delete-row-btn-${index}`}
                            onClick={() => onDeleteRow(row, globalIndex - 1)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination & Status Footer */}
      <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        {/* Left: Total Rows & Showing entries */}
        <div className="flex items-center flex-wrap gap-2">
          <span className="font-medium text-slate-700">
            Total: <strong className="text-teal-700 font-semibold">{totalRows}</strong> {totalRows === 1 ? 'row' : 'rows'}
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">
            Showing <strong className="text-slate-700 font-medium">{totalRows === 0 ? 0 : (safePage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-slate-700 font-medium">{Math.min(safePage * pageSize, totalRows)}</strong>
          </span>
          {hiddenCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-[10.5px] px-1.5 py-0.5 rounded font-medium">
              <Sliders className="w-3 h-3 text-amber-600" />
              <span>{displayHeaders.length}/{headers.length} Cols</span>
            </span>
          )}
          {searchQuery && (
            <span className="bg-teal-50 text-teal-700 border border-teal-200 text-[11px] px-1.5 py-0.2 rounded font-medium">
              Filtered: "{searchQuery}"
            </span>
          )}
        </div>

        {/* Right: Rows per page & Page Navigation */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Rows per page selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500">Rows per page:</span>
            <select
              id="page-size-select"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none focus:border-teal-500 shadow-2xs font-medium"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Page navigation controls */}
          <div className="flex items-center gap-1">
            <button
              id="first-page-btn"
              onClick={() => setCurrentPage(1)}
              disabled={safePage <= 1}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              id="prev-page-btn"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={safePage <= 1}
              className="p-1 px-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 text-[11px]"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <span className="px-2 py-0.5 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded">
              Page {safePage} / {totalPages}
            </span>

            <button
              id="next-page-btn"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={safePage >= totalPages}
              className="p-1 px-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 text-[11px]"
              title="Next Page"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              id="last-page-btn"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage >= totalPages}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
