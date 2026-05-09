import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ProductImageManager } from '@/components/ProductImageManager'

const notify = {
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
}

vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({ notify }),
}))

describe('ProductImageManager', () => {
  it('syncs alt text edits to parent while in image edit mode', async () => {
    const user = userEvent.setup()
    const onImageChange = vi.fn()

    render(
      <ProductImageManager
        imageUrl="https://example.com/photo.png"
        imageAlt="Old alt text"
        onImageChange={onImageChange}
      />
    )

    await user.click(screen.getByRole('button', { name: /edit image url and alt text/i }))

    const altInput = screen.getByRole('textbox', { name: /alt text/i })
    await user.clear(altInput)
    await user.type(altInput, 'Updated alt text for product image')

    expect(onImageChange).toHaveBeenCalled()
    expect(onImageChange).toHaveBeenLastCalledWith(
      'https://example.com/photo.png',
      'Updated alt text for product image'
    )
  })
})
