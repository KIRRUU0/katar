import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Icon } from '@iconify/react'

export default function LoginForm() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!window.confirm("Yakin ingin masuk?")) return;
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message || 'Login gagal, cek kembali email dan password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="card w-full max-w-md p-8 space-y-5"
      >
        {/* Title */}
        <h1 className="font-heading text-2xl font-bold flex items-center justify-center gap-2 text-abu-900">
          <Icon icon="solar:lock-password-bold-duotone" className="w-6 h-6 text-merah-600" />
          Login Admin Katar RT 02/03
        </h1>

        {/* Error message */}
        {error && (
          <p className="text-merah-600 text-sm text-center bg-merah-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-abu-700 mb-1">Email</label>
          <input
            type="email"
            className="form-input"
            placeholder="admin@katar.rt0203"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-semibold text-abu-700 mb-1">Password</label>
          <input
            type="password"
            className="form-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Masuk...
            </span>
          ) : (
            'Masuk'
          )}
        </button>
      </form>
    </div>
  )
}
