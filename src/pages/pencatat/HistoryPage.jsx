import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import {
  ClipboardList,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
} from 'lucide-react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

export default function HistoryPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    try {
      const { data, error } = await supabase
        .from('inventory_logs')
        .select('id, status, type, quantity, notes, created_at, approved_at, items(name, item_code), pengawas:users!inventory_logs_pengawas_id_fkey(full_name)')
        .eq('pencatat_id', profile?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error('Error:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = statusFilter === 'ALL'
    ? logs
    : logs.filter(l => l.status === statusFilter)

  const statusLabel = {
    PENDING: 'Menunggu',
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Riwayat Catatan</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{filteredLogs.length} catatan</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-40"
          id="status-filter"
        >
          <option value="ALL">Semua Status</option>
          <option value="PENDING">Menunggu</option>
          <option value="APPROVED">Disetujui</option>
          <option value="REJECTED">Ditolak</option>
        </Select>
      </div>

      {/* Logs List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Belum ada catatan</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => (
            <Card key={log.id} className="hover:shadow-md transition-all duration-200 cursor-pointer" onClick={() => navigate(`/pencatat/history/${log.id}`)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  log.type === 'IN'
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                }`}>
                  {log.type === 'IN' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{log.items?.name || 'Barang'}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.type === 'IN' ? 'Masuk' : 'Keluar'} • {log.quantity} unit • {format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
                  </p>
                  {log.pengawas && log.status === 'APPROVED' && (
                    <p className="text-xs text-muted-foreground">Disetujui oleh: {log.pengawas.full_name}</p>
                  )}
                </div>
                <Badge variant={log.status?.toLowerCase()}>
                  {statusLabel[log.status] || log.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
