import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import SignatureCanvas from 'react-signature-canvas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle2, XCircle, Eraser, PenTool, Loader2, ArrowDownLeft, ArrowUpRight, User, Calendar, Package, Hash, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

export default function ApprovalDetailPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const sigCanvas = useRef(null)
  const [log, setLog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)
  const [editQuantity, setEditQuantity] = useState('')
  const [pengawasNotes, setPengawasNotes] = useState('')

  useEffect(() => { fetchLog() }, [id])

  async function fetchLog() {
    try {
      const { data, error } = await supabase.from('inventory_logs')
        .select('*, items(id, name, item_code, stock, type), pencatat:users!inventory_logs_pencatat_id_fkey(full_name, email), pengawas:users!inventory_logs_pengawas_id_fkey(full_name, email)')
        .eq('id', id).single()
      if (error) throw error
      setLog(data)
      setEditQuantity(data.quantity.toString())
      setPengawasNotes(data.pengawas_notes || '')
    } catch (err) { console.error('Error:', err.message) }
    finally { setLoading(false) }
  }

  async function handleAction(action) {
    setError('')
    if (action === 'APPROVED' && sigCanvas.current?.isEmpty()) { setError('Tanda tangan wajib diisi untuk menyetujui'); return }
    const qty = parseInt(editQuantity)
    if (!qty || qty <= 0) { setError('Jumlah harus lebih dari 0'); return }
    if (action === 'APPROVED' && log.type === 'OUT' && qty > log.items.stock) { setError(`Stok tidak mencukupi. Tersedia: ${log.items.stock}`); return }
    setSubmitting(true)
    try {
      let signatureUrl = null
      if (action === 'APPROVED') {
        const blob = await fetch(sigCanvas.current.toDataURL('image/png')).then(r => r.blob())
        const fileName = `pengawas_${profile.id}_${Date.now()}.png`
        const { error: upErr } = await supabase.storage.from('signatures').upload(fileName, blob, { contentType: 'image/png' })
        if (upErr) throw upErr
        signatureUrl = supabase.storage.from('signatures').getPublicUrl(fileName).data.publicUrl
      }
      const updateData = { status: action, quantity: qty, pengawas_id: profile.id, pengawas_notes: pengawasNotes || null, approved_at: action === 'APPROVED' ? new Date().toISOString() : null }
      if (signatureUrl) updateData.pengawas_signature_url = signatureUrl
      const { error: updErr } = await supabase.from('inventory_logs').update(updateData).eq('id', id)
      if (updErr) throw updErr
      if (action === 'APPROVED') {
        const stockChange = log.type === 'IN' ? qty : -qty
        const { error: sErr } = await supabase.from('items').update({ stock: log.items.stock + stockChange }).eq('id', log.item_id)
        if (sErr) throw sErr
      }
      setSuccess(action)
      setTimeout(() => navigate('/pengawas/approval'), 1500)
    } catch (err) { setError(err.message) }
    finally { setSubmitting(false) }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  if (success) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-500">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${success === 'APPROVED' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
        {success === 'APPROVED' ? <CheckCircle2 className="w-8 h-8 text-emerald-600" /> : <XCircle className="w-8 h-8 text-red-600" />}
      </div>
      <h2 className="text-xl font-bold">{success === 'APPROVED' ? 'Catatan Disetujui!' : 'Catatan Ditolak'}</h2>
      <p className="text-sm text-muted-foreground mt-1">{success === 'APPROVED' ? 'Stok barang telah terupdate' : 'Stok barang tidak berubah'}</p>
    </div>
  )
  if (!log) return <div className="text-center py-12 text-muted-foreground"><p>Catatan tidak ditemukan</p><Button variant="outline" size="sm" className="mt-3" onClick={() => navigate(-1)}>Kembali</Button></div>

  const isPending = log.status === 'PENDING'
  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3"><Icon className="w-4 h-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value}</p></div></div>
  )

  return (
    <div className="space-y-4 animate-in fade-in duration-500 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1"><h1 className="text-xl font-bold">Detail Catatan</h1><p className="text-muted-foreground text-sm">Review & Approval</p></div>
        <Badge variant={log.status?.toLowerCase()} className="text-sm">{log.status === 'PENDING' ? 'Menunggu' : log.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}</Badge>
      </div>
      {error && <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Informasi Catatan</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <InfoRow icon={Package} label="Barang" value={`[${log.items?.item_code}] ${log.items?.name}`} />
          <InfoRow icon={log.type === 'IN' ? ArrowDownLeft : ArrowUpRight} label="Tipe" value={log.type === 'IN' ? 'Barang Masuk' : 'Barang Keluar'} />
          <InfoRow icon={Hash} label="Stok Saat Ini" value={`${log.items?.stock} unit`} />
          <InfoRow icon={User} label="Pencatat" value={log.pencatat?.full_name} />
          <InfoRow icon={Calendar} label="Tanggal" value={format(new Date(log.created_at), 'dd MMMM yyyy, HH:mm', { locale: localeId })} />
          {log.notes && <InfoRow icon={FileText} label="Keterangan" value={log.notes} />}
          {log.pencatat_signature_url && (
            <div className="pt-2"><p className="text-xs text-muted-foreground mb-2">TTD Pencatat</p>
              <div className="border rounded-lg p-2 bg-white dark:bg-slate-950"><img src={log.pencatat_signature_url} alt="TTD Pencatat" className="max-h-24 mx-auto" /></div>
            </div>
          )}
        </CardContent>
      </Card>
      {isPending && (<>
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Koreksi (Opsional)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="edit-quantity">Jumlah</Label><Input id="edit-quantity" type="number" min="1" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="pengawas-notes">Catatan Pengawas</Label><Textarea id="pengawas-notes" placeholder="Tambahkan catatan koreksi..." value={pengawasNotes} onChange={(e) => setPengawasNotes(e.target.value)} rows={2} /></div>
          </CardContent>
        </Card>
        <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-base flex items-center gap-2"><PenTool className="w-4 h-4" />TTD Pengawas</CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={() => sigCanvas.current?.clear()} className="gap-1 text-xs"><Eraser className="w-3.5 h-3.5" />Hapus</Button></CardHeader>
          <CardContent><div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-white dark:bg-slate-950">
              <SignatureCanvas ref={sigCanvas} canvasProps={{ className: 'w-full h-40 touch-none', style: { width: '100%', height: '160px' } }} backgroundColor="transparent" penColor="#1e293b" />
            </div><p className="text-xs text-muted-foreground mt-2 text-center">TTD diperlukan untuk menyetujui</p></CardContent>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="destructive" className="h-12 gap-2" onClick={() => handleAction('REJECTED')} disabled={submitting} id="reject-button">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}Tolak</Button>
          <Button variant="success" className="h-12 gap-2" onClick={() => handleAction('APPROVED')} disabled={submitting} id="approve-button">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}Setujui</Button>
        </div>
      </>)}
      {!isPending && log.pengawas && (
        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Informasi Approval</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow icon={User} label="Pengawas" value={log.pengawas.full_name} />
            {log.pengawas_notes && <InfoRow icon={FileText} label="Catatan Pengawas" value={log.pengawas_notes} />}
            {log.pengawas_signature_url && (
              <div className="pt-2"><p className="text-xs text-muted-foreground mb-2">TTD Pengawas</p>
                <div className="border rounded-lg p-2 bg-white dark:bg-slate-950"><img src={log.pengawas_signature_url} alt="TTD Pengawas" className="max-h-24 mx-auto" /></div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
