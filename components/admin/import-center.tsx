'use client';

import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import { CsvContract, csvContracts, validateHeaders } from '@/lib/imports/csv-contracts';

type ValidationState = {
  fileName: string;
  rows: number;
  headers: string[];
  missing: string[];
  extra: string[];
  isValid: boolean;
};

export function ImportCenter() {
  const [activeType, setActiveType] = useState<CsvContract['type']>('plans');
  const [validation, setValidation] = useState<ValidationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const contract = useMemo(() => csvContracts.find((item) => item.type === activeType)!, [activeType]);

  function handleFile(file: File | undefined) {
    setError(null);
    setValidation(null);
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = result.meta.fields ?? [];
        const checked = validateHeaders(headers, contract);
        setValidation({
          fileName: file.name,
          rows: result.data.length,
          headers,
          missing: checked.missing,
          extra: checked.extra,
          isValid: checked.isValid
        });
      },
      error: (parseError) => setError(parseError.message)
    });
  }

  return (
    <div>
      <div className="mb-8">
        <p className="editorial-label text-accentRed">CSV Import</p>
        <h1 className="mt-3 font-serif text-5xl">Kitchen Source of Truth</h1>
        <p className="mt-4 max-w-3xl leading-7 text-charcoal">
          Upload the canonical Cherish datasets, validate the structure, then publish to Supabase after review. Replace imports will create backups before permanent changes.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {csvContracts.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => {
              setActiveType(item.type);
              setValidation(null);
              setError(null);
            }}
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

        <div className="mt-8 border border-line bg-cream p-5">
          <p className="editorial-label text-muted">Required Headers</p>
          <p className="mt-3 font-mono text-xs leading-6 text-charcoal">{contract.requiredHeaders.join(', ')}</p>
        </div>

        {error ? <p className="mt-6 border border-accentRed/40 bg-accentRed/5 p-4 text-accentRed">{error}</p> : null}

        {validation ? (
          <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_2fr]">
            <div className="border border-line bg-cream p-6">
              <p className="editorial-label text-muted">Validation Summary</p>
              <dl className="mt-5 grid gap-3 text-sm">
                <div className="flex justify-between"><dt>File</dt><dd>{validation.fileName}</dd></div>
                <div className="flex justify-between"><dt>Rows</dt><dd>{validation.rows}</dd></div>
                <div className="flex justify-between"><dt>Status</dt><dd className={validation.isValid ? 'text-forest' : 'text-accentRed'}>{validation.isValid ? 'Ready for preview' : 'Blocked'}</dd></div>
              </dl>
            </div>
            <div className="border border-line bg-cream p-6">
              <p className="editorial-label text-muted">Header Check</p>
              {validation.missing.length > 0 ? <p className="mt-4 text-accentRed">Missing: {validation.missing.join(', ')}</p> : <p className="mt-4 text-forest">All required headers are present.</p>}
              {validation.extra.length > 0 ? <p className="mt-4 text-sm text-muted">Extra columns detected: {validation.extra.join(', ')}</p> : null}
              <button
                className="mt-6 border border-line px-6 py-3 font-mono text-xs uppercase tracking-[0.24em] text-muted"
                type="button"
                disabled
              >
                Publish step connects to Supabase mutation in Phase 2
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
