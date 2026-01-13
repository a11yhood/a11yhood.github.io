import React, { useEffect, useState } from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DiscussionSection } from '@/components/DiscussionSection'
import { APIService } from '@/lib/api'
import { getValidProductType } from '../testData'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'
import type { Discussion, UserData } from '@/lib/types'

type TestUser = UserData & { token: string }

const API_BASE = 'http://localhost:8000/api'

// Use existing seeded dev users instead of creating new ones
function getTestUser(role: 'admin' | 'moderator' | 'user'): TestUser {
  const devUser = DEV_USERS[role]
  return {
    id: devUser.id,
    login: devUser.login,
    avatarUrl: undefined,
    token: getDevToken(devUser.id),
  }
}

async function createTestProduct(owner: TestUser): Promise<string> {
  // Set auth token for this request
  APIService.setAuthTokenGetter(async () => owner.token)
  
  const product = await APIService.createProduct({
    name: `Discussion Product ${Date.now()}`,
    type: getValidProductType('user-submitted'),
    source: 'user-submitted',
    category: 'Software',
    sourceUrl: `https://github.com/test/discussion-${Date.now()}`,
    editorIds: [owner.id],
  })

  return product.id
}

const DiscussionHarness = ({ productId, user }: { productId: string; user: TestUser | null }) => {
  const [discussions, setDiscussions] = useState<Discussion[]>([])

  useEffect(() => {
    let active = true
    ;(async () => {
      const all = await APIService.getAllDiscussions()
      if (active) {
        setDiscussions(all.filter((d) => d.productId === productId))
      }
    })()
    return () => {
      active = false
    }
  }, [productId])

  const handleDiscuss = async (content: string, parentId?: string) => {
    if (!user) return
    const created = await APIService.createDiscussion({
      productId,
      content,
      parentId,
      userId: user.id,
      username: user.login,
    })
    setDiscussions((prev) => [...prev, created])
  }

  const userData = user
    ? { id: user.id, login: user.login, avatarUrl: user.avatarUrl }
    : null

  return (
    <DiscussionSection
      discussions={discussions}
      user={userData}
      onDiscuss={handleDiscuss}
    />
  )
}

describe('DiscussionSection Integration Tests (live API)', () => {
  let owner: TestUser
  let helper: TestUser
  let productId: string
  let activeToken: string | null

  APIService.setAuthTokenGetter(async () => activeToken)

  const seedDiscussion = async (user: TestUser, content: string, parentId?: string) => {
    activeToken = user.token
    return APIService.createDiscussion({
      productId,
      content,
      parentId,
      userId: user.id,
      login: user.login,
    })
  }

  beforeEach(async () => {
    owner = getTestUser('admin')
    helper = getTestUser('moderator')
    activeToken = owner.token
    productId = await createTestProduct(owner)
  })

  afterEach(async () => {
    // Safely cleanup only if owner exists
    if (owner?.token && productId) {
      activeToken = owner.token
      await fetch(`${API_BASE}/products/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: owner.token },
      }).catch(() => {
        // ignore cleanup failures
      })
    }
  })

  it('posts a new discussion thread and clears the textarea', async () => {
    const user = userEvent.setup()
    activeToken = owner.token

    render(<DiscussionHarness productId={productId} user={owner} />)

    const textarea = await screen.findByPlaceholderText(/ask a question or share your thoughts/i)
    await user.type(textarea, 'This is my new discussion thread!')

    const postButton = screen.getByRole('button', { name: /^post$/i })
    await user.click(postButton)

    await waitFor(() => {
      expect(screen.getByText('This is my new discussion thread!')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect((textarea as HTMLTextAreaElement).value).toBe('')
    })
  })

  it('shows "Posting..." while submitting', async () => {
    const user = userEvent.setup()
    activeToken = owner.token

    render(<DiscussionHarness productId={productId} user={owner} />)

    const textarea = await screen.findByPlaceholderText(/ask a question or share your thoughts/i)
    await user.type(textarea, 'Posting state check')

    const postButton = screen.getByRole('button', { name: /^post$/i })
    await user.click(postButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /posting/i })).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('Posting state check')).toBeInTheDocument()
    })
  })

  it('shows and hides reply UI while posting a reply', async () => {
    await seedDiscussion(owner, 'How do I install this?')
    const user = userEvent.setup()
    activeToken = owner.token

    render(<DiscussionHarness productId={productId} user={owner} />)

    await screen.findByText('How do I install this?')
    const replyButtons = screen.getAllByRole('button', { name: /reply/i })
    await user.click(replyButtons[0])

    const replyBox = await screen.findByPlaceholderText(/write your reply/i)
    fireEvent.change(replyBox, { target: { value: 'This is my reply!' } })

    const postReply = screen.getByRole('button', { name: /post reply/i })
    await user.click(postReply)

    await waitFor(() => {
      expect(screen.getByText('This is my reply!')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/write your reply/i)).not.toBeInTheDocument()
    })
  })

  it('renders multiple users and message count from the API', async () => {
    await seedDiscussion(owner, 'Owner thread')
    await seedDiscussion(helper, 'Helper chimes in')
    activeToken = owner.token

    render(<DiscussionHarness productId={productId} user={owner} />)

    await waitFor(() => {
      expect(screen.getByText('Owner thread')).toBeInTheDocument()
      expect(screen.getByText('Helper chimes in')).toBeInTheDocument()
    })

    // Verify message count is displayed
    expect(screen.getByText(/messages$/i)).toBeInTheDocument()
  })

  it('shows login prompt when unauthenticated', async () => {
    await seedDiscussion(owner, 'Public question')
    activeToken = owner.token

    render(<DiscussionHarness productId={productId} user={null} />)

    await waitFor(() => {
      expect(screen.getAllByText(/sign in/i).length).toBeGreaterThan(0)
    })
  })
})
