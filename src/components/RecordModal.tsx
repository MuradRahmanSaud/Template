import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Save, 
  Upload, 
  Image as ImageIcon, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Key,
  FolderUp,
  FileSpreadsheet,
  ExternalLink,
  Copy,
  Check,
  Folder,
  FileText,
  Trash2,
  Eye,
  RefreshCw,
  Sliders,
  ChevronDown
} from 'lucide-react';
import { 
  uploadFileToDrive, 
  fileToBase64, 
  formatDriveViewUrl, 
  getDriveThumbnailUrl, 
  extractDriveFileId,
  normalizeColumnConfig,
  isColumnVisibleInForm,
  getColumnInputType,
  getOrderedHeaders
} from '../services/sheetService';
import { ColumnConfig, FormStyleConfig } from '../types';
import { AppsScriptGuideModal } from './AppsScriptGuideModal';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  headers: string[];
  initialData?: Record<string, any> | null;
  columnTypes?: Record<string, string | ColumnConfig>;
  onSave: (data: Record<string, any>, idKey?: string, idValue?: string | number) => Promise<boolean>;
  targetDriveFolder: string;
  webAppUrl: string;
  formStyle?: FormStyleConfig | null;
}

interface FieldDescriptor {
  name: string;
  label: string;
  type: string;
  grid_span: number;
  required: boolean;
  placeholder: string;
  options?: string;
}

