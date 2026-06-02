import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APIService } from '@/lib/api'

describe('APIService collection editors', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('normalizes collection editor fields from snake_case response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'c1',
          slug: 'screen-reader-tools',
          name: 'Screen Reader Tools',
          description: 'A set of tools',
          user_id: 'owner-1',
          userName: 'ownername',
          product_slugs: [],
          editor_ids: ['editor-1', 'editor-2'],
          editor_usernames: ['alice', 'bob'],
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
          is_public: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    const collection = await APIService.getCollection('screen-reader-tools')

    expect(collection?.username).toBe('ownername')
    expect(collection?.editorIds).toEqual(['editor-1', 'editor-2'])
    expect(collection?.editorUsernames).toEqual(['alice', 'bob'])
  })

  it('uses collection editor request endpoints', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

    await APIService.requestCollectionEditor('screen-reader-tools', 'Please add me')
    await APIService.approveCollectionEditorRequest('screen-reader-tools', 'request-1')
    await APIService.rejectCollectionEditorRequest('screen-reader-tools', 'request-2')

    expect(fetchSpy).toHaveBeenCalledTimes(3)
    expect(String(fetchSpy.mock.calls[0][0])).toContain('/api/collections/screen-reader-tools/editors/request')
    expect(String(fetchSpy.mock.calls[1][0])).toContain('/api/collections/screen-reader-tools/editor-requests/request-1/approve')
    expect(String(fetchSpy.mock.calls[2][0])).toContain('/api/collections/screen-reader-tools/editor-requests/request-2/reject')
  })
})
