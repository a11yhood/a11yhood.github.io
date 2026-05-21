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
  it('shows image ID when the image source is an API image URL', () => {
    render(
      <ProductImageManager
        imageUrl="https://example.com/api/images/12345"
        imageAlt="Old alt text"
        onImageChange={vi.fn()}
      />
    )

    expect(screen.getByText('Image ID: 12345')).toBeInTheDocument()
  })

  it('shows image ID when the image source is a relative API image URL', () => {
    render(
      <ProductImageManager
        imageUrl="/api/images/98765"
        imageAlt="Old alt text"
        onImageChange={vi.fn()}
      />
    )

    expect(screen.getByText('Image ID: 98765')).toBeInTheDocument()
  })

  it('keeps showing image ID after switching to image edit mode', async () => {
    const user = userEvent.setup()

    render(
      <ProductImageManager
        imageUrl="/api/images/24680"
        imageAlt="Uploaded image"
        onImageChange={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: /edit image url and alt text/i }))

    expect(screen.getByText('Image ID: 24680')).toBeInTheDocument()
  })

  it('shows a compact label for uploaded data URLs instead of raw base64', () => {
    render(
      <ProductImageManager
        imageUrl="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD"
        imageAlt="Uploaded photo"
        onImageChange={vi.fn()}
      />
    )

    expect(screen.getByText('Image source: Uploaded file preview')).toBeInTheDocument()
    expect(screen.queryByText(/Image URL: data:image/i)).not.toBeInTheDocument()
  })

  it('hides file upload controls when uploads are not allowed', () => {
    render(
      <ProductImageManager
        imageUrl="https://example.com/photo.png"
        imageAlt="Old alt text"
        onImageChange={vi.fn()}
        canUploadFile={false}
      />
    )

    expect(screen.queryByRole('button', { name: /upload image file/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/^or$/i)).not.toBeInTheDocument()
  })

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
      altInput.blur() // Blur to trigger commitAltTextToParent

    expect(onImageChange).toHaveBeenCalled()
    expect(onImageChange).toHaveBeenLastCalledWith(
      'https://example.com/photo.png',
      'Updated alt text for product image'
    )
  })

  it('does not prefill image URL input with a data URL when replacing an uploaded image', async () => {
    const user = userEvent.setup()

    render(
      <ProductImageManager
        imageUrl="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD"
        imageAlt="Uploaded photo"
        onImageChange={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: /edit image url and alt text/i }))

    const imageUrlInput = screen.getByRole('textbox', { name: /image url/i })
    expect(imageUrlInput).toHaveValue('')
  })

  it('prefills image URL input with the current web URL when replacing a linked image', async () => {
    const user = userEvent.setup()

    render(
      <ProductImageManager
        imageUrl="https://example.com/product-image.jpg"
        imageAlt="Linked image"
        onImageChange={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: /edit image url and alt text/i }))

    const imageUrlInput = screen.getByRole('textbox', { name: /image url/i })
    expect(imageUrlInput).toHaveValue('https://example.com/product-image.jpg')
  })

  it('prefills image URL input with absolute API URL when replacing an uploaded API image reference', async () => {
    const user = userEvent.setup()

    render(
      <ProductImageManager
        imageUrl="/api/images/24680"
        imageAlt="Uploaded image"
        onImageChange={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: /edit image url and alt text/i }))

    const imageUrlInput = screen.getByRole('textbox', { name: /image url/i })
    expect((imageUrlInput as HTMLInputElement).value).toMatch(/\/api\/images\/24680$/)
  })
})
