import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Package,
  Search,
  Edit2,
  X,
  Check,
  Loader2,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Trash2,
} from 'lucide-react'

// CSV template content
const CSV_TEMPLATE = `kode_barang,nama_barang,tipe,stok_awal
BRG-001,Laptop Dell Latitude 5520,Elektronik,10
BRG-002,Kertas A4 70gsm,ATK,500
BRG-003,Toner Printer HP 107A,Consumable,25
BRG-004,Kabel UTP Cat6 (meter),Jaringan,200
BRG-005,Mouse Wireless Logitech,Elektronik,15`

function parseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length < 2) return { headers: [], rows: [], errors: ['File CSV kosong atau hanya berisi header'] }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const requiredHeaders = ['kode_barang', 'nama_barang']
  const missing = requiredHeaders.filter(h => !headers.includes(h))
  if (missing.length > 0) {
    return { headers: [], rows: [], errors: [`Kolom wajib tidak ditemukan: ${missing.join(', ')}`] }
  }

  const codeIdx = headers.indexOf('kode_barang')
  const nameIdx = headers.indexOf('nama_barang')
  const typeIdx = headers.indexOf('tipe')
  const stockIdx = headers.indexOf('stok_awal')

  const rows = []
  const errors = []

  for (let i = 1; i < lines.length; i++) {
    // Handle quoted values with commas inside
    const values = parseCSVLine(lines[i])
    const code = values[codeIdx]?.trim() || ''
    const name = values[nameIdx]?.trim() || ''
    const type = typeIdx >= 0 ? (values[typeIdx]?.trim() || '') : ''
    const stockRaw = stockIdx >= 0 ? (values[stockIdx]?.trim() || '0') : '0'
    const stock = parseInt(stockRaw)

    if (!code) { errors.push(`Baris ${i + 1}: Kode barang kosong`); continue }
    if (!name) { errors.push(`Baris ${i + 1}: Nama barang kosong`); continue }
    if (isNaN(stock) || stock < 0) { errors.push(`Baris ${i + 1}: Stok tidak valid "${stockRaw}"`); continue }

    rows.push({ item_code: code, name, type, stock })
  }

  return { headers, rows, errors }
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current); current = '' }
    else { current += ch }
  }
  result.push(current)
  return result
}

