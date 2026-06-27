'use client';

import { useMemo, useState, useTransition } from 'react';
import Papa from 'papaparse';
import { publishCsvImport } from '@/app/admin/import/actions';
import { CsvContract, csvContracts, validateHeaders } from '@/lib/imports/csv-contracts';
import { normalizeRows, type CsvRow, type NormalizedRow } from '@/lib/imports/normalizers';

type ImportMode = 'append' | 'update' | 'replace';

type ValidationState = {
  fileName: string;
  rows: CsvRow[];
  headers: string[];
  missing: string[];
  extra: string[];
  isValid: boolean;
  normalizedRows: NormalizedRow[];
};

export function ImportCenter() {
  const [activeType, setActiveType] = useState<CsvContract['type']>('plans');
  const [importMode, setImportMode] = useState<ImportMode>('update');
  const [validation, setValidation] = useState<ValidationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const contract = useMemo(() => csvContracts.find((item) => item.type === activeType)!, [activeType]);

  const summary = useMemo(() => {
    if (!validation) return null;
    const errorRows = validation.normalizedRows.filter((row) => row.status === 'error').length;
    const warningRows = validation.normalizedRows.filter((row) => row.status === 'warning').length;
    const validRows = validation.normalizedRows.length - errorRows;
    return { errorRows, warningRows, validRows };
  }, [validation]);

  function resetDataset(type: CsvContract['type']) {
    setActiveType(type);
    setValidation(null);
    setError(null);
    setResult(null);
  }

  function handleFile(file: File | undefined) {
    setError(null);
    setResult(null);
    setValidation(null);
    if (!file) return;

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (parsed) => {
        const headers = parsed.meta.fields ?? [];
        const checked = validateHeaders(headers, contract);
        const rows = parsed.data;
        setValidation({
          fileName: file.name,
          rows,
          headers,
          missing: checked.missing,
          extra: checked.extra,
          isValid: checked.isValid,
          normalizedRows: checked.isValid ? normalizeRows(activeType, rows) : []
        });
      },
      error: (parseError) => setError(parseError.message)
    });
  }

  function publish() {
    if (!validation || !summary) return;
    setError(null);
    setResult(null);

    startTransition(async () => {
      const response = await publishCsvImport({
        datasetType: activeType,
        importMode,
        fileName: validation.fileName,
        headers: validation.headers,
        rows: validation.rows
      });

      if (response.ok) {
        setResult(response.message);
      } else {
        setError(response.message);
      }
    });
  }

  return (
    <div>
      <div className="mb-8">
        <p className="editorial-label text-accentRed">CSV Import</p>
        <h1 className="mt-3 font-serif text-5xl">Kitchen Source of Truth</h1>
        <p className="mt-4 max-w-3xl leading-7 text-charcoal">
          Upload the canonical Cherish datasets, validate the structure, preview rows, then publish to Supabase. Replace imports create backup snapshots before live data changes.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {csvContracts.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => resetDataset(item.type)}
            className={`border p-5 text-left transition ${activeType === item.type ? 'border-forest bg-forest text-ivory' : 'border-line bg-ivory text-forest hover:border-forest'}`}
          >
            <span className="editorial-label">{item.label}</span>
            <span className="mt-3 block text-sm leading-6 opacity-80">{item.description}</span>
          </button>
        ))}
      </div>

      <section className="mt-8 border border-line bg-ivory p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="editorial-label text-accentRed">Selected Dataset</p>
            <h2 className="mt-2 font-serif text-4xl">{contract.label}</h2>
          </div>
          <label className="cursor-pointer border border-forest bg-forest px-6 py-4 font-mono text-xs uppercase tracking-[0.24em] text-ivory transition hover:bg-olive">
            Upload CSV
            <input className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => handleFile(event.target.files?.[0])} />
          </label>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[2fr_1fr]">
          <div className="border border-line bg-cream p-5">
            <p className="editorial-label text-muted">Required Headers</p>
            <p className="mt-3 font-mono text-xs leading-6 text-charcoal">{contract.requiredHeaders.join(', ')}</p>
          </div>
          <div className="border border-line bg-cream p-5">
            <p className="editorial-label text-muted">Import Mode</p>
            <select
              value={importMode}
              onChange={(event) => setImportMode(event.target.value as ImportMode)}
              className="mt-3 w-full border border-line bg-ivory px-4 py-3 text-sm outline-none focus:border-forest"
            >
              <option value="append">Append new records</option>
              <option value="update">Update existing records</option>
              <option value="replace">Replace full dataset with backup</option>
            </select>
          </div>
        </div>

        {error ? <p className="mt-6 border border-accentRed/40 bg-accentRed/5 p-4 text-accentRed">{error}</p> : null}
        {result ? <p className="mt-6 border border-forest/30 bg-forest/5 p-4 text-forest">{result}</p> : null}

        {validation && summary ? (
          <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_2fr]">
            <div className="border border-line bg-cream p-6">
              <p className="editorial-label text-muted">Validation Summary</p>
              <dl className="mt-5 grid gap-3 text-sm">
                <div className="flex justify-between gap-4"><dt>File</dt><dd className="text-right">{validation.fileName}</dd></div>
                <div className="flex justify-between"><dt>Total rows</dt><dd>{validation.rows.length}</dd></div>
                <div className="flex justify-between"><dt>Valid rows</dt><dd>{summary.validRows}</dd></div>
                <div className="flex justify-between"><dt>Warnings</dt><dd>{summary.warningRows}</dd></div>
                <div className="flex justify-between"><dt>Errors</dt><dd>{summary.errorRows}</dd></div>
                <div className="flex justify-between"><dt>Status</dt><dd className={validation.isValid && summary.errorRows === 0 ? 'text-forest' : 'text-accentRed'}>{validation.isValid && summary.errorRows === 0 ? 'Ready to publish' : 'Blocked'}</dd></div>
              </dl>
            </div>

            <div className="border border-line bg-cream p-6">
              <p className="editorial-label text-muted">Header Check</p>
              {validation.missing.length > 0 ? <p className="mt-4 text-accentRed">Missing: {validation.missing.join(', ')}</p> : <p className="mt-4 text-forest">All required headers are present.</p>}
              {validation.extra.length > 0 ? <p className="mt-4 text-sm text-muted">Extra columns detected: {validation.extra.join(', ')}</p> : null}
              <button
                className="mt-6 border border-forest bg-forest px-6 py-3 font-mono text-xs uppercase tracking-[0.24em] text-ivory transition disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-muted"
                type="button"
                disabled={!validation.isValid || summary.errorRows > 0 || isPending}
                onClick={publish}
              >
                {isPending ? 'Publishing...' : 'Publish to Supabase'}
              </button>
            </div>
          </div>
        ) : null}

        {validation?.normalizedRows.length ? (
          <div className="mt-8 overflow-hidden border border-line bg-cream">
            <div className="border-b border-line p-5">
              <p className="editorial-label text-muted">Preview first 12 rows</p>
            </div>
            <div className="max-h-[34rem] overflow-auto">
              <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                <thead className="bg-ivory text-muted">
                  <tr>
                    <th className="border-b border-r border-line p-3">Row</th>
                    <th className="border-b border-r border-line p-3">Status</th>
                    <th className="border-b border-r border-line p-3">Message</th>
                    <th className="border-b border-line p-3">Normalized Data</th>
                  </tr>
                </thead>
                <tbody>
                  {validation.normalizedRows.slice(0, 12).map((row, index) => (
                    <tr key={index} className="border-b border-line align-top">
                      <td className="border-r border-line p-3 font-mono text-xs">{index + 1}</td>
                      <td className={`border-r border-line p-3 font-mono text-xs uppercase ${row.status === 'error' ? 'text-accentRed' : row.status === 'warning' ? 'text-muted' : 'text-forest'}`}>{row.status}</td>
                      <td className="border-r border-line p-3 text-charcoal">{row.message}</td>
                      <td className="p-3 font-mono text-xs leading-5 text-charcoal"><pre className="whitespace-pre-wrap">{JSON.stringify(row.normalized, null, 2)}</pre></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
