import React, { useState, useMemo } from 'react';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
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
  Sliders
} from 'lucide-react';
import { ColumnConfig } from '../types';
import { isColumnVisibleInTable, getOrderedHeaders } from '../services/sheetService';

interface DataTableProps {
  headers: string[];
  rows: Record<string, any>[];
  loading: boolean;
  searchQuery: string;
  columnConfigs?: Record<string, string | ColumnConfig>;
  onEditRow: (row: Record<string, any>, rowIndex: number) => void;
  onDeleteRow: (row: Record<string, any>, rowIndex: number) => void;
  onPreviewImage: (url: string, title?: string) => void;
  onAddRecord: () => void;
  onSync: () => void;
  onOpenDataTypeModal?: () => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  headers,
  rows,
  loading,
  searchQuery,
  columnConfigs = {},
  onEditRow,
  onDeleteRow,
  onPreviewImage,
  onAddRecord,
  onSync,
  onOpenDataTypeModal,
}) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

  // Filter visible headers based on column configuration and sort by drag-and-drop sequence
  const displayHeaders = useMemo(() => {
    const visible = headers.filter((h) => isColumnVisibleInTable(h, columnConfigs));
    return getOrderedHeaders(visible, columnConfigs);
  }, [headers, columnConfigs]);

  const hiddenCount = headers.length - displayHeaders.length;

  // Sorting handler
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Filter rows by global search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const query = searchQuery.toLowerCase().trim();
    return rows.filter((row) => {
      return Object.values(row).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(query);
      });
    });
  }, [rows, searchQuery]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!sortColumn) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];

      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredRows, sortColumn, sortDirection]);

  // Pagination calculation
  const totalRows = sortedRows.length;
  const totalPages = Math.ceil(totalRows / pageSize) || 1;
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, safePage, pageSize]);

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
      {/* Main Table Scroll Container */}
      <div className="flex-1 overflow-auto no-scrollbar">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b border-slate-300 shadow-2xs">
            <tr>
              <th className="px-2.5 py-1.5 font-semibold text-slate-500 w-12 text-center border-r border-slate-200">
                #
              </th>
              {displayHeaders.map((header) => {
                const isSorted = sortColumn === header;
                return (
                  <th
                    key={header}
                    onClick={() => handleSort(header)}
                    className="px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-200/80 cursor-pointer select-none transition border-r border-slate-200 whitespace-nowrap"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="truncate">{header}</span>
                      <span className="text-slate-400">
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-teal-600" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-teal-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                        )}
                      </span>
                    </div>
                  </th>
                );
              })}
              <th className="px-2.5 py-1.5 font-semibold text-slate-700 text-center w-20 sticky right-0 bg-slate-100 border-l border-slate-200">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-slate-700">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={displayHeaders.length + 2} className="px-4 py-8 text-center text-slate-400">
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
                    {/* Row number */}
                    <td className="px-2.5 py-1.5 text-center font-mono text-[11px] text-slate-400 border-r border-slate-100 bg-slate-50/30">
                      {globalIndex}
                    </td>

                    {/* Column Cells */}
                    {displayHeaders.map((header) => {
                      const cellVal = row[header];
                      const valStr = cellVal !== undefined && cellVal !== null ? String(cellVal) : '';
                      const urlCheck = isDriveOrImageUrl(cellVal);
                      const cellKey = `${index}-${header}`;

                      return (
                        <td
                          key={header}
                          className="px-2.5 py-1.5 border-r border-slate-100 max-w-[280px] truncate relative"
                        >
                          {urlCheck.isUrl ? (
                            <div className="flex items-center gap-1.5">
                              {urlCheck.isImage ? (
                                <button
                                  onClick={() => onPreviewImage(urlCheck.url, `${header} Preview`)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-[11px] font-medium transition"
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
                                className="p-0.5 text-slate-400 hover:text-slate-600 transition"
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
                                  className="opacity-0 group-hover/cell:opacity-100 p-0.5 ml-1 text-slate-400 hover:text-teal-600 transition flex-shrink-0"
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
                          className="p-1 rounded text-slate-500 hover:text-teal-700 hover:bg-teal-100 transition"
                          title="Edit Row"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`delete-row-btn-${index}`}
                          onClick={() => onDeleteRow(row, globalIndex - 1)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
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
