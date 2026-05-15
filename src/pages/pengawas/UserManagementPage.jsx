import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Users,
  X,
  Check,
  Loader2,
  UserCheck,
  UserPen,
} from 'lucide-react'

export default function UserManagementPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'pencatat',
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error:', err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      // Buat auth user via Supabase Auth
      // Data full_name & role dikirim lewat metadata → akan dibaca oleh database trigger
      // yang otomatis insert ke public.users (tidak perlu insert manual)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: formData.role,
          },
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Gagal membuat akun')

      // Insert ke public.users DIHAPUS — sudah diurus oleh database trigger
      // CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users ...

      setSuccess(`Akun ${formData.full_name} berhasil dibuat!`)
      setFormData({ email: '', password: '', full_name: '', role: 'pencatat' })
      setShowForm(false)

      // Beri jeda singkat agar trigger sempat berjalan sebelum fetch
      setTimeout(() => fetchUsers(), 800)
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
          <h1 className="text-2xl font-bold">Kelola Pengguna</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{users.length} pengguna terdaftar</p>
        </div>
        <Button
          onClick={() => {
            setShowForm(true)
            setError('')
            setSuccess('')
          }}
          className="gap-2"
          id="add-user-button"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Tambah</span>
        </Button>
      </div>

      {success && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm">
          {success}
        </div>
      )}

      {/* Add User Form */}
      {showForm && (
        <Card className="border-primary/20 shadow-lg animate-in slide-in-from-top-2 duration-300">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Tambah Pengguna Baru</CardTitle>
            <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="user_name">Nama Lengkap</Label>
                <Input
                  id="user_name"
                  placeholder="Nama lengkap pengguna"
                  value={formData.full_name}
                  onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user_email">Email</Label>
                <Input
                  id="user_email"
                  type="email"
                  placeholder="email@domain.com"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user_password">Password</Label>
                <Input
                  id="user_password"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user_role">Role</Label>
                <Select
                  id="user_role"
                  value={formData.role}
                  onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))}
                >
                  <option value="pencatat">Pencatat (Maker)</option>
                  <option value="pengawas">Pengawas (Checker)</option>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button type="submit" disabled={saving} className="flex-1 gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Buat Akun
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Belum ada pengguna</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u.id} className="hover:shadow-md transition-all duration-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    u.role === 'pengawas'
                      ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'
                      : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}
                >
                  {u.role === 'pengawas' ? (
                    <UserCheck className="w-5 h-5" />
                  ) : (
                    <UserPen className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Badge variant={u.role === 'pengawas' ? 'default' : 'secondary'}>
                  {u.role === 'pengawas' ? 'Pengawas' : 'Pencatat'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}