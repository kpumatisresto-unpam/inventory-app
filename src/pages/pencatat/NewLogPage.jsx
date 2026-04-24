import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import SignatureCanvas from 'react-signature-canvas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Check,
  Eraser,
  Loader2,
  PenTool,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react'

export default function NewLogPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const sigCanvas = useRef(null)

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    item_id: '',
    type: 'IN',
    quantity: '',
    notes: '',
  })

  useEffect(() => {
    fetchItems()
  }, [])

  async function fetchItems() {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('id, name, item_code, stock')
        .order('name')
      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error('Error:', err.message)
    } finally {
      setLoading(false)
    }
  }

  function clearSignature() {
    sigCanvas.current?.clear()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    // Validate signature
    if (sigCanvas.current?.isEmpty()) {
      setError('Tanda tangan wajib diisi')
      return
    }

    // Validate quantity
    const qty = parseInt(formData.quantity)
    if (!qty || qty <= 0) {
      setError('Jumlah harus lebih dari 0')
      return
    }

    // Check stock for OUT type
    if (formData.type === 'OUT') {
      const selectedItem = items.find(i => i.id === formData.item_id)
      if (selectedItem && qty > selectedItem.stock) {
        setError(`Stok tidak mencukupi (tersedia: ${selectedItem.stock})`)
        return
      }
    }

    setSubmitting(true)

    try {
      // Convert signature to blob
      const signatureDataUrl = sigCanvas.current.toDataURL('image/png')
      const blob = await fetch(signatureDataUrl).then(r => r.blob())
      const fileName = `pencatat_${profile.id}_${Date.now()}.png`

      // Upload signature to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(fileName, blob, { contentType: 'image/png' })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('signatures')
        .getPublicUrl(fileName)

      // Insert inventory log
      const { error: insertError } = await supabase
        .from('inventory_logs')
        .insert({
          item_id: formData.item_id,
          type: formData.type,
          quantity: qty,
          notes: formData.notes || null,
          status: 'PENDING',
          pencatat_id: profile.id,
          pencatat_signature_url: publicUrl,
        })

      if (insertError) throw insertError

      setSuccess(true)
      setTimeout(() => navigate('/pencatat'), 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedItem = items.find(i => i.id === formData.item_id)

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold">Berhasil Dicatat!</h2>
        <p className="text-sm text-muted-foreground mt-1">Catatan sedang menunggu approval dari Pengawas</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Catatan Baru</h1>
          <p className="text-muted-foreground text-sm">Input pergerakan barang</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-in fade-in slide-in-from-top-1 duration-300">
            {error}
          </div>
        )}

        {/* Item Selection */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="item_id">Pilih Barang *</Label>
              <Select
                id="item_id"
                value={formData.item_id}
                onChange={(e) => setFormData(p => ({ ...p, item_id: e.target.value }))}
                required
              >
                <option value="">-- Pilih Barang --</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>
                    [{item.item_code}] {item.name} (Stok: {item.stock})
                  </option>
                ))}
              </Select>
            </div>

            {/* Type Selection */}
            <div className="space-y-1.5">
              <Label>Tipe Pergerakan *</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, type: 'IN' }))}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all duration-200 ${
                    formData.type === 'IN'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'border-border hover:border-blue-300'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span className="text-sm font-medium">Barang Masuk</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, type: 'OUT' }))}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all duration-200 ${
                    formData.type === 'OUT'
                      ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                      : 'border-border hover:border-orange-300'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="text-sm font-medium">Barang Keluar</span>
                </button>
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <Label htmlFor="quantity">
                Jumlah *
                {selectedItem && (
                  <span className="text-muted-foreground font-normal ml-2">(Stok saat ini: {selectedItem.stock})</span>
                )}
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="0"
                value={formData.quantity}
                onChange={(e) => setFormData(p => ({ ...p, quantity: e.target.value }))}
                required
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Keterangan (Opsional)</Label>
              <Textarea
                id="notes"
                placeholder="Tambahkan keterangan..."
                value={formData.notes}
                onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Signature */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PenTool className="w-4 h-4" />
              Tanda Tangan Pencatat *
            </CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={clearSignature} className="gap-1 text-xs">
              <Eraser className="w-3.5 h-3.5" />
              Hapus
            </Button>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-white dark:bg-slate-950">
              <SignatureCanvas
                ref={sigCanvas}
                canvasProps={{
                  className: 'w-full h-40 touch-none',
                  style: { width: '100%', height: '160px' },
                }}
                backgroundColor="transparent"
                penColor="#1e293b"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Tanda tangan di area di atas menggunakan jari atau stylus
            </p>
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full h-12 gap-2 text-base"
          disabled={submitting}
          id="submit-log-button"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Simpan & Kirim
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