const SearchableSingleSelectDropdown: React.FC<{
  header: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}> = ({ header, options, value, onChange, disabled, onFocus, onBlur }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOpen) {
          setIsOpen(false);
          onBlur?.();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onBlur]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    return options.filter((opt) => opt.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm]);

  return (
    <div ref={dropdownRef} className="relative w-full">
      <div
        onClick={() => {
          if (!disabled) {
            const next = !isOpen;
            setIsOpen(next);
            if (next) onFocus?.();
            else onBlur?.();
          }
        }}
        className={`w-full min-h-[34px] px-2.5 py-1.5 bg-white border border-slate-300 focus-within:border-teal-500 rounded-md text-xs text-slate-800 transition flex items-center justify-between gap-1.5 cursor-pointer ${
          disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'hover:border-slate-400'
        }`}
      >
        <span className={value ? 'text-slate-800 font-medium' : 'text-slate-400 font-medium'}>
          {value || ''}
        </span>
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                onBlur?.();
              }}
              className="hover:text-slate-600 focus:outline-none p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? 'rotate-180 text-teal-600' : ''}`} />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg p-2 space-y-1.5 max-h-60 overflow-y-auto">
          <input
            type="text"
            placeholder="Search options..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-500"
            autoFocus
          />

          <div className="space-y-0.5 max-h-44 overflow-y-auto">
            <div
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className={`px-2.5 py-1.5 rounded cursor-pointer text-xs transition text-slate-400 hover:bg-slate-100 ${!value ? 'bg-slate-50 font-semibold' : ''}`}
            >
              -- Clear Selection --
            </div>
            {filteredOptions.length === 0 ? (
              <div className="text-xs text-slate-400 p-2 text-center">No options found</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value === opt;
                return (
                  <div
                    key={opt}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer text-xs font-medium transition ${
                      isSelected ? 'bg-teal-50 text-teal-900 font-semibold' : 'text-slate-700 hover:bg-slate-100'
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

const MultiSelectDropdown: React.FC<{
  header: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}> = ({ header, options, value, onChange, disabled, onFocus, onBlur }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedValues = useMemo(() => {
    return String(value || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOpen) {
          setIsOpen(false);
          onBlur?.();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onBlur]);

  const toggleOption = (opt: string) => {
    if (disabled) return;
    let newVals: string[];
    if (selectedValues.includes(opt)) {
      newVals = selectedValues.filter((v) => v !== opt);
    } else {
      newVals = [...selectedValues, opt];
    }
    onChange(newVals.join(', '));
  };

  const filteredOptions = useMemo(() => {
    let filtered = options;
    if (searchTerm.trim()) {
      filtered = options.filter((opt) => opt.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // Sort so that selected values are displayed first in the dropdown list
    return [...filtered].sort((a, b) => {
      const aSelected = selectedValues.includes(a);
      const bSelected = selectedValues.includes(b);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });
  }, [options, searchTerm, selectedValues]);

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Trigger Box */}
      <div
        onClick={() => {
          if (!disabled) {
            const next = !isOpen;
            setIsOpen(next);
            if (next) onFocus?.();
            else onBlur?.();
          }
        }}
        className={`w-full min-h-[34px] px-2.5 py-1 bg-white border border-slate-300 focus-within:border-teal-500 rounded-md text-xs text-slate-800 transition flex items-center justify-between gap-1.5 cursor-pointer ${
          disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'hover:border-slate-400'
        }`}
      >
        <div className="flex items-center gap-1.5 overflow-hidden py-1 select-none">
          {selectedValues.length === 0 ? (
            <span className="text-slate-400 font-medium"></span>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-1.5 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-bold">
                {selectedValues.length}
              </span>
              <span className="font-semibold text-teal-850 text-xs shrink-0">
                {selectedValues.length === 1 ? 'item selected' : 'items selected'}
              </span>
              <span className="text-slate-400 font-normal text-[11px] truncate" title={selectedValues.join(', ')}>
                ({selectedValues.join(', ')})
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {selectedValues.length > 0 && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                onBlur?.();
              }}
              className="hover:text-slate-600 focus:outline-none p-0.5"
              title="Clear all"
            >
              <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
            </button>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? 'rotate-180 text-teal-600' : ''}`} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg p-2 space-y-1.5 max-h-60 overflow-y-auto">
          <input
            type="text"
            placeholder="Search options..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-500"
            autoFocus
          />

          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pb-1 border-b border-slate-100">
            <span>{selectedValues.length} selected</span>
            {selectedValues.length > 0 && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="text-teal-600 hover:text-teal-800 font-medium"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="text-xs text-slate-400 p-2 text-center">No options found</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(opt);
                return (
                  <div
                    key={opt}
                    onClick={() => toggleOption(opt)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer text-xs font-medium transition ${
                      isSelected ? 'bg-teal-50 text-teal-900 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="w-3.5 h-3.5 text-teal-600 rounded border-slate-300 focus:ring-teal-500 pointer-events-none"
                      />
                      <span>{opt}</span>
                    </div>
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

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  mode,
  headers,
  initialData,
  columnTypes = {},
  onSave,
  targetDriveFolder,
  webAppUrl,
  formStyle,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [initialFormData, setInitialFormData] = useState<Record<string, any>>({});
  const [selectedIdKey, setSelectedIdKey] = useState<string>('');
  const [initialIdKey, setInitialIdKey] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [driveAuthError, setDriveAuthError] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadHeaderRef = useRef<string | null>(null);

  // Initialize form data
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setDriveAuthError(false);
      setIsSubmitting(false);

      if (mode === 'edit' && initialData) {
        const normalized: Record<string, any> = { ...initialData };
        headers.forEach((h) => {
          const val = initialData[h] ?? initialData[h.trim()];
          if (val !== undefined) {
            normalized[h] = val;
            normalized[h.trim()] = val;
          }
        });
        setFormData(normalized);
        setInitialFormData(normalized);
      } else {
        const emptyData: Record<string, any> = {};
        headers.forEach((h) => {
          emptyData[h] = '';
          emptyData[h.trim()] = '';
        });
        setFormData(emptyData);
        setInitialFormData(emptyData);
      }

      // Auto-detect ID key (look for primary config first, then fallback to common names or headers[0])
      if (headers.length > 0) {
        let pCol = headers.find((h) => {
          const rawConfig = columnTypes[h] || columnTypes[h.trim()];
          if (typeof rawConfig === 'object' && rawConfig.isPrimary) return true;
          return false;
        });
        if (!pCol) {
          pCol = headers.find((h) => /^id$/i.test(h.trim()) || /_id$/i.test(h.trim()) || /^sl$/i.test(h.trim())) || headers[0];
        }
        const detectedKey = pCol || headers[0];
        setSelectedIdKey(detectedKey);
        setInitialIdKey(detectedKey);
      }
    }
  }, [isOpen, mode, initialData, headers, columnTypes]);

  const isDirty = useMemo(() => {
    if (selectedIdKey !== initialIdKey) return true;
    for (const h of headers) {
      const currentVal = String(formData[h] ?? formData[h.trim()] ?? '').trim();
      const initialVal = String(initialFormData[h] ?? initialFormData[h.trim()] ?? '').trim();
      if (currentVal !== initialVal) return true;
    }
    return false;
  }, [formData, initialFormData, selectedIdKey, initialIdKey, headers]);

  const getFieldValue = (header: string): string => {
    if (formData[header] !== undefined && formData[header] !== null) return String(formData[header]);
    const trimmed = header.trim();
    if (formData[trimmed] !== undefined && formData[trimmed] !== null) return String(formData[trimmed]);
    const foundKey = Object.keys(formData).find((k) => k.trim().toLowerCase() === trimmed.toLowerCase());
    if (foundKey && formData[foundKey] !== undefined && formData[foundKey] !== null) {
      return String(formData[foundKey]);
    }
    return '';
  };

  const handleInputChange = (header: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [header]: value,
      [header.trim()]: value,
    }));
  };

  // Filter visible headers for Form (Show in Form = Yes) and sort by custom sequence order
  const displayHeaders = useMemo(() => {
    const visible = headers.filter((h) => isColumnVisibleInForm(h, columnTypes));
    return getOrderedHeaders(visible, columnTypes);
  }, [headers, columnTypes]);

  // Read formSettings from columnTypes['_formSettings'] if available
  const parsedFormSettings = useMemo(() => {
    const rawSettings = columnTypes['_formSettings'];
    if (rawSettings && typeof rawSettings === 'object') {
      return {
        title: (rawSettings as any).title || '',
        modal_size: (rawSettings as any).modal_size || 'lg',
        layout_type: (rawSettings as any).layout_type || 'grid',
        columns_per_row: (rawSettings as any).columns_per_row || 12
      };
    }
    // Fallback to legacy formStyle or defaults
    if (formStyle) {
      return {
        title: formStyle.form_settings.title || '',
        modal_size: formStyle.form_settings.modal_size || 'lg',
        layout_type: formStyle.form_settings.layout_type || 'grid',
        columns_per_row: formStyle.form_settings.columns_per_row || 12
      };
    }
    return {
      title: '',
      modal_size: 'lg',
      layout_type: 'grid',
      columns_per_row: 12
    };
  }, [columnTypes, formStyle]);

  const isGridLayout = parsedFormSettings.layout_type === 'grid';

  const sizeClass = useMemo(() => {
    const mSize = parsedFormSettings.modal_size;
    if (mSize === 'sm') return 'max-w-sm';
    if (mSize === 'md') return 'max-w-md';
    if (mSize === 'lg') return 'max-w-3xl'; // 3xl is beautiful for lg
    if (mSize === 'xl') return 'max-w-5xl';
    if (mSize === '2xl') return 'max-w-7xl';
    if (mSize === 'full') return 'max-w-full h-full rounded-none';
    return 'max-w-3xl';
  }, [parsedFormSettings.modal_size]);

  // Unified normalization of fields to render, combining custom Form Styles with fallback defaults
  const fieldsToLoop = useMemo<FieldDescriptor[]>(() => {
    const fields = displayHeaders.map(header => {
      const rawConfig = columnTypes[header] || columnTypes[header.trim()];
      const norm = normalizeColumnConfig(rawConfig);
      
      const customLabel = rawConfig && typeof rawConfig === 'object' ? (rawConfig as any).label : undefined;
      const customPlaceholder = rawConfig && typeof rawConfig === 'object' ? (rawConfig as any).placeholder : undefined;
      const customRequired = rawConfig && typeof rawConfig === 'object' ? (rawConfig as any).required : undefined;
      const customGridSpan = rawConfig && typeof rawConfig === 'object' ? (rawConfig as any).gridSpan : undefined;

      let detectedType = norm.type;
      if (!detectedType || detectedType === 'text') {
        const lowerHeader = header.toLowerCase().trim();
        if (/photo|image|pic|picture|avatar|attachment|doc|pdf/i.test(lowerHeader) || /\bfile\b/i.test(lowerHeader)) {
          detectedType = 'file';
        } else if (/date|dob|birth|joining|time_stamp|created_at/i.test(lowerHeader)) {
          detectedType = 'date';
        } else if (/email|e-mail|mail/i.test(lowerHeader)) {
          detectedType = 'email';
        } else if (/phone|mobile|cell|contact|tel|fax|whatsapp/i.test(lowerHeader)) {
          detectedType = 'tel';
        } else if (/address|description|notes|details|comment|bio|summary|remark/i.test(lowerHeader)) {
          detectedType = 'textarea';
        } else if (/age|qty|quantity|amount|price|cost|score|rate|count|num|number|total|salary|id_no|sl/i.test(lowerHeader)) {
          detectedType = 'number';
        } else if (/gender|sex|status|type|category|department|role/i.test(lowerHeader)) {
          detectedType = 'select';
        } else if (/is_|has_|active|approved|verified|yes_no/i.test(lowerHeader)) {
          detectedType = 'checkbox';
        } else {
          detectedType = norm.type || 'text';
        }
      }

      return {
        name: header,
        label: customLabel || header,
        type: detectedType,
        grid_span: customGridSpan !== undefined ? customGridSpan : (detectedType === 'textarea' ? 12 : 6),
        required: !!customRequired,
        placeholder: customPlaceholder || `Enter ${customLabel || header}...`,
        options: norm.options
      };
    });
    console.log('RecordModal fieldsToLoop:', fields.map(f => f.name));
    return fields;
  }, [displayHeaders, columnTypes]);

  // Get configured folder path for a header
  const getHeaderFolderPath = (header: string): string => {
    const trimmed = header.trim();
    const lower = trimmed.toLowerCase();

    const rawConfig = columnTypes[header] || columnTypes[trimmed];
    const norm = normalizeColumnConfig(rawConfig);

    if (norm.type === 'file' && norm.folderPath) {
      return norm.folderPath;
    }

    // Smart default based on column name if not explicitly set
    if (/profile|avatar/i.test(lower)) {
      return 'Murad Rahman Saud/Profile Pictures';
    }
    if (/cover/i.test(lower)) {
      return 'Murad Rahman Saud/Cover Photos';
    }
    if (/photo|image|picture|pic/i.test(lower)) {
      return 'Murad Rahman Saud/Photos';
    }
    if (/doc|pdf|attachment/i.test(lower)) {
      return 'Murad Rahman Saud/Documents';
    }

    return targetDriveFolder || 'Murad Rahman Saud';
  };

  // Trigger file upload for a specific field
  const handleTriggerUpload = (header: string) => {
    activeUploadHeaderRef.current = header;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Handle selected file upload to Google Drive
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetHeader = activeUploadHeaderRef.current;
    if (!file || !targetHeader) return;

    const colFolder = getHeaderFolderPath(targetHeader);

    try {
      setUploadingField(targetHeader);
      setErrorMsg(null);
      setDriveAuthError(false);

      // 1. Send file Base64 to Google Apps Script Web App
      const res = await uploadFileToDrive(file, colFolder, webAppUrl);

      // 2. Extract and format Google Drive preview/view link
      if (res.success && res.url) {
        const driveViewUrl = formatDriveViewUrl(res.url, res.fileId);

        // 3. Immediately set the Google Drive preview link into formData for this input field
        setFormData((prev) => {
          return {
            ...prev,
            [targetHeader]: driveViewUrl,
            [targetHeader.trim()]: driveViewUrl,
          };
        });

        setSuccessMsg(`File "${file.name}" uploaded to Google Drive! Link added to "${targetHeader}".`);
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        const errMsg = res.error || 'Could not upload file to Google Drive';
        setErrorMsg(`Drive upload failed: ${errMsg}`);
        if (res.isAccessDenied || String(errMsg).includes('DriveApp')) {
          setDriveAuthError(true);
        }
      }
    } catch (err: any) {
      const errMsg = err.message || err;
      setErrorMsg(`Drive upload error: ${errMsg}`);
      if (String(errMsg).includes('DriveApp')) {
        setDriveAuthError(true);
      }
    } finally {
      setUploadingField(null);
      activeUploadHeaderRef.current = null;
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCopyLink = (header: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedField(header);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      const idVal = initialData ? (initialData[selectedIdKey] ?? initialData[selectedIdKey.trim()]) : (formData[selectedIdKey] ?? formData[selectedIdKey.trim()]);
      onSave(formData, selectedIdKey, idVal);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
      />

      <div className={`bg-white rounded-xl shadow-2xl border-0 w-full max-h-[90vh] flex flex-col overflow-hidden transition-all duration-200 ${sizeClass}`}>
        {/* Modal Header */}
        <div className="px-4 py-3 bg-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center border border-teal-500">
              <FileSpreadsheet className="w-4 h-4 text-teal-100" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">
                {parsedFormSettings.title 
                  ? (mode === 'add' ? parsedFormSettings.title : `Edit - ${parsedFormSettings.title}`)
                  : (mode === 'add' ? 'Add New Record to Google Sheet' : 'Edit Google Sheet Record')}
              </h3>
              <p className="text-[11px] text-teal-200">
                {parsedFormSettings.title 
                  ? `Populate fields for ${parsedFormSettings.title}` 
                  : (mode === 'add' ? 'Populate fields and append row to sheet' : `Updating row matching ${selectedIdKey}`)}
              </p>
            </div>
          </div>
          <button
            id="close-record-modal-btn"
            onClick={onClose}
            className="p-1 rounded text-teal-200 hover:text-white hover:bg-teal-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notifications */}
        {driveAuthError && (
          <div className="mx-4 mt-3 p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2 shadow-2xs shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Google Drive Permission Error (Access denied: DriveApp)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition shadow-2xs"
              >
                <span>🛠️ সমাধান দেখুন</span>
              </button>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Google Apps Script এ ড্রাইভ আপলোডের জন্য Web App টিকে <strong>&quot;Execute as: Me&quot;</strong> এবং <strong>&quot;Who has access: Anyone&quot;</strong> হিসেবে ডেপ্লয় করতে হবে।
            </p>
            <div className="text-[11px] bg-amber-100/80 p-2.5 rounded border border-amber-200 text-amber-950 space-y-1.5">
              <p className="font-bold text-amber-900">🛠️ দ্রুত সমাধান (Quick Steps):</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Google Sheet &gt; <strong>Extensions</strong> &gt; <strong>Apps Script</strong> ওপেন করুন।</li>
                <li>উপরে ফাংশন মেনু থেকে <code className="bg-white px-1 py-0.5 rounded text-[10px] font-mono font-bold text-teal-700">authorizeDrive</code> সিলেক্ট করে <strong>▶ Run</strong> বাটনে ক্লিক করে Permission Allow করুন।</li>
                <li>উপরে ডানপাশে <strong>Deploy &gt; Manage Deployments &gt; Edit (Pencil)</strong> এ ক্লিক করুন।</li>
                <li><strong>Execute as</strong>: <strong className="text-emerald-800 bg-emerald-100 px-1 rounded">Me (your email)</strong>, <strong>Who has access</strong>: <strong className="text-teal-800 bg-teal-100 px-1 rounded">Anyone</strong>, <strong>Version</strong>: <strong className="text-blue-800 bg-blue-100 px-1 rounded">New version</strong> সিলেক্ট করে <strong>Deploy</strong> এ ক্লিক করুন।</li>
              </ol>
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="mt-1 px-3 py-1 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded font-semibold text-[11px] transition"
              >
                📋 সম্পূর্ণ স্ক্রিপ্ট কোড ও বিস্তারিত গাইড দেখুন
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mx-4 mt-3 p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-4 mt-3 p-2.5 rounded bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form 
          id="record-form"
          onSubmit={handleSubmit} 
          className={`flex-1 overflow-y-auto p-4 ${isGridLayout ? 'grid grid-cols-12 gap-x-3 gap-y-2' : 'space-y-2'}`}
        >
          {fieldsToLoop.length === 0 ? (
            <div className="col-span-12 text-center py-8 text-slate-500 text-xs space-y-2">
              <Sliders className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="font-semibold text-slate-700">All Form Fields are Hidden</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                All columns for this sheet are set to "Hide in Form" or hidden in Form Layout.
              </p>
            </div>
          ) : (
            fieldsToLoop.map((field) => {
              const header = field.name;
              const isIdKey = header === selectedIdKey;
              const isUploadingThis = uploadingField === header;
              const rawConfig = columnTypes[header] || columnTypes[header.trim()];
              const norm = normalizeColumnConfig(rawConfig);

              const inputType = field.type;
              const isSelect = inputType === 'select';
              const selectMode = norm.selectMode || 'single';
              const selectOptions = isSelect && (field.options || norm.options)
                ? (field.options || norm.options).split(',').map((s) => s.trim()).filter(Boolean)
                : ['Male', 'Female', 'Other', 'Active', 'Pending', 'Completed', 'Yes', 'No'];

              const isFileField = inputType === 'file';
              const colFolder = norm.folderPath || getHeaderFolderPath(header);
              const currentValue = getFieldValue(header);
              const isImageField = /photo|picture|avatar|image|img|cover|banner|logo|thumbnail|pic/i.test(header);
              const hasLinkValue = currentValue.startsWith('http://') || currentValue.startsWith('https://');
              const isUniqueKeyField = mode === 'edit' && isIdKey;

              const spanClass = 
                field.grid_span === 1 ? 'col-span-12 sm:col-span-1' :
                field.grid_span === 2 ? 'col-span-12 sm:col-span-2' :
                field.grid_span === 3 ? 'col-span-12 sm:col-span-3' :
                field.grid_span === 4 ? 'col-span-12 sm:col-span-4' :
                field.grid_span === 5 ? 'col-span-12 sm:col-span-5' :
                field.grid_span === 6 ? 'col-span-12 sm:col-span-6' :
                field.grid_span === 7 ? 'col-span-12 sm:col-span-7' :
                field.grid_span === 8 ? 'col-span-12 sm:col-span-8' :
                field.grid_span === 9 ? 'col-span-12 sm:col-span-9' :
                field.grid_span === 10 ? 'col-span-12 sm:col-span-10' :
                field.grid_span === 11 ? 'col-span-12 sm:col-span-11' :
                'col-span-12';

              const isFocused = focusedField === header;
              const hasValue = !!getFieldValue(header);
              const isDateTimeType = ['date', 'time', 'datetime-local'].includes(inputType);
              const shouldFloat = hasValue || isFocused || isDateTimeType || inputType === 'checkbox' || (inputType === 'select' && selectMode === 'tab');
              const labelText = field.label + (field.required && !isUniqueKeyField ? ' *' : '') + (isIdKey ? ' (Key)' : '');

              return (
                <div 
                  key={header} 
                  className={`pt-3 pb-1 ${isGridLayout ? spanClass : ''}`}
                >
                  {/* Input control according to type */}
                  <div className="relative">
                    {/* Modern Floating Label */}
                    <label 
                      className={`absolute left-[11px] -translate-y-1/2 transition-all duration-200 pointer-events-none select-none z-10 ${
                        shouldFloat 
                          ? `top-0 text-[10px] font-bold bg-white px-1.5 ${isFocused ? 'text-teal-600' : 'text-slate-500'}` 
                          : inputType === 'textarea'
                            ? 'top-[18px] text-xs text-slate-400 font-medium'
                            : 'top-1/2 text-xs text-slate-400 font-medium'
                      }`}
                    >
                      {labelText}
                    </label>

                    {inputType === 'textarea' ? (
                      <textarea
                        id={`field-input-${header}`}
                        rows={3}
                        value={getFieldValue(header)}
                        onChange={(e) => handleInputChange(header, e.target.value)}
                        onFocus={() => setFocusedField(header)}
                        onBlur={() => setFocusedField(null)}
                        disabled={isUniqueKeyField}
                        placeholder=""
                        required={!isUniqueKeyField && field.required}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 rounded-md text-xs text-slate-800 transition focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                    ) : isSelect ? (
                      selectMode === 'multi' ? (
                        <MultiSelectDropdown
                          header={header}
                          options={selectOptions}
                          value={String(getFieldValue(header))}
                          onChange={(val) => handleInputChange(header, val)}
                          disabled={isUniqueKeyField}
                          onFocus={() => setFocusedField(header)}
                          onBlur={() => setFocusedField(null)}
                        />
                      ) : selectMode === 'tab' ? (
                        <div className={`flex flex-wrap gap-1.5 p-1 bg-slate-50 rounded-lg border border-slate-200 ${isUniqueKeyField ? 'opacity-60 cursor-not-allowed' : ''}`}>
                          {selectOptions.map((opt) => {
                            const currentVal = String(getFieldValue(header)).trim();
                            const isSelected = currentVal === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                disabled={isUniqueKeyField}
                                onClick={() => {
                                  if (isUniqueKeyField) return;
                                  handleInputChange(header, opt);
                                }}
                                className={`flex-1 min-w-[70px] px-3 py-1.5 rounded-md text-xs font-semibold transition text-center truncate ${
                                  isSelected
                                    ? 'bg-teal-700 text-white shadow-xs'
                                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
                                } ${isUniqueKeyField ? 'cursor-not-allowed' : ''}`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                          {selectOptions.length === 0 && (
                            <span className="text-xs text-slate-400 p-2">No options configured</span>
                          )}
                        </div>
                      ) : (
                        <SearchableSingleSelectDropdown
                          header={header}
                          options={selectOptions}
                          value={String(getFieldValue(header))}
                          onChange={(val) => handleInputChange(header, val)}
                          disabled={isUniqueKeyField}
                          onFocus={() => setFocusedField(header)}
                          onBlur={() => setFocusedField(null)}
                        />
                      )
                    ) : inputType === 'checkbox' ? (
                      <label className={`flex items-center gap-2.5 p-2 bg-white border border-slate-300 rounded-md transition ${isUniqueKeyField ? 'bg-slate-100 opacity-60 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer'}`}>
                        <input
                           type="checkbox"
                           id={`field-input-${header}`}
                           disabled={isUniqueKeyField}
                           checked={
                             String(getFieldValue(header)).toLowerCase() === 'true' ||
                             String(getFieldValue(header)).toLowerCase() === 'yes' ||
                             formData[header] === true
                           }
                           onChange={(e) => handleInputChange(header, e.target.checked ? 'Yes' : 'No')}
                           className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 disabled:cursor-not-allowed"
                        />
                        <span className="text-xs font-semibold text-slate-700">
                          {String(getFieldValue(header)).toLowerCase() === 'true' ||
                          String(getFieldValue(header)).toLowerCase() === 'yes' ||
                          formData[header] === true
                            ? 'Yes / Active'
                            : 'No / Inactive'}
                        </span>
                      </label>
                    ) : isFileField ? (
                      /* Enhanced File / Drive Upload Input Box */
                      <div className="space-y-2">
                        <div className="flex items-stretch w-full">
                          <input
                            type="url"
                            id={`field-input-${header}`}
                            value={currentValue}
                            onChange={(e) => handleInputChange(header, e.target.value)}
                            onFocus={() => setFocusedField(header)}
                            onBlur={() => setFocusedField(null)}
                            placeholder=""
                            disabled={isUploadingThis || isUniqueKeyField}
                            required={!isUniqueKeyField && field.required}
                            className="flex-1 min-w-0 pl-2.5 pr-2.5 py-1.5 bg-white border border-slate-300 focus:border-teal-500 rounded-l-md text-xs text-slate-800 transition font-mono focus:outline-none focus:ring-1 focus:ring-teal-500/20 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed border-r-0"
                          />
                          <button
                            type="button"
                            id={`upload-file-btn-${header}`}
                            onClick={() => handleTriggerUpload(header)}
                            disabled={isUploadingThis || isSubmitting || isUniqueKeyField}
                            title="Upload file to Google Drive"
                            className="px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-r-md flex items-center justify-center transition shrink-0 disabled:opacity-60 disabled:cursor-not-allowed border border-teal-600 border-l-0"
                          >
                            {isUploadingThis ? (
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                            ) : (
                              <FolderUp className="w-4 h-4 text-teal-100" />
                            )}
                          </button>
                        </div>

                        {/* Loading State Banner */}
                        {isUploadingThis && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-md text-xs text-teal-800 font-medium animate-pulse">
                            <Loader2 className="w-4 h-4 text-teal-600 animate-spin shrink-0" />
                            <span>Uploading to Google Drive... Getting preview link</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type={
                          inputType === 'date'
                            ? 'date'
                            : inputType === 'time'
                            ? 'time'
                            : inputType === 'datetime-local'
                            ? 'datetime-local'
                            : inputType === 'number'
                            ? 'number'
                            : inputType === 'email'
                            ? 'email'
                            : inputType === 'tel'
                            ? 'tel'
                            : inputType === 'url'
                            ? 'url'
                            : 'text'
                        }
                        id={`field-input-${header}`}
                        value={getFieldValue(header)}
                        onChange={(e) => handleInputChange(header, e.target.value)}
                        onFocus={() => setFocusedField(header)}
                        onBlur={() => setFocusedField(null)}
                        disabled={isUniqueKeyField}
                        placeholder=""
                        required={!isUniqueKeyField && field.required}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 focus:border-teal-500 rounded-md text-xs text-slate-800 transition focus:outline-none focus:ring-1 focus:ring-teal-500/20 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </form>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
            Uploads folder: <strong className="text-teal-700">{targetDriveFolder}</strong>
          </div>

          <div className="flex gap-2">
            <button
              id="cancel-record-modal-btn"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-record-modal-btn"
              type="submit"
              form="record-form"
              disabled={isSubmitting || !isDirty}
              className="px-4 py-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving to Sheet...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{mode === 'add' ? 'Add Record' : 'Save Changes'}</span>
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
      />
    </div>
  );
};
