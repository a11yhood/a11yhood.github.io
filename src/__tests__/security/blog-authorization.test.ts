import { describe, it, expect, beforeAll } from 'vitest'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'
import { runAllSeeds } from '../fixtures/test-seeds'

const API_BASE = 'http://localhost:8000/api'
const adminToken = getDevToken(DEV_USERS.admin.id)
const userToken = getDevToken(DEV_USERS.user.id)

describe('Blog Post Authorization (backend enforced)', () => {
  beforeAll(async () => {
    await runAllSeeds()
  })

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
        header_image: 'data:image/png;base64,iVBORw0KGgo=',
        header_image_alt: 'Blog hero alt',
        author_id: DEV_USERS.admin.id,
        author_name: DEV_USERS.admin.displayName,
        author_ids: [DEV_USERS.admin.id],
        author_names: [DEV_USERS.admin.displayName],
        tags: ['security', 'blog'],
        published: true,
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
    expect(detail.header_image_alt).toBe('Blog hero alt')
    expect(detail.content).toContain('**markdown**')
    expect(detail.published).toBe(true)
  })

  it('keeps unpublished blog posts hidden from the public', async () => {
    const slug = `blog-unpublished-${Date.now()}`

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
        author_id: DEV_USERS.admin.id,
        author_name: DEV_USERS.admin.displayName,
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
