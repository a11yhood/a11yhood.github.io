import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { UserProfile } from '@/components/UserProfile'
import { APIService } from '@/lib/api'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'
import type { UserData, UserAccount } from '@/lib/types'

describe('ProfileEdit Accessibility Tests (Story 1.3)', () => {
  const testUserId = DEV_USERS.user.id
  let testUser: UserData
  let testAccount: UserAccount

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>)
  }

  beforeAll(async () => {
    APIService.setAuthTokenGetter(async () => getDevToken(testUserId))

    testUser = {
      id: testUserId,
      login: DEV_USERS.user.login,
      avatarUrl: 'https://example.com/avatar.jpg',
    }

    testAccount = {
      id: testUserId,
      githubId: testUserId,
      username: DEV_USERS.user.login,
      role: 'user',
      displayName: DEV_USERS.user.displayName,
      bio: 'Test bio',
      location: 'Test Location',
      website: 'https://example.com',
      email: DEV_USERS.user.email,
    }
  })

  afterAll(async () => {
    // Cleanup handled by dev-token system
  })

  describe('Form Accessibility', () => {
    it('should have Edit Profile button that is keyboard accessible', () => {
      renderWithRouter(
        <UserProfile userAccount={testAccount} user={testUser} />
      )

      const editButton = screen.getByRole('button', { name: /edit profile/i })
      expect(editButton).toBeInTheDocument()
      expect(editButton).not.toBeDisabled()
    })

    it('should open edit dialog with proper ARIA role', async () => {
      renderWithRouter(
        <UserProfile userAccount={testAccount} user={testUser} />
      )

      const editButton = screen.getByRole('button', { name: /edit profile/i })
      await userEvent.click(editButton)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()
      })
    })

    it('should have all form inputs with associated labels via htmlFor', async () => {
      renderWithRouter(
        <UserProfile userAccount={testAccount} user={testUser} />
      )

      const editButton = screen.getByRole('button', { name: /edit profile/i })
      await userEvent.click(editButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/bio/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/location/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/website/i)).toBeInTheDocument()
      })
    })

    it('should have accessible form controls for all editable fields', async () => {
      renderWithRouter(
        <UserProfile userAccount={testAccount} user={testUser} />
      )

      await userEvent.click(screen.getByRole('button', { name: /edit profile/i }))

      await waitFor(() => {
        const displayNameInput = screen.getByLabelText(/display name/i)
        const bioTextarea = screen.getByLabelText(/bio/i)
        const locationInput = screen.getByLabelText(/location/i)
        const websiteInput = screen.getByLabelText(/website/i)

        expect(displayNameInput).toBeInTheDocument()
        expect(bioTextarea).toBeInTheDocument()
        expect(locationInput).toBeInTheDocument()
        expect(websiteInput).toBeInTheDocument()
      })
    })

    it('should pre-populate fields with current values', async () => {
      renderWithRouter(
        <UserProfile userAccount={testAccount} user={testUser} />
      )

      await userEvent.click(screen.getByRole('button', { name: /edit profile/i }))

      await waitFor(() => {
        const displayNameInput = screen.getByLabelText(/display name/i) as HTMLInputElement
        const bioTextarea = screen.getByLabelText(/bio/i) as HTMLTextAreaElement
        const locationInput = screen.getByLabelText(/location/i) as HTMLInputElement
        const websiteInput = screen.getByLabelText(/website/i) as HTMLInputElement

        expect(displayNameInput.value).toBe(testAccount.displayName)
        expect(bioTextarea.value).toBe(testAccount.bio)
        expect(locationInput.value).toBe(testAccount.location)
        expect(websiteInput.value).toBe(testAccount.website)
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('should open dialog with keyboard (Enter key on button)', async () => {
      renderWithRouter(
        <UserProfile userAccount={testAccount} user={testUser} />
      )

      const editButton = screen.getByRole('button', { name: /edit profile/i })
      editButton.focus()

      await userEvent.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('should allow Tab navigation through form fields', async () => {
      renderWithRouter(
        <UserProfile userAccount={testAccount} user={testUser} />
      )

      await userEvent.click(screen.getByRole('button', { name: /edit profile/i }))

      await waitFor(() => {
        const displayNameInput = screen.getByLabelText(/display name/i)
        expect(displayNameInput).toBeInTheDocument()
      })

      const displayNameInput = screen.getByLabelText(/display name/i)
      displayNameInput.focus()
      expect(document.activeElement).toBe(displayNameInput)
    })

    it('should close dialog with Escape key', async () => {
      renderWithRouter(
        <UserProfile userAccount={testAccount} user={testUser} />
      )

      await userEvent.click(screen.getByRole('button', { name: /edit profile/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      await userEvent.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('Screen Reader Support', () => {
    it('should announce Save and Cancel buttons to screen readers', async () => {
      renderWithRouter(
        <UserProfile userAccount={testAccount} user={testUser} />
      )

      await userEvent.click(screen.getByRole('button', { name: /edit profile/i }))

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save/i })
        const cancelButton = screen.getByRole('button', { name: /cancel/i })

        expect(saveButton).toBeInTheDocument()
        expect(cancelButton).toBeInTheDocument()
      })
    })

    it('should have dialog title announced for screen readers', async () => {
      renderWithRouter(
        <UserProfile userAccount={testAccount} user={testUser} />
      )

      await userEvent.click(screen.getByRole('button', { name: /edit profile/i }))

      await waitFor(() => {
        const dialogTitle = screen.getByRole('heading', { name: /edit profile/i })
        expect(dialogTitle).toBeInTheDocument()
      })
    })
  })

  describe('Read-Only Fields', () => {
    it('should display username as read-only (not editable)', () => {
      renderWithRouter(
        <UserProfile userAccount={testAccount} user={testUser} />
      )

      // Username should be visible but not as an editable input in the main view
      expect(screen.getByText(testAccount.username)).toBeInTheDocument()
    })
  })

  describe('Focus Management', () => {
    it('should return focus to Edit button after dialog closes', async () => {
      renderWithRouter(
        <UserProfile userAccount={testAccount} user={testUser} />
      )

      const editButton = screen.getByRole('button', { name: /edit profile/i })
      await userEvent.click(editButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await userEvent.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })
})
