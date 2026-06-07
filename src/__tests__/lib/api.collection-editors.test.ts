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
          user_name: 'ownername',
          product_slugs: [],
          editor_ids: ['editor-1', 'editor-2'],
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
    expect(collection?.editorUsernames).toEqual([])
  })

  it('uses collection editor ids/add/remove endpoints', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ collection_id: 'c1', editor_ids: ['editor-1'] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          id: 'c1',
          slug: 'screen-reader-tools',
          name: 'Screen Reader Tools',
          user_id: 'owner-1',
          user_name: 'ownername',
          product_slugs: [],
          editor_ids: ['editor-1', 'editor-2'],
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
          is_public: true,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          id: 'c1',
          slug: 'screen-reader-tools',
          name: 'Screen Reader Tools',
          user_id: 'owner-1',
          user_name: 'ownername',
          product_slugs: [],
          editor_ids: ['editor-2'],
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-03T00:00:00Z',
          is_public: true,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

    const editorData = await APIService.getCollectionEditors('screen-reader-tools')
    const afterAdd = await APIService.addCollectionEditor('screen-reader-tools', 'editor-2')
    const afterRemove = await APIService.removeCollectionEditor('screen-reader-tools', 'editor-1')

    expect(fetchSpy).toHaveBeenCalledTimes(3)
    expect(editorData).toEqual({ collectionId: 'c1', editorIds: ['editor-1'] })
    expect(afterAdd?.editorIds).toEqual(['editor-1', 'editor-2'])
    expect(afterRemove?.editorIds).toEqual(['editor-2'])
    expect(String(fetchSpy.mock.calls[0][0])).toContain('/api/collections/screen-reader-tools/editors')
    expect(String(fetchSpy.mock.calls[1][0])).toContain('/api/collections/screen-reader-tools/editors/editor-2')
    expect(String(fetchSpy.mock.calls[2][0])).toContain('/api/collections/screen-reader-tools/editors/editor-1')
  })
})
