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
  width: number
  align?: 'left' | 'right' | 'center'
}

const COLUMNS: Column[] = [
  { key: 'id', label: 'ID', type: 'number', width: 64, align: 'right' },
  { key: 'nome', label: 'Nome', type: 'text', width: 120 },
  { key: 'cognome', label: 'Cognome', type: 'text', width: 140 },
  { key: 'email', label: 'Email', type: 'text', width: 220 },
  { key: 'citta', label: 'Città', type: 'text', width: 120 },
  { key: 'paese', label: 'Paese', type: 'text', width: 100 },
  { key: 'eta', label: 'Età', type: 'number', width: 72, align: 'right' },
  { key: 'ruolo', label: 'Ruolo', type: 'text', width: 120 },
  { key: 'stipendio', label: 'Stipendio', type: 'number', width: 120, align: 'right' },
  { key: 'dataAssunzione', label: 'Data Assunzione', type: 'date', width: 140, align: 'right' },
  { key: 'attivo', label: 'Attivo', type: 'bool', width: 90, align: 'center' },
]

const STICKY_COLS = 2 // ID + Nome sempre visibili mentre scorri orizzontalmente

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
    return <span className="text-blue-600 dark:text-blue-400">{sort.dir === 'asc' ? '▲' : '▼'}</span>
  }

  // offset cumulativo per le colonne sticky
  const stickyLeft = (idx: number): number =>
    COLUMNS.slice(0, idx).reduce((acc, c) => acc + c.width, 0)

  const alignClass = (a?: Column['align']) =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left'

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-50 p-3 dark:bg-gray-950 sm:p-6">
      <header className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold sm:text-xl">Griglia Ordinabile</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {sorted.length} record · tocca l&apos;intestazione per ordinare · scorri orizzontalmente per le altre colonne
          </p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca…"
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 sm:w-72"
        />
      </header>

      <div className="grow overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <table
          className="w-max min-w-full border-collapse text-sm"
          style={{ tableLayout: 'fixed' }}
        >
          <colgroup>
            {COLUMNS.map((c) => (
              <col key={c.key} style={{ width: c.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {COLUMNS.map((c, idx) => {
                const isSticky = idx < STICKY_COLS
                return (
                  <th
                    key={c.key}
                    scope="col"
                    className={`sticky top-0 z-20 border-b border-r border-gray-200 bg-gray-100 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 ${alignClass(c.align)} ${isSticky ? 'z-30' : ''}`}
                    style={isSticky ? { left: stickyLeft(idx) } : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className={`inline-flex w-full items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 ${
                        c.align === 'right'
                          ? 'justify-end'
                          : c.align === 'center'
                            ? 'justify-center'
                            : 'justify-start'
                      }`}
                    >
                      <span className="truncate">{c.label}</span>
                      {sortIcon(c.key)}
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, rIdx) => {
              const zebra = rIdx % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-gray-50 dark:bg-gray-900/40'
              return (
                <tr key={row.id} className={zebra}>
                  {COLUMNS.map((c, cIdx) => {
                    const isSticky = cIdx < STICKY_COLS
                    return (
                      <td
                        key={c.key}
                        className={`truncate border-b border-r border-gray-100 px-2 py-1.5 dark:border-gray-800 ${alignClass(c.align)} ${isSticky ? `sticky z-10 ${zebra}` : ''}`}
                        style={isSticky ? { left: stickyLeft(cIdx) } : undefined}
                        title={String(row[c.key])}
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
                    )
                  })}
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-4 py-10 text-center text-sm text-gray-500"
                >
                  Nessun risultato
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
