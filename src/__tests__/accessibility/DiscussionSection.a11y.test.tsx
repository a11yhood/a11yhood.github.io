import { beforeAll, describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DiscussionSection } from '@/components/DiscussionSection'
import { APIService } from '@/lib/api'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'
import type { Discussion, UserData } from '@/lib/types'

const testUserId = DEV_USERS.user.id
const productUrl = `https://github.com/test/a11y-disc-${Date.now()}`
let discussions: Discussion[] = []
let currentUser: UserData
let productId: string

beforeAll(async () => {
  APIService.setAuthTokenGetter(async () => getDevToken(testUserId))
  currentUser = {
    id: testUserId,
    login: DEV_USERS.user.login,
    avatarUrl: 'https://example.com/avatar.jpg',
  }

  const product = await APIService.createProduct({
    name: 'Discussion Target',
    type: 'Software',
    sourceUrl: productUrl,
    description: 'Product for discussion accessibility tests with sufficient description',
    tags: ['discussion', 'a11y'],
  })
  productId = product.id

  // Seed discussions - these will have username populated by backend
  const root = await APIService.createDiscussion({
    productId,
    userId: currentUser.id,
    username: currentUser.login,
    content: 'How do I install this?',
  })

  await APIService.createDiscussion({
    productId,
    userId: currentUser.id,
    username: currentUser.login,
    content: 'Check the documentation!',
    parentId: root.id,
  })

  const all = await APIService.getAllDiscussions()
  discussions = all.filter((d) => d.productId === productId)
  
  // Ensure discussions have username field set
  discussions = discussions.map((d) => ({
    ...d,
    username: d.username || currentUser.login,
  }))
})

describe('DiscussionSection Accessibility Tests', () => {
  it('should have proper heading hierarchy', () => {
    render(
      <DiscussionSection
        discussions={discussions}
        user={currentUser}
        onDiscuss={vi.fn()}
      />
    )

    const heading = screen.getByRole('heading', { name: /discussion/i })
    expect(heading).toBeInTheDocument()
  })

  it('should display discussion count', () => {
    render(
      <DiscussionSection
        discussions={discussions}
        user={currentUser}
        onDiscuss={vi.fn()}
      />
    )

    expect(screen.getByText(/2 messages/i)).toBeInTheDocument()
  })

  it('should have accessible discussion list', () => {
    render(
      <DiscussionSection
        discussions={discussions}
        user={currentUser}
        onDiscuss={vi.fn()}
      />
    )

    const list = screen.getByRole('list')
    expect(list).toBeInTheDocument()
  })

  it('should have accessible textarea for new discussion', () => {
    render(
      <DiscussionSection
        discussions={discussions}
        user={currentUser}
        onDiscuss={vi.fn()}
      />
    )

    const textarea = screen.getByRole('textbox', { name: /start a new thread/i })
    expect(textarea).toBeInTheDocument()
  })

  it('should have accessible post button', () => {
    render(
      <DiscussionSection
        discussions={discussions}
        user={currentUser}
        onDiscuss={vi.fn()}
      />
    )

    const button = screen.getByRole('button', { name: /post/i })
    expect(button).toBeInTheDocument()
  })

  it('should show reply buttons for discussions', () => {
    render(
      <DiscussionSection
        discussions={discussions}
        user={currentUser}
        onDiscuss={vi.fn()}
      />
    )

    const replyButtons = screen.getAllByRole('button', { name: /reply/i })
    expect(replyButtons.length).toBeGreaterThan(0)
  })

  it('should display discussion authors', () => {
    render(
      <DiscussionSection
        discussions={discussions}
        user={currentUser}
        onDiscuss={vi.fn()}
      />
    )

    const authors = screen.getAllByText(currentUser.login)
    expect(authors.length).toBeGreaterThan(0)
  })

  it('should display discussion content', () => {
    render(
      <DiscussionSection
        discussions={discussions}
        user={currentUser}
        onDiscuss={vi.fn()}
      />
    )

    discussions.forEach((discussion) => {
      expect(screen.getByText(discussion.content)).toBeInTheDocument()
    })
  })

  it('should handle threaded replies visually', () => {
    render(
      <DiscussionSection
        discussions={discussions}
        user={currentUser}
        onDiscuss={vi.fn()}
      />
    )

    const parentDiscussion = screen.getByText('How do I install this?')
    const replyDiscussion = screen.getByText('Check the documentation!')
    
    expect(parentDiscussion).toBeInTheDocument()
    expect(replyDiscussion).toBeInTheDocument()
  })

  it('should call onDiscuss when posting', async () => {
    const handleDiscuss = vi.fn()

    render(
      <DiscussionSection
        discussions={discussions}
        user={currentUser}
        onDiscuss={async (content, parentId) => {
          await APIService.createDiscussion({
            productId,
            userId: currentUser.id,
            username: currentUser.login,
            content,
            parentId,
            createdAt: Date.now(),
          })
          handleDiscuss(content, parentId)
        }}
      />
    )

    const textarea = screen.getByRole('textbox', { name: /start a new thread/i })
    fireEvent.change(textarea, { target: { value: 'New discussion message' } })

    const button = screen.getByRole('button', { name: /post/i })
    fireEvent.click(button)

    await waitFor(async () => {
      expect(handleDiscuss).toHaveBeenCalledWith('New discussion message', undefined)
      const updated = await APIService.getAllDiscussions()
      const exists = updated.some((d) => d.content === 'New discussion message' && d.productId === productId)
      expect(exists).toBe(true)
    })
  })

  it('should show login prompt when user is not authenticated', () => {
    render(
      <DiscussionSection
        discussions={discussions}
        user={null}
        onDiscuss={vi.fn()}
      />
    )

    expect(screen.getByText(/sign in to join the discussion/i)).toBeInTheDocument()
  })

  it('should handle empty discussions list', () => {
    render(
      <DiscussionSection
        discussions={[]}
        user={currentUser}
        onDiscuss={vi.fn()}
      />
    )

    expect(screen.getByText(/no discussions yet/i)).toBeInTheDocument()
  })

  it('should be keyboard navigable', async () => {
    render(
      <DiscussionSection
        discussions={discussions}
        user={currentUser}
        onDiscuss={vi.fn()}
      />
    )

    const textarea = screen.getByRole('textbox', { name: /start a new thread/i })
    textarea.focus()
    expect(document.activeElement).toBe(textarea)
  })
})
