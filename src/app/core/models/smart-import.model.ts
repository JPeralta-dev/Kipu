export type AmountStrategy =
  | 'single_column_signed'
  | 'separate_income_expense'
  | 'amount_with_type';

export interface ColumnMapping {
  name: string;
  index: number;
  format?: string;
}

export interface DetectedStructure {
  headerRowIndex: number;
  dateColumn: ColumnMapping;
  descriptionColumn: ColumnMapping;
  amountStrategy: AmountStrategy;
  amountColumn?: ColumnMapping;
  incomeColumn?: ColumnMapping;
  expenseColumn?: ColumnMapping;
  typeColumn?: ColumnMapping;
  categoryColumn?: ColumnMapping;
  decimalSeparator?: string;
  thousandsSeparator?: string;
  currency?: string;
}

export interface PreviewRow {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  originalCategory?: string;
  suggestedCategory?: string;
}

export interface SmartAnalysisResult {
  matchConfidence: number;
  summary: {
    estimatedRows: number;
    detectedCurrency: string;
    dateRangeSample: string;
    patternDescription: string;
  };
  explanation: string[];
  detectedColumns: {
    date: string;
    description: string;
    amount: string;
    category?: string;
  };
  schemaConfig: DetectedStructure;
  previewRows: PreviewRow[];
}

export interface SmartCommitResult {
  importedCount: number;
  skippedCount: number;
  duplicateCount: number;
  totalIncome: number;
  totalExpense: number;
  duplicates: Array<{ description: string; amount: number; reason: string }>;
  transactions: Array<{
    id: string;
    description: string;
    amount: number;
    type: string;
    category: string;
    date: string;
  }>;
}

export type SmartImportStep =
  | 'idle'
  | 'analyzing'
  | 'matched'
  | 'committing'
  | 'success'
  | 'error';
