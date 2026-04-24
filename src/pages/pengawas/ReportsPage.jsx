import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileText, Download, Loader2, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

export default function ReportsPage() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)

  async function generateReport() {
    setError('')
    if (!startDate || !endDate) { setError('Pilih rentang tanggal'); return }
    if (new Date(startDate) > new Date(endDate)) { setError('Tanggal awal harus sebelum tanggal akhir'); return }
    setGenerating(true)
    try {
      const { data: logs, error: fetchErr } = await supabase.from('inventory_logs')
        .select('*, items(name, item_code), pencatat:users!inventory_logs_pencatat_id_fkey(full_name), pengawas:users!inventory_logs_pengawas_id_fkey(full_name)')
        .eq('status', 'APPROVED')
        .gte('created_at', new Date(startDate).toISOString())
        .lte('created_at', new Date(endDate + 'T23:59:59').toISOString())
        .order('created_at', { ascending: true })
      if (fetchErr) throw fetchErr
      if (!logs?.length) { setError('Tidak ada data approved pada rentang tanggal ini'); setGenerating(false); return }
      setPreview(logs)

      const doc = new jsPDF()
      // Header
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('LAPORAN INVENTARIS GUDANG', 105, 20, { align: 'center' })
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Periode: ${format(new Date(startDate), 'dd MMM yyyy', { locale: localeId })} - ${format(new Date(endDate), 'dd MMM yyyy', { locale: localeId })}`, 105, 28, { align: 'center' })
      doc.text(`Tanggal Cetak: ${format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: localeId })}`, 105, 34, { align: 'center' })
      doc.setLineWidth(0.5)
      doc.line(14, 38, 196, 38)

      // Table
      const tableData = logs.map((log, idx) => [
        idx + 1,
        format(new Date(log.created_at), 'dd/MM/yyyy'),
        `[${log.items?.item_code}] ${log.items?.name}`,
        log.type === 'IN' ? 'Masuk' : 'Keluar',
        log.quantity,
        log.pencatat?.full_name || '-',
        log.pengawas?.full_name || '-',
      ])

      doc.autoTable({
        startY: 42,
        head: [['No', 'Tanggal', 'Barang', 'Tipe', 'Qty', 'Pencatat', 'Pengawas']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], fontSize: 8, halign: 'center' },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'center', cellWidth: 22 },
          3: { halign: 'center', cellWidth: 16 },
          4: { halign: 'center', cellWidth: 12 },
        },
        margin: { left: 14, right: 14 },
      })

      // Summary
      const finalY = doc.lastAutoTable.finalY + 10
      const totalIn = logs.filter(l => l.type === 'IN').reduce((s, l) => s + l.quantity, 0)
      const totalOut = logs.filter(l => l.type === 'OUT').reduce((s, l) => s + l.quantity, 0)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Ringkasan:', 14, finalY)
      doc.setFont('helvetica', 'normal')
      doc.text(`Total Barang Masuk: ${totalIn} unit`, 14, finalY + 6)
      doc.text(`Total Barang Keluar: ${totalOut} unit`, 14, finalY + 12)
      doc.text(`Jumlah Transaksi: ${logs.length}`, 14, finalY + 18)

      // Signatures section
      const sigY = finalY + 30
      // Try to load signature images
      for (let i = 0; i < Math.min(logs.length, 3); i++) {
        const log = logs[i]
        try {
          if (log.pencatat_signature_url) {
            const img = await loadImage(log.pencatat_signature_url)
            if (img && i === 0) {
              doc.setFontSize(8)
              doc.text('Contoh TTD Pencatat:', 14, sigY)
              doc.addImage(img, 'PNG', 14, sigY + 2, 40, 20)
            }
          }
          if (log.pengawas_signature_url) {
            const img = await loadImage(log.pengawas_signature_url)
            if (img && i === 0) {
              doc.text('Contoh TTD Pengawas:', 70, sigY)
              doc.addImage(img, 'PNG', 70, sigY + 2, 40, 20)
            }
          }
        } catch (e) { /* skip signature if failed */ }
      }

      doc.save(`Laporan_Inventaris_${startDate}_${endDate}.pdf`)
    } catch (err) { setError(err.message) }
    finally { setGenerating(false) }
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Laporan</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Generate laporan PDF inventaris</p>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4" />Pilih Periode</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {error && <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="start-date">Dari</Label><Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="end-date">Sampai</Label><Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          </div>
          <Button className="w-full h-11 gap-2" onClick={generateReport} disabled={generating} id="generate-report-button">
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Download className="w-4 h-4" />Generate & Download PDF</>}
          </Button>
        </CardContent>
      </Card>
      {preview && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Preview ({preview.length} transaksi)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <p>Barang Masuk: <strong>{preview.filter(l => l.type === 'IN').reduce((s, l) => s + l.quantity, 0)}</strong> unit</p>
              <p>Barang Keluar: <strong>{preview.filter(l => l.type === 'OUT').reduce((s, l) => s + l.quantity, 0)}</strong> unit</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      canvas.getContext('2d').drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}
