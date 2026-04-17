'use client'

import { useMemo, useState } from 'react'

type Row = {
  id: number
  nome: string
  cognome: string
  email: string
  citta: string
  paese: string
  eta: number
  ruolo: string
  stipendio: number
  dataAssunzione: string
  attivo: boolean
}

type Column = {
  key: keyof Row
  label: string
  type: 'text' | 'number' | 'date' | 'bool'
  // 'high' = sempre visibile anche in portrait mobile
  // 'low'  = visibile solo in landscape mobile (tablet/desktop sempre)
  priority: 'high' | 'low'
}

const COLUMNS: Column[] = [
  { key: 'id', label: 'ID', type: 'number', priority: 'high' },
  { key: 'nome', label: 'Nome', type: 'text', priority: 'high' },
  { key: 'cognome', label: 'Cognome', type: 'text', priority: 'high' },
  { key: 'email', label: 'Email', type: 'text', priority: 'low' },
  { key: 'citta', label: 'Città', type: 'text', priority: 'high' },
  { key: 'paese', label: 'Paese', type: 'text', priority: 'low' },
  { key: 'eta', label: 'Età', type: 'number', priority: 'low' },
  { key: 'ruolo', label: 'Ruolo', type: 'text', priority: 'high' },
  { key: 'stipendio', label: 'Stipendio', type: 'number', priority: 'high' },
  { key: 'dataAssunzione', label: 'Data Assunzione', type: 'date', priority: 'low' },
  { key: 'attivo', label: 'Attivo', type: 'bool', priority: 'high' },
]

const DATA: Row[] = [
  { id: 1, nome: 'Marco', cognome: 'Rossi', email: 'marco.rossi@example.com', citta: 'Milano', paese: 'Italia', eta: 34, ruolo: 'Developer', stipendio: 42000, dataAssunzione: '2019-03-12', attivo: true },
  { id: 2, nome: 'Laura', cognome: 'Bianchi', email: 'laura.bianchi@example.com', citta: 'Roma', paese: 'Italia', eta: 29, ruolo: 'Designer', stipendio: 38000, dataAssunzione: '2020-07-01', attivo: true },
  { id: 3, nome: 'Giulia', cognome: 'Verdi', email: 'giulia.verdi@example.com', citta: 'Torino', paese: 'Italia', eta: 41, ruolo: 'Manager', stipendio: 55000, dataAssunzione: '2015-11-20', attivo: false },
  { id: 4, nome: 'Alessandro', cognome: 'Neri', email: 'a.neri@example.com', citta: 'Napoli', paese: 'Italia', eta: 38, ruolo: 'Developer', stipendio: 46000, dataAssunzione: '2018-05-09', attivo: true },
  { id: 5, nome: 'Sofia', cognome: 'Russo', email: 'sofia.russo@example.com', citta: 'Firenze', paese: 'Italia', eta: 26, ruolo: 'QA', stipendio: 31000, dataAssunzione: '2022-02-15', attivo: true },
  { id: 6, nome: 'Andrea', cognome: 'Ferrari', email: 'andrea.ferrari@example.com', citta: 'Bologna', paese: 'Italia', eta: 45, ruolo: 'Architect', stipendio: 68000, dataAssunzione: '2010-09-03', attivo: true },
  { id: 7, nome: 'Chiara', cognome: 'Romano', email: 'chiara.romano@example.com', citta: 'Genova', paese: 'Italia', eta: 31, ruolo: 'Developer', stipendio: 40000, dataAssunzione: '2021-01-11', attivo: false },
  { id: 8, nome: 'Luca', cognome: 'Greco', email: 'luca.greco@example.com', citta: 'Palermo', paese: 'Italia', eta: 36, ruolo: 'DevOps', stipendio: 50000, dataAssunzione: '2017-06-22', attivo: true },
  { id: 9, nome: 'Martina', cognome: 'Conti', email: 'martina.conti@example.com', citta: 'Venezia', paese: 'Italia', eta: 28, ruolo: 'Designer', stipendio: 36000, dataAssunzione: '2021-10-04', attivo: true },
  { id: 10, nome: 'Francesco', cognome: 'Marino', email: 'f.marino@example.com', citta: 'Bari', paese: 'Italia', eta: 52, ruolo: 'CTO', stipendio: 92000, dataAssunzione: '2008-04-17', attivo: true },
  { id: 11, nome: 'Elena', cognome: 'Costa', email: 'elena.costa@example.com', citta: 'Verona', paese: 'Italia', eta: 33, ruolo: 'PM', stipendio: 48000, dataAssunzione: '2016-12-30', attivo: false },
  { id: 12, nome: 'Davide', cognome: 'Ricci', email: 'davide.ricci@example.com', citta: 'Catania', paese: 'Italia', eta: 40, ruolo: 'Developer', stipendio: 47000, dataAssunzione: '2014-08-19', attivo: true },
]

type SortState = { key: keyof Row; dir: 'asc' | 'desc' } | null

function compare(a: Row, b: Row, key: keyof Row): number {
  const va = a[key]
  const vb = b[key]
  if (typeof va === 'number' && typeof vb === 'number') return va - vb
  if (typeof va === 'boolean' && typeof vb === 'boolean') return Number(va) - Number(vb)
  return String(va).localeCompare(String(vb), 'it', { numeric: true })
}

function formatValue(row: Row, key: keyof Row, type: string): string {
  const v = row[key]
  if (type === 'number' && key === 'stipendio') {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v as number)
  }
  if (type === 'date') {
    return new Intl.DateTimeFormat('it-IT').format(new Date(v as string))
  }
  if (type === 'bool') return v ? 'Sì' : 'No'
  return String(v)
}

export default function SortableGrid() {
  const [sort, setSort] = useState<SortState>({ key: 'id', dir: 'asc' })
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return DATA
    return DATA.filter((r) =>
      COLUMNS.some((c) => String(r[c.key]).toLowerCase().includes(q)),
    )
  }, [query])

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const copy = [...filtered]
    copy.sort((a, b) => {
      const r = compare(a, b, sort.key)
      return sort.dir === 'asc' ? r : -r
    })
    return copy
  }, [filtered, sort])

  const toggleSort = (key: keyof Row) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
  }

  const sortIcon = (key: keyof Row) => {
    if (!sort || sort.key !== key) return <span className="text-gray-400">↕</span>
    return <span>{sort.dir === 'asc' ? '▲' : '▼'}</span>
  }

  return (
    <div className="w-full px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">Griglia Ordinabile</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {sorted.length} record · clicca sull&apos;intestazione per ordinare
            </p>
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca…"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 sm:w-72"
          />
        </header>

        {/* Tablet landscape & desktop: tabella scrollabile orizzontalmente */}
        <div className="hidden rounded-lg border border-gray-200 shadow-sm dark:border-gray-800 lg:block">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  {COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      className="sticky top-0 whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 lg:px-4 lg:py-3"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {c.label}
                        {sortIcon(c.key)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
                {sorted.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={
                      idx % 2 === 0
                        ? 'bg-white dark:bg-gray-950'
                        : 'bg-gray-50/60 dark:bg-gray-900/40'
                    }
                  >
                    {COLUMNS.map((c) => (
                      <td
                        key={c.key}
                        className="whitespace-nowrap px-3 py-2 text-sm text-gray-800 dark:text-gray-200 lg:px-4 lg:py-3"
                      >
                        {c.type === 'bool' ? (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              row[c.key]
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            }`}
                          >
                            {formatValue(row, c.key, c.type)}
                          </span>
                        ) : (
                          formatValue(row, c.key, c.type)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td
                      colSpan={COLUMNS.length}
                      className="px-4 py-8 text-center text-sm text-gray-500"
                    >
                      Nessun risultato
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile (portrait + landscape) e tablet portrait: selettore di ordinamento + card */}
        <div className="lg:hidden">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="text-xs text-gray-500" htmlFor="sort-key">
              Ordina per
            </label>
            <select
              id="sort-key"
              value={sort?.key ?? ''}
              onChange={(e) =>
                setSort(
                  e.target.value
                    ? { key: e.target.value as keyof Row, dir: sort?.dir ?? 'asc' }
                    : null,
                )
              }
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="">—</option>
              {COLUMNS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!sort}
              onClick={() =>
                sort && setSort({ key: sort.key, dir: sort.dir === 'asc' ? 'desc' : 'asc' })
              }
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
            >
              {sort?.dir === 'desc' ? '▼ Desc' : '▲ Asc'}
            </button>
          </div>

          <ul className="space-y-3">
            {sorted.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-950"
              >
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-sm font-semibold">
                    #{row.id} · {row.nome} {row.cognome}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.attivo
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                    }`}
                  >
                    {row.attivo ? 'Attivo' : 'Inattivo'}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs landscape:grid-cols-4 sm:grid-cols-3 sm:landscape:grid-cols-4 md:grid-cols-4">
                  {COLUMNS.filter((c) => !['id', 'nome', 'cognome', 'attivo'].includes(c.key as string)).map((c) => (
                    <div
                      key={c.key}
                      className={`min-w-0 ${c.priority === 'low' ? 'hidden landscape:block sm:block' : ''}`}
                    >
                      <dt className="truncate text-gray-500">{c.label}</dt>
                      <dd className="truncate text-gray-900 dark:text-gray-100">
                        {formatValue(row, c.key, c.type)}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-[11px] text-gray-400 landscape:hidden sm:hidden">
                  Ruota il telefono per vedere tutti i campi
                </p>
              </li>
            ))}
            {sorted.length === 0 && (
              <li className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
                Nessun risultato
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
