import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  ClipboardList,
  Package,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

export default function PencatatDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [recentLogs, setRecentLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      // Fetch counts
      const { data: logs, error } = await supabase
        .from('inventory_logs')
        .select('id, status, type, quantity, notes, created_at, items(name, item_code)')
        .eq('pencatat_id', profile?.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const total = logs?.length || 0
      const pending = logs?.filter(l => l.status === 'PENDING').length || 0
      const approved = logs?.filter(l => l.status === 'APPROVED').length || 0
      const rejected = logs?.filter(l => l.status === 'REJECTED').length || 0

      setStats({ total, pending, approved, rejected })
      setRecentLogs(logs?.slice(0, 5) || [])
    } catch (err) {
      console.error('Error fetching dashboard:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Total Catatan', value: stats.total, icon: ClipboardList, color: 'from-blue-500 to-blue-600' },
    { label: 'Menunggu', value: stats.pending, icon: Clock, color: 'from-amber-500 to-amber-600' },
    { label: 'Disetujui', value: stats.approved, icon: CheckCircle2, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Ditolak', value: stats.rejected, icon: XCircle, color: 'from-red-500 to-red-600' },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Selamat datang, <span className="font-medium text-foreground">{profile?.full_name}</span>
          </p>
        </div>
        <Button onClick={() => navigate('/pencatat/new')} className="gap-2 shadow-lg" id="new-log-button">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Catat Baru</span>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="relative overflow-hidden group hover:shadow-md transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{loading ? '—' : stat.value}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-sm`}>
                    <Icon className="w-4.5 h-4.5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Aktivitas Terbaru</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/pencatat/history')}
            className="text-xs gap-1"
          >
            Lihat Semua
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Belum ada catatan</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => navigate('/pencatat/new')}
              >
                Buat Catatan Pertama
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/pencatat/history/${log.id}`)}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    log.type === 'IN'
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                  }`}>
                    {log.type === 'IN' ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {log.items?.name || 'Barang'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.type === 'IN' ? 'Masuk' : 'Keluar'} • {log.quantity} unit
                      {log.created_at && ` • ${format(new Date(log.created_at), 'dd MMM yyyy', { locale: localeId })}`}
                    </p>
                  </div>
                  <Badge variant={log.status?.toLowerCase()}>
                    {log.status === 'PENDING' ? 'Menunggu' : log.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
