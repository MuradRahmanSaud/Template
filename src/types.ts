export interface SheetConfig {
  spreadsheetId: string;
  webAppUrl: string;
  folderPath: string;
}

export interface SheetTab {
  id: string;
  name: string;
  gid: string;
  description?: string;
  isCustom?: boolean;
  hidden?: boolean;
}

export interface SheetDataState {
  headers: string[];
  rows: Record<string, any>[];
  loading: boolean;
  error: string | null;
  lastSynced: Date | null;
}

export interface UploadResponse {
  success: boolean;
  url?: string;
  fileId?: string;
  error?: string;
  isAccessDenied?: boolean;
}

export interface SheetOperationResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ColumnTypeConfig {
  ID: string;
  GID: string;
  'Sheet Name': string;
  'Column Name': string;
  'Input Type': string;
}

export interface ColumnConfig {
  type: string;
  options?: string;
  folderPath?: string;
  showInTable?: boolean;
  showInForm?: boolean;
  showInFilter?: boolean;
  allowMissingFilter?: boolean;
  order?: number;
  isPrimary?: boolean;
  selectMode?: 'single' | 'multi' | 'tab';
  filterType?: string;
  gridSpan?: number;
  required?: boolean;
  placeholder?: string;
  label?: string;
}

export type ColumnTypeMap = Record<string, Record<string, string | ColumnConfig>>;

export const DATA_TYPE_GID = '0';

export const FILTER_TYPE_OPTIONS = [
  { value: 'auto', label: 'Auto / Default based on Input Type' },
  { value: 'text', label: 'Text Filter (Substring search)' },
  { value: 'exact', label: 'Exact Match' },
  { value: 'dropdown', label: 'Dropdown Filter (Predefined options)' },
  { value: 'multiselect', label: 'Multi-Select Filter' },
  { value: 'search', label: 'Search Filter' },
  { value: 'number', label: 'Number Filter (Exact / Value)' },
  { value: 'range', label: 'Range Filter (Min - Max numeric range)' },
  { value: 'date', label: 'Date Filter (Specific date / range)' },
  { value: 'date_preset', label: 'Date Preset (Today, This Week, This Month)' },
  { value: 'boolean', label: 'Boolean Filter (Yes / No, True / False)' },
  { value: 'status', label: 'Status Filter (Pending / Approved / Rejected)' },
  { value: 'category', label: 'Category Filter' },
  { value: 'department', label: 'Department Filter' },
  { value: 'null_empty', label: 'Null / Empty Filter (Missing data check)' },
];

export const INPUT_TYPE_OPTIONS = [
  { value: 'text', label: 'Single Line Text (text)' },
  { value: 'number', label: 'Number (number)' },
  { value: 'date', label: 'Date (date)' },
  { value: 'time', label: 'Time (time)' },
  { value: 'datetime-local', label: 'Date & Time (datetime-local)' },
  { value: 'email', label: 'Email Address (email)' },
  { value: 'tel', label: 'Phone Number (tel)' },
  { value: 'url', label: 'Web Link / URL (url)' },
  { value: 'textarea', label: 'Multi-line Text (textarea)' },
  { value: 'select', label: 'Dropdown Select (select)' },
  { value: 'file', label: 'File / Drive Upload (file)' },
  { value: 'checkbox', label: 'Checkbox / Yes-No (checkbox)' },
];

export interface FormSettings {
  title: string;
  modal_size: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  layout_type: 'grid' | 'stacked';
  columns_per_row: number;
}

export interface FormStyleField {
  id: string;
  name: string;
  label: string;
  type: string;
  visible: boolean;
  width: string;
  grid_span: number;
  position: {
    row: number;
    order: number;
  };
  required: boolean;
  placeholder: string;
  options?: string;
}

export interface FormStyleConfig {
  form_settings: FormSettings;
  fields: FormStyleField[];
}

export type FormStyleConfigsMap = Record<string, FormStyleConfig>;

