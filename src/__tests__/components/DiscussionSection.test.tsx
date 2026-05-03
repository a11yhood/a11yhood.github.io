import React, { useEffect, useState } from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DiscussionSection } from '@/components/DiscussionSection'
import { APIService } from '@/lib/api'
import { DEV_USERS } from '@/lib/dev-users'
import type { Discussion, UserData } from '@/lib/types'

type TestUser = UserData

const owner: TestUser = {
  id: DEV_USERS.admin.id,
  username: DEV_USERS.admin.username,
  avatarUrl: undefined,
}

const helper: TestUser = {
  id: DEV_USERS.moderator.id,
  username: DEV_USERS.moderator.username,
  avatarUrl: undefined,
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
      username: user.username,
    })
    setDiscussions((prev) => [...prev, created])
  }

  return <DiscussionSection discussions={discussions} user={user} onDiscuss={handleDiscuss} />
}

describe('DiscussionSection Component Tests (APIService mocked)', () => {
  let productId: string
  let store: Discussion[]

  const seedDiscussion = async (user: TestUser, content: string, parentId?: string) => {
    const created = await APIService.createDiscussion({
      productId,
      content,
      parentId,
      userId: user.id,
      username: user.username,
    })
    return created
  }

  beforeEach(() => {
    productId = 'test-product-id'
    store = []

    vi.spyOn(APIService, 'getAllDiscussions').mockImplementation(async () => [...store])
    vi.spyOn(APIService, 'createDiscussion').mockImplementation(async (payload) => {
      const created: Discussion = {
        id: `d-${store.length + 1}`,
        productId: payload.productId,
        userId: payload.userId,
        username: payload.username,
        content: payload.content,
        parentId: payload.parentId,
        createdAt: Date.now(),
      }
      store = [...store, created]
      return created
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('posts a new discussion thread and clears the textarea', async () => {
    const user = userEvent.setup()

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

    vi.mocked(APIService.createDiscussion).mockImplementationOnce(
      async (payload: any) =>
        new Promise((resolve) => {
          setTimeout(() => {
            const created: Discussion = {
              id: `d-${store.length + 1}`,
              productId: payload.productId,
              userId: payload.userId,
              username: payload.username,
              content: payload.content,
              parentId: payload.parentId,
              createdAt: Date.now(),
            }
            store = [...store, created]
            resolve(created)
          }, 10)
        })
    )

    render(<DiscussionHarness productId={productId} user={owner} />)

    const textarea = await screen.findByPlaceholderText(/ask a question or share your thoughts/i)
    await user.type(textarea, 'Posting state check')

    const postButton = screen.getByRole('button', { name: /^post$/i })
    await user.click(postButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /posting/i })).toBeInTheDocument()
    })

    // Ensure submission settles before teardown so we don't race product cleanup.
    await waitFor(() => {
      expect(screen.getByText('Posting state check')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^post$/i })).toBeInTheDocument()
    })
  })

  it('shows and hides reply UI while posting a reply', async () => {
    await seedDiscussion(owner, 'How do I install this?')
    const user = userEvent.setup()

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

    render(<DiscussionHarness productId={productId} user={owner} />)

    await waitFor(() => {
      expect(screen.getByText('Owner thread')).toBeInTheDocument()
      expect(screen.getByText('Helper chimes in')).toBeInTheDocument()
    })

    expect(screen.getByText(/messages$/i)).toBeInTheDocument()
  })

  it('shows login prompt when unauthenticated', async () => {
    await seedDiscussion(owner, 'Public question')

    render(<DiscussionHarness productId={productId} user={null} />)

    await waitFor(() => {
      expect(screen.getAllByText(/sign in/i).length).toBeGreaterThan(0)
    })
  })
})
