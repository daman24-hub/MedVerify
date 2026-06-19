import { useEffect, useState } from 'react'
import { getUserProfile, updateUserProfile } from '../services/api'
import { showToast } from '../services/toast'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState({ email: '', voiceGuidance: false })
  const [password, setPassword] = useState('')

  useEffect(() => {
    let mounted = true
    getUserProfile()
      .then((response) => {
        if (!mounted) return
        setProfile({
          email: response?.data?.email || '',
          voiceGuidance: response?.data?.voiceGuidance ?? false,
        })
      })
      .catch(() => {
        showToast('Could not load profile information.', 'error')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        email: profile.email,
        voiceGuidance: profile.voiceGuidance,
        password: password || undefined,
      }
      await updateUserProfile(body)
      showToast('Settings updated successfully.', 'success')
      setPassword('')
    } catch (error) {
      showToast(error?.response?.data?.error || 'Could not update settings.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page-shell settings-page">
      <section className="settings-panel glass-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Account settings</p>
            <h1>Personalize your DawaCheck experience</h1>
          </div>
          <span className="mini-badge">Secure</span>
        </div>

        <div className="settings-grid">
          <label className="field-label">
            <span>Email</span>
            <input
              type="email"
              className="field"
              value={profile.email}
              onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>

          <label className="field-label">
            <span>New password</span>
            <input
              type="password"
              className="field"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Leave blank to keep current password"
            />
          </label>

          <div className="preference-row">
            <div>
              <span className="field-label-text">Hindi voice guidance</span>
              <p className="hint-text">Enable spoken Hindi summaries during scan results.</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={profile.voiceGuidance}
                onChange={(event) => setProfile((prev) => ({ ...prev, voiceGuidance: event.target.checked }))}
              />
              <span className="toggle-track" />
            </label>
          </div>

          <button className="button button-cta" type="button" onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        <div className="settings-note">
          <p>Account settings are stored securely and used to personalize your scan flow.</p>
        </div>
      </section>
    </main>
  )
}
