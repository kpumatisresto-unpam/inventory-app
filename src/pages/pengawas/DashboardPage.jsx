import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  FileText,
  Users,
} from 'lucide-react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

export default function PengawasDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalItems: 0,
    pendingLogs: 0,
    approvedToday: 0,
    totalLogs: 0,
  })
  const [pendingLogs, setPendingLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      // Fetch items count
      const { count: itemCount } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })

      // Fetch all logs
      const { data: logs, error } = await supabase
        .from('inventory_logs')
        .select('id, status, type, quantity, notes, created_at, items(name, item_code), pencatat:users!inventory_logs_pencatat_id_fkey(full_name)')
        .order('created_at', { ascending: false })

      if (error) throw error

      const today = new Date().toDateString()
      const pending = logs?.filter(l => l.status === 'PENDING') || []
      const approvedToday = logs?.filter(
        l => l.status === 'APPROVED' && new Date(l.created_at).toDateString() === today
      ).length || 0

      setStats({
        totalItems: itemCount || 0,
        pendingLogs: pending.length,
        approvedToday,
        totalLogs: logs?.length || 0,
      })
      setPendingLogs(pending.slice(0, 5))
    } catch (err) {
      console.error('Error fetching dashboard:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Total Barang', value: stats.totalItems, icon: Package, color: 'from-violet-500 to-violet-600' },
    { label: 'Perlu Approval', value: stats.pendingLogs, icon: Clock, color: 'from-amber-500 to-amber-600', highlight: stats.pendingLogs > 0 },
    { label: 'Disetujui Hari Ini', value: stats.approvedToday, icon: CheckCircle2, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Total Catatan', value: stats.totalLogs, icon: ClipboardList, color: 'from-blue-500 to-blue-600' },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Pengawas</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Selamat datang, <span className="font-medium text-foreground">{profile?.full_name}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/pengawas/reports')}
            className="gap-2"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Laporan</span>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.label}
              className={`relative overflow-hidden group hover:shadow-md transition-all duration-300 ${
                stat.highlight ? 'ring-2 ring-amber-500/30 shadow-amber-500/10' : ''
              }`}
            >
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
              {stat.highlight && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-amber-400" />
              )}
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Button
          variant="outline"
          className="h-auto py-4 flex-col gap-2 hover:border-primary/30 hover:bg-primary/5"
          onClick={() => navigate('/pengawas/items')}
        >
          <Package className="w-5 h-5 text-primary" />
          <span className="text-xs font-medium">Kelola Barang</span>
        </Button>
        <Button
          variant="outline"
          className={`h-auto py-4 flex-col gap-2 ${
            stats.pendingLogs > 0
              ? 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10'
              : 'hover:border-primary/30 hover:bg-primary/5'
          }`}
          onClick={() => navigate('/pengawas/approval')}
        >
          <Clock className="w-5 h-5 text-amber-500" />
          <span className="text-xs font-medium">
            Approval {stats.pendingLogs > 0 && `(${stats.pendingLogs})`}
          </span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex-col gap-2 hover:border-primary/30 hover:bg-primary/5 col-span-2 lg:col-span-1"
          onClick={() => navigate('/pengawas/reports')}
        >
          <FileText className="w-5 h-5 text-primary" />
          <span className="text-xs font-medium">Buat Laporan</span>
        </Button>
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Menunggu Approval
            {stats.pendingLogs > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-amber-500 text-white rounded-full">
                {stats.pendingLogs}
              </span>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/pengawas/approval')}
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
          ) : pendingLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Semua catatan sudah diproses</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/pengawas/approval/${log.id}`)}
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
                      oleh {log.pencatat?.full_name || '—'} • {log.quantity} unit
                      {log.created_at && ` • ${format(new Date(log.created_at), 'dd MMM', { locale: localeId })}`}
                    </p>
                  </div>
                  <Badge variant="pending">Menunggu</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
