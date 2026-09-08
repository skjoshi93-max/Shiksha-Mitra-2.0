import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, ArrowRight, ShieldCheck, Database, RefreshCw } from 'lucide-react';
import { Question, ImportMapping, ImportValidationResult } from '../types';
import { detectHeaders, autoSuggestMappings, parseAndValidateImport } from '../lib/importUtils';

interface BulkImportViewProps {
  existingQuestions: Question[];
  onImportComplete: (importedQuestions: Question[]) => void;
}

export const BulkImportView: React.FC<BulkImportViewProps> = ({ existingQuestions, onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | string | null>(null);
  const [extension, setExtension] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ImportMapping[]>([]);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || 'csv';
    setExtension(ext);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const buffer = evt.target?.result;
      if (!buffer) return;

      setFileBuffer(buffer);
      const detectedHeaders = detectHeaders(buffer, ext);
      setHeaders(detectedHeaders);
      const suggested = autoSuggestMappings(detectedHeaders);
      setMappings(suggested);
      setValidationResult(null);
    };

    if (ext === 'csv' || ext === 'txt' || ext === 'json') {
      reader.readAsText(selectedFile);
    } else {
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const handleMappingChange = (header: string, newTarget: keyof Question | 'ignore') => {
    setMappings(prev =>
      prev.map(m => (m.csvHeader === header ? { ...m, targetField: newTarget } : m))
    );
  };

  const runValidation = () => {
    if (!fileBuffer) return;
    setIsProcessing(true);

    setTimeout(() => {
      const res = parseAndValidateImport(fileBuffer, extension, mappings, existingQuestions);
      setValidationResult(res);
      setIsProcessing(false);
    }, 200);
  };

  const handleCommitImport = () => {
    if (validationResult && validationResult.questions.length > 0) {
      onImportComplete(validationResult.questions);
      setFile(null);
      setFileBuffer(null);
      setValidationResult(null);
    }
  };

  return (
    <div className="space-y-8 p-6 lg:p-8">
      {/* Header */}
      <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 p-6 sm:p-8 text-white shadow-2xl backdrop-blur-xl">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Upload className="h-6 w-6 text-indigo-400" />
          Bulk Question Bank Import
        </h2>
        <p className="mt-2 text-xs text-indigo-100/90 font-normal leading-relaxed max-w-xl">
          Upload existing CSV, XLSX, JSON, or TXT files. Automatic column detection, intelligent field mapping, quality checks, and duplicate validation.
        </p>
      </div>

      {/* File Dropzone */}
      <div className="rounded-3xl border-2 border-dashed border-slate-300/80 bg-white/80 p-8 text-center dark:border-slate-800/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm">
        <FileSpreadsheet className="mx-auto h-12 w-12 text-indigo-500" />
        <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
          {file ? file.name : 'Select or drag & drop a file to import'}
        </h3>
        <p className="mt-1 text-xs text-slate-400">Supports .csv, .xlsx, .json, .txt</p>

        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all hover:scale-[1.02]">
          <Upload className="h-4 w-4" /> Choose File
          <input type="file" accept=".csv,.xlsx,.json,.txt" onChange={handleFileDrop} className="hidden" />
        </label>
      </div>

      {/* Column Mapping Interface */}
      {headers.length > 0 && !validationResult && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Intelligent Column Mapping</h3>
            <span className="text-xs text-slate-500">{headers.length} Columns Detected</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mappings.map(m => (
              <div key={m.csvHeader} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase">File Column: "{m.csvHeader}"</span>
                <select
                  value={m.targetField}
                  onChange={(e) => handleMappingChange(m.csvHeader, e.target.value as any)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="ignore">-- Ignore Column --</option>
                  <option value="id">Question ID</option>
                  <option value="question">Question Text</option>
                  <option value="category">Category</option>
                  <option value="difficulty">Difficulty</option>
                  <option value="subject">Subject</option>
                  <option value="questionType">Question Type</option>
                  <option value="timeLimit">Time Limit (sec)</option>
                  <option value="maxScore">Max Score</option>
                  <option value="tags">Tags</option>
                  <option value="hint">Hint / Guidance</option>
                  <option value="active">Active Flag</option>
                </select>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={runValidation}
              disabled={isProcessing}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-500 transition-colors"
            >
              {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              <span>Validate Import File</span>
            </button>
          </div>
        </div>
      )}

      {/* Import Validation Report */}
      {validationResult && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 shadow-sm dark:border-indigo-900 dark:bg-indigo-950/30 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              Import Validation Summary Report
            </h3>
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
              {validationResult.validRows} Ready to Import
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-white p-3 dark:bg-slate-900">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Rows</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{validationResult.totalRows}</p>
            </div>
            <div className="rounded-xl bg-white p-3 dark:bg-slate-900">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Valid Rows</span>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{validationResult.validRows}</p>
            </div>
            <div className="rounded-xl bg-white p-3 dark:bg-slate-900">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Duplicates Flagged</span>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{validationResult.duplicateRows}</p>
            </div>
            <div className="rounded-xl bg-white p-3 dark:bg-slate-900">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Skipped / Invalid</span>
              <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{validationResult.invalidRows}</p>
            </div>
          </div>

          {validationResult.issues.length > 0 && (
            <div className="max-h-32 overflow-y-auto rounded-xl bg-white p-3 text-xs text-amber-800 dark:bg-slate-900 dark:text-amber-300 space-y-1">
              <span className="font-bold">Issues / Warnings:</span>
              {validationResult.issues.map((iss, idx) => (
                <p key={idx}>• {iss}</p>
              ))}
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleCommitImport}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500 transition-colors"
            >
              <Database className="h-4 w-4" /> Commit {validationResult.validRows} Questions to Database
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
