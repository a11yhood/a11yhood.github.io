import { describe, it, expect } from 'vitest'
import { describeWithBackend } from '../helpers/with-backend'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'

const API_BASE = (globalThis as any).__TEST_API_BASE__
const adminToken = getDevToken(DEV_USERS.admin.role)
const userToken = getDevToken(DEV_USERS.user.role)

const getCurrentAdminIdentity = async () => {
  const response = await fetch(`${API_BASE}/users/me`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  })

  expect(response.status).toBe(200)
  return response.json()
}

describeWithBackend('Blog Post Authorization (backend enforced)', () => {
  it('rejects blog creation by non-admin users', async () => {
    const slug = `blog-non-admin-${Date.now()}`

    const response = await fetch(`${API_BASE}/blog-posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        title: 'Non-admin blog attempt',
        slug,
        content: 'content',
        excerpt: 'excerpt',
        author_id: DEV_USERS.user.id,
        author_name: DEV_USERS.user.displayName,
        published: true,
      }),
    })

    expect(response.status).toBe(403)
  })

  it('allows admins to publish blog posts and exposes them publicly', async () => {
    const slug = `blog-admin-${Date.now()}`
    const adminUser = await getCurrentAdminIdentity()

    const createRes = await fetch(`${API_BASE}/blog-posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Admin published blog',
        slug,
        content: '**markdown** body',
        excerpt: 'Security published blog',
        author_id: adminUser.id,
        author_name: adminUser.display_name ?? adminUser.displayName ?? adminUser.username,
        author_ids: [adminUser.id],
        author_names: [adminUser.display_name ?? adminUser.displayName ?? adminUser.username],
        tags: ['security', 'blog'],
        published: true,
        published_at: new Date().toISOString(),
        featured: true,
      }),
    })

    expect(createRes.status).toBe(201)

    const publicList = await fetch(`${API_BASE}/blog-posts`)
    expect(publicList.status).toBe(200)
    const posts = await publicList.json()
    expect(posts.some((p: any) => p.slug === slug)).toBe(true)

    const publicDetail = await fetch(`${API_BASE}/blog-posts/slug/${slug}`)
    expect(publicDetail.status).toBe(200)
    const detail = await publicDetail.json()
    expect(detail.content).toContain('**markdown**')
    expect(detail.published).toBe(true)
  })

  it('keeps unpublished blog posts hidden from the public', async () => {
    const slug = `blog-unpublished-${Date.now()}`
    const adminUser = await getCurrentAdminIdentity()

    const createRes = await fetch(`${API_BASE}/blog-posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Draft blog',
        slug,
        content: 'draft content',
        excerpt: 'draft excerpt',
        author_id: adminUser.id,
        author_name: adminUser.display_name ?? adminUser.displayName ?? adminUser.username,
        author_ids: [adminUser.id],
        author_names: [adminUser.display_name ?? adminUser.displayName ?? adminUser.username],
        published: false,
      }),
    })

    expect(createRes.status).toBe(201)

    const publicList = await fetch(`${API_BASE}/blog-posts`)
    const posts = await publicList.json()
    expect(posts.some((p: any) => p.slug === slug)).toBe(false)

    const publicDetail = await fetch(`${API_BASE}/blog-posts/slug/${slug}`)
    expect(publicDetail.status).toBe(403)
  })
})
