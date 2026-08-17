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
  order?: number;
  isPrimary?: boolean;
  selectMode?: 'single' | 'multi' | 'tab';
}

export type ColumnTypeMap = Record<string, Record<string, string | ColumnConfig>>;

export const DATA_TYPE_GID = '0';

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
