import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { RavelryOAuthManager } from '@/lib/scrapers/ravelry-oauth'
import { APIService } from '@/lib/api'

// Backend as the admin API would return it: tokens cleared, client credentials kept.
const backend: { cfg: Record<string, unknown> | null } = { cfg: null }

vi.mock('@/lib/api', () => ({
  APIService: {
    getOAuthConfig: vi.fn(async () => backend.cfg),
    upsertOAuthConfig: vi.fn(async (_platform: string, config: Record<string, unknown>) => {
      backend.cfg = { ...(backend.cfg || {}), ...config }
      return backend.cfg
    }),
    saveOAuthToken: vi.fn(),
    disconnectOAuth: vi.fn(),
    completeOAuthCallback: vi.fn(),
    triggerScraper: vi.fn(),
    getAllProducts: vi.fn(async () => []),
  },
}))

vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({ notify: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }),
}))

import { RavelrySettings } from '@/components/RavelrySettings'

async function renderSettings() {
  render(<RavelrySettings />)
  await waitFor(() => expect(screen.queryByText(/Loading authorization/)).toBeNull())
}

describe('RavelrySettings connection states', () => {
  beforeEach(() => {
    localStorage.clear()
    backend.cfg = { clientId: 'abc', clientSecret: 'secret', redirectUri: 'x', accessToken: null, refreshToken: null }
  })

  it('offers Connect when credentials are saved but there is no token', async () => {
    await renderSettings()
    expect(screen.getByRole('button', { name: 'Connect to Ravelry' })).toBeInTheDocument()
  })

  it('keeps Connect available while editing credentials, and lets you cancel', async () => {
    await renderSettings()
    fireEvent.click(screen.getByRole('button', { name: 'Update Credentials' }))

    expect(screen.getByLabelText('Ravelry Client ID')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Connect to Ravelry' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByLabelText('Ravelry Client ID')).toBeNull()
  })

  it('shows the credentials form when Update Credentials is used while connected', async () => {
    backend.cfg = { ...backend.cfg, accessToken: 'token' }
    await renderSettings()
    fireEvent.click(screen.getByRole('button', { name: 'Update Credentials' }))
    expect(screen.getByLabelText('Ravelry Client ID')).toBeInTheDocument()
  })

  it('does not claim to be connected when localStorage has a token the backend no longer has', async () => {
    localStorage.setItem(
      'ravelry-oauth-config',
      JSON.stringify({ clientId: 'abc', clientSecret: 'secret', accessToken: 'stale-token' }),
    )
    // backend.cfg has accessToken: null (set in beforeEach)
    await renderSettings()

    expect(screen.queryByText('Connected to Ravelry')).toBeNull()
    expect(screen.getByRole('button', { name: 'Connect to Ravelry' })).toBeInTheDocument()
  })

  it('trusts the local token when the backend has one', async () => {
    localStorage.setItem(
      'ravelry-oauth-config',
      JSON.stringify({ clientId: 'abc', clientSecret: 'secret', accessToken: 'token' }),
    )
    backend.cfg = { ...backend.cfg, accessToken: 'token' }
    await renderSettings()

    expect(screen.getByText('Connected to Ravelry')).toBeInTheDocument()
  })

  it('checks the backend only once per isAuthorized() call', async () => {
    localStorage.setItem(
      'ravelry-oauth-config',
      JSON.stringify({ clientId: 'abc', clientSecret: 'secret', accessToken: 'token' }),
    )
    backend.cfg = { ...backend.cfg, accessToken: 'token' }
    vi.mocked(APIService.getOAuthConfig).mockClear()

    expect(await RavelryOAuthManager.isAuthorized()).toBe(true)
    expect(APIService.getOAuthConfig).toHaveBeenCalledTimes(1)
  })

  it('shows a persistent error when saving credentials fails', async () => {
    vi.spyOn(RavelryOAuthManager, 'saveConfig').mockRejectedValueOnce(new Error('boom'))
    await renderSettings()
    fireEvent.click(screen.getByRole('button', { name: 'Update Credentials' }))
    fireEvent.change(screen.getByLabelText('Ravelry Client ID'), { target: { value: 'new-id' } })
    fireEvent.change(screen.getByLabelText('Ravelry Client Secret'), { target: { value: 'new-secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Credentials' }))

    expect(await screen.findByText(/Failed to save credentials.*boom/)).toBeInTheDocument()
    // Still able to connect with the previously saved credentials.
    expect(screen.getByRole('button', { name: 'Connect to Ravelry' })).toBeInTheDocument()
  })
})
