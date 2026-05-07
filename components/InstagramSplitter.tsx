'use client'

import {
  ChangeEvent,
  DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

type Tile = {
  index: number
  row: number
  col: number
  dataUrl: string
  width: number
  height: number
}

type Format = 'auto' | 'square' | 'portrait'

const FORMAT_OPTIONS: { value: Format; label: string; hint: string }[] = [
  { value: 'auto', label: 'Originale', hint: 'Mantiene il ritaglio del pannello' },
  { value: 'square', label: '1:1 (quadrato)', hint: 'Riempie con sfondo per Instagram feed' },
  { value: 'portrait', label: '4:5 (verticale)', hint: 'Formato consigliato per il feed' },
]

function aspectFor(format: Format): { w: number; h: number } | null {
  if (format === 'square') return { w: 1, h: 1 }
  if (format === 'portrait') return { w: 4, h: 5 }
  return null
}

function readImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('decode-error'))
    }
    img.src = url
  })
}

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function sanitizeBaseName(name: string): string {
  const stripped = name.replace(/\.[^.]+$/, '').trim()
  const cleaned = stripped.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '')
  return cleaned || 'instagram-post'
}

export default function InstagramSplitter() {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [imageName, setImageName] = useState<string>('')
  const [rows, setRows] = useState(2)
  const [cols, setCols] = useState(5)
  const [format, setFormat] = useState<Format>('auto')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [tiles, setTiles] = useState<Tile[]>([])
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const total = rows * cols

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Seleziona un file immagine valido (PNG, JPG, WebP).')
      return
    }
    setError(null)
    setImageName(sanitizeBaseName(file.name))
    readImage(file)
      .then((img) => setImage(img))
      .catch(() => setError("Impossibile leggere l'immagine."))
  }, [])

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const generate = useCallback(async () => {
    if (!image) return
    setBusy(true)
    try {
      const target = aspectFor(format)
      const out: Tile[] = []
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const sx = Math.round((c * image.naturalWidth) / cols)
          const sy = Math.round((r * image.naturalHeight) / rows)
          const sxNext = Math.round(((c + 1) * image.naturalWidth) / cols)
          const syNext = Math.round(((r + 1) * image.naturalHeight) / rows)
          const sw = sxNext - sx
          const sh = syNext - sy

          let outW = sw
          let outH = sh
          if (target) {
            const tileRatio = sw / sh
            const targetRatio = target.w / target.h
            if (tileRatio > targetRatio) {
              outW = sw
              outH = Math.round(sw / targetRatio)
            } else {
              outH = sh
              outW = Math.round(sh * targetRatio)
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = outW
          canvas.height = outH
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('canvas-unavailable')
          ctx.fillStyle = bgColor
          ctx.fillRect(0, 0, outW, outH)
          const dx = Math.round((outW - sw) / 2)
          const dy = Math.round((outH - sh) / 2)
          ctx.drawImage(image, sx, sy, sw, sh, dx, dy, sw, sh)
          out.push({
            index: r * cols + c + 1,
            row: r,
            col: c,
            dataUrl: canvas.toDataURL('image/png'),
            width: outW,
            height: outH,
          })
        }
      }
      setTiles(out)
    } catch {
      setError('Errore durante la generazione delle immagini.')
    } finally {
      setBusy(false)
    }
  }, [image, rows, cols, format, bgColor])

  useEffect(() => {
    if (image) {
      generate()
    } else {
      setTiles([])
    }
  }, [image, generate])

  const downloadOne = (tile: Tile) => {
    const num = String(tile.index).padStart(2, '0')
    triggerDownload(tile.dataUrl, `${imageName}-${num}.png`)
  }

  const downloadAll = async () => {
    for (const tile of tiles) {
      downloadOne(tile)
      await new Promise((r) => setTimeout(r, 250))
    }
  }

  const reset = () => {
    setImage(null)
    setImageName('')
    setTiles([])
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-50 p-4 dark:bg-gray-950 sm:p-8">
      <header className="mb-6 max-w-5xl">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50 sm:text-3xl">
          Instagram Splitter
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Carica un&apos;immagine: la divido in {total} riquadri pronti per un carosello Instagram
          (ordine: sinistra→destra, alto→basso).
        </p>
      </header>

      {!image && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex max-w-5xl flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white p-10 text-center transition-colors dark:bg-gray-900 ${
            dragOver
              ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/20'
              : 'border-gray-300 dark:border-gray-700'
          }`}
        >
          <p className="mb-3 text-base font-medium text-gray-700 dark:text-gray-200">
            Trascina qui l&apos;immagine
          </p>
          <p className="mb-5 text-xs text-gray-500 dark:text-gray-400">oppure</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-full bg-pink-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-pink-700"
          >
            Scegli file
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={onInputChange}
            className="hidden"
          />
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </div>
      )}

      {image && (
        <div className="grid max-w-7xl gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Immagine
              </div>
              <div className="mt-1 truncate text-sm text-gray-800 dark:text-gray-100">
                {imageName}
              </div>
              <div className="text-xs text-gray-500">
                {image.naturalWidth} × {image.naturalHeight}px
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Griglia
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="block text-xs text-gray-600 dark:text-gray-300">
                  Righe
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={rows}
                    onChange={(e) =>
                      setRows(Math.max(1, Math.min(10, Number(e.target.value) || 1)))
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                  />
                </label>
                <label className="block text-xs text-gray-600 dark:text-gray-300">
                  Colonne
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={cols}
                    onChange={(e) =>
                      setCols(Math.max(1, Math.min(10, Number(e.target.value) || 1)))
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                  />
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">{total} pannelli totali</p>
            </div>

            <div>
              <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Formato di output
              </span>
              <div className="mt-2 space-y-1.5">
                {FORMAT_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <input
                      type="radio"
                      name="format"
                      value={opt.value}
                      checked={format === opt.value}
                      onChange={() => setFormat(opt.value)}
                      className="mt-0.5 accent-pink-600"
                    />
                    <span>
                      <span className="block text-sm text-gray-800 dark:text-gray-100">
                        {opt.label}
                      </span>
                      <span className="block text-xs text-gray-500">{opt.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {format !== 'auto' && (
              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Sfondo padding
                </span>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="mt-2 h-9 w-full cursor-pointer rounded-md border border-gray-300 bg-white dark:border-gray-700"
                />
              </label>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={busy || tiles.length === 0}
                onClick={downloadAll}
                className="w-full rounded-full bg-pink-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-pink-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Scarica tutti ({tiles.length})
              </button>
              <button
                type="button"
                onClick={reset}
                className="w-full rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Cambia immagine
              </button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </aside>

          <section>
            {busy && tiles.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-gray-500">
                Generazione in corso…
              </div>
            ) : (
              <ul
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(cols, 5)}, minmax(0, 1fr))`,
                }}
              >
                {tiles.map((tile) => (
                  <li
                    key={tile.index}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="relative bg-gray-100 dark:bg-gray-950">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={tile.dataUrl}
                        alt={`Pannello ${tile.index}`}
                        className="block h-auto w-full"
                      />
                      <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">
                        {String(tile.index).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="text-xs text-gray-500">
                        {tile.width}×{tile.height}
                      </span>
                      <button
                        type="button"
                        onClick={() => downloadOne(tile)}
                        className="rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
                      >
                        Scarica
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
