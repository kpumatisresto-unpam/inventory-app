import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
} from 'lucide-react'

export default function ItemsPage({ readOnly = false }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({ item_code: '', name: '', type: '', stock: 0 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{readOnly ? 'Daftar Barang' : 'Data Barang'}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{items.length} barang terdaftar</p>
        </div>
        {!readOnly && (
          <Button onClick={openAddForm} className="gap-2" id="add-item-button">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tambah</span>
          </Button>
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
            <Button variant="outline" size="sm" className="mt-3" onClick={openAddForm}>
              Tambah Barang Pertama
            </Button>
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