export default function ItemsPage({ readOnly = false }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({ item_code: '', name: '', type: '', stock: 0 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Bulk import state
  const [showImport, setShowImport] = useState(false)
  const [importData, setImportData] = useState(null)  // { rows, errors }
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null) // { success, failed, duplicates }
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchItems()
  }, [])

  async function fetchItems() {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('name', { ascending: true })
      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error('Error:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.item_code?.toLowerCase().includes(search.toLowerCase()) ||
    item.type?.toLowerCase().includes(search.toLowerCase())
  )

  function openAddForm() {
    setEditingItem(null)
    setFormData({ item_code: '', name: '', type: '', stock: 0 })
    setShowForm(true)
    setShowImport(false)
    setError('')
  }

  function openEditForm(item) {
    setEditingItem(item)
    setFormData({
      item_code: item.item_code || '',
      name: item.name,
      type: item.type || '',
      stock: item.stock,
    })
    setShowForm(true)
    setShowImport(false)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('items')
          .update({
            item_code: formData.item_code,
            name: formData.name,
            type: formData.type,
            stock: parseInt(formData.stock),
          })
          .eq('id', editingItem.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('items')
          .insert({
            item_code: formData.item_code,
            name: formData.name,
            type: formData.type,
            stock: parseInt(formData.stock),
          })
        if (error) throw error
      }
      setShowForm(false)
      fetchItems()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Bulk Import Functions ─────────────────────────

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'template_import_barang.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setImportData({ rows: [], errors: ['File harus berformat CSV (.csv)'] })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const result = parseCSV(text)

      // Check for duplicates within the file
      const codes = result.rows.map(r => r.item_code)
      const duplicatesInFile = codes.filter((c, i) => codes.indexOf(c) !== i)
      if (duplicatesInFile.length > 0) {
        result.errors.push(`Kode barang duplikat dalam file: ${[...new Set(duplicatesInFile)].join(', ')}`)
      }

      // Check against existing items
      const existingCodes = items.map(i => i.item_code?.toLowerCase())
      const duplicatesInDB = result.rows.filter(r => existingCodes.includes(r.item_code.toLowerCase()))
      if (duplicatesInDB.length > 0) {
        result.errors.push(
          `${duplicatesInDB.length} kode barang sudah ada di database: ${duplicatesInDB.map(d => d.item_code).slice(0, 5).join(', ')}${duplicatesInDB.length > 5 ? '...' : ''}`
        )
      }

      setImportData(result)
      setImportResult(null)
    }
    reader.readAsText(file)

    // Reset file input
    e.target.value = ''
  }

  function removeImportRow(index) {
    if (!importData) return
    const newRows = [...importData.rows]
    newRows.splice(index, 1)
    setImportData({ ...importData, rows: newRows })
  }

  async function executeImport() {
    if (!importData?.rows.length) return
    setImporting(true)

    const existingCodes = items.map(i => i.item_code?.toLowerCase())
    const newRows = importData.rows.filter(r => !existingCodes.includes(r.item_code.toLowerCase()))
    const duplicates = importData.rows.length - newRows.length

    let success = 0
    let failed = 0
    const failedItems = []

    // Insert in batches of 50
    for (let i = 0; i < newRows.length; i += 50) {
      const batch = newRows.slice(i, i + 50)
      const { data, error } = await supabase.from('items').insert(batch).select()
      if (error) {
        failed += batch.length
        failedItems.push(error.message)
      } else {
        success += data.length
      }
    }

    setImportResult({ success, failed, duplicates, failedItems })
    if (success > 0) {
      fetchItems()
    }
    setImporting(false)
  }

  function closeImport() {
    setShowImport(false)
    setImportData(null)
    setImportResult(null)
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{readOnly ? 'Daftar Barang' : 'Data Barang'}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{items.length} barang terdaftar</p>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => { setShowImport(true); setShowForm(false); setImportData(null); setImportResult(null) }}
              className="gap-2"
              id="bulk-import-button"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button onClick={openAddForm} className="gap-2" id="add-item-button">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Tambah</span>
            </Button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari barang..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          id="search-items"
        />
      </div>

      {/* ═══ BULK IMPORT PANEL ═══ */}
      {showImport && !readOnly && (
        <Card className="border-primary/20 shadow-lg animate-in slide-in-from-top-2 duration-300">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Bulk Import Barang
              </CardTitle>
              <CardDescription className="mt-1">
                Upload file CSV untuk menambah banyak barang sekaligus
              </CardDescription>
            </div>
            <button onClick={closeImport} className="p-1 rounded hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Step 1: Download Template */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Download Template CSV</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Kolom wajib: <code className="text-[11px] bg-muted px-1 rounded">kode_barang</code>, <code className="text-[11px] bg-muted px-1 rounded">nama_barang</code>. 
                  Opsional: <code className="text-[11px] bg-muted px-1 rounded">tipe</code>, <code className="text-[11px] bg-muted px-1 rounded">stok_awal</code>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="gap-1.5 mt-2"
                  id="download-template-button"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Template
                </Button>
              </div>
            </div>

            {/* Step 2: Upload File */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Upload File CSV</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Isi template lalu upload file CSV yang sudah dilengkapi
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,text/csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-file-input"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5 mt-2"
                  id="upload-csv-button"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Pilih File CSV
                </Button>
              </div>
            </div>

            {/* Parse Errors */}
            {importData?.errors?.length > 0 && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 space-y-1">
                <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  Peringatan ({importData.errors.length})
                </p>
                {importData.errors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive/80 ml-5.5">• {err}</p>
                ))}
              </div>
            )}

            {/* Preview Table */}
            {importData?.rows?.length > 0 && !importResult && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">3</span>
                    </span>
                    Preview Data ({importData.rows.length} barang)
                  </p>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/70">
                          <th className="text-left px-3 py-2 font-medium text-xs">#</th>
                          <th className="text-left px-3 py-2 font-medium text-xs">Kode</th>
                          <th className="text-left px-3 py-2 font-medium text-xs">Nama Barang</th>
                          <th className="text-left px-3 py-2 font-medium text-xs">Tipe</th>
                          <th className="text-right px-3 py-2 font-medium text-xs">Stok</th>
                          <th className="px-2 py-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {importData.rows.map((row, i) => {
                          const isDuplicate = items.some(
                            item => item.item_code?.toLowerCase() === row.item_code.toLowerCase()
                          )
                          return (
                            <tr
                              key={i}
                              className={`border-t ${isDuplicate ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}
                            >
                              <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
                              <td className="px-3 py-2 text-xs font-mono">
                                {row.item_code}
                                {isDuplicate && (
                                  <Badge variant="pending" className="ml-1.5 text-[9px] py-0 px-1">duplikat</Badge>
                                )}
                              </td>
                              <td className="px-3 py-2 text-xs">{row.name}</td>
                              <td className="px-3 py-2 text-xs text-muted-foreground">{row.type || '—'}</td>
                              <td className="px-3 py-2 text-xs text-right font-medium">{row.stock}</td>
                              <td className="px-2 py-2">
                                <button
                                  onClick={() => removeImportRow(i)}
                                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                  title="Hapus baris"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Import Button */}
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" onClick={closeImport} className="flex-1">
                    Batal
                  </Button>
                  <Button
                    onClick={executeImport}
                    disabled={importing}
                    className="flex-1 gap-2"
                    id="execute-import-button"
                  >
                    {importing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />Mengimport...</>
                    ) : (
                      <><Upload className="w-4 h-4" />Import {importData.rows.length} Barang</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Import Result */}
            {importResult && (
              <div className="space-y-2">
                {importResult.success > 0 && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <p className="text-sm text-emerald-600 font-medium">
                      {importResult.success} barang berhasil diimport
                    </p>
                  </div>
                )}
                {importResult.duplicates > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <p className="text-sm text-amber-600">
                      {importResult.duplicates} barang dilewati (kode sudah ada)
                    </p>
                  </div>
                )}
                {importResult.failed > 0 && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {importResult.failed} barang gagal diimport
                    </p>
                    {importResult.failedItems.map((msg, i) => (
                      <p key={i} className="text-xs text-destructive/80 mt-1 ml-6">• {msg}</p>
                    ))}
                  </div>
                )}
                <Button variant="outline" onClick={closeImport} className="w-full mt-2">
                  Tutup
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Form */}
      {showForm && !readOnly && (
        <Card className="border-primary/20 shadow-lg animate-in slide-in-from-top-2 duration-300">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">{editingItem ? 'Edit Barang' : 'Tambah Barang Baru'}</CardTitle>
            <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="item_code">Kode Barang</Label>
                  <Input
                    id="item_code"
                    placeholder="BRG-001"
                    value={formData.item_code}
                    onChange={(e) => setFormData(p => ({ ...p, item_code: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="item_type">Tipe</Label>
                  <Input
                    id="item_type"
                    placeholder="Elektronik, ATK, dll"
                    value={formData.type}
                    onChange={(e) => setFormData(p => ({ ...p, type: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item_name">Nama Barang</Label>
                <Input
                  id="item_name"
                  placeholder="Masukkan nama barang"
                  value={formData.name}
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item_stock">Stok Awal</Label>
                <Input
                  id="item_stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData(p => ({ ...p, stock: e.target.value }))}
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                  Batal
                </Button>
                <Button type="submit" disabled={saving} className="flex-1 gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editingItem ? 'Simpan' : 'Tambah'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Items List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{search ? 'Barang tidak ditemukan' : 'Belum ada barang'}</p>
          {!readOnly && !search && (
            <div className="flex gap-2 justify-center mt-3">
              <Button variant="outline" size="sm" onClick={openAddForm}>
                Tambah Manual
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setShowImport(true); setShowForm(false) }}>
                Import CSV
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-all duration-200 group">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    {item.type && <Badge variant="secondary" className="text-[10px]">{item.type}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{item.item_code || '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{item.stock}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Stok</p>
                </div>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditForm(item)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
