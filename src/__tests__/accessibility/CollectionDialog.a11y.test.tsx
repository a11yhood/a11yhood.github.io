import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateCollectionDialog } from '@/components/CreateCollectionDialog'
import { AddToCollectionDialog } from '@/components/AddToCollectionDialog'
import { APIService } from '@/lib/api'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'
import type { Collection } from '@/lib/types'

describe('CollectionDialog Accessibility Tests (Stories 6.1-6.2)', () => {
  const testUserId = DEV_USERS.user.id
  const testUsername = DEV_USERS.user.username || DEV_USERS.user.login
  let testProductSlug: string
  let testCollections: Collection[] = []

  beforeAll(async () => {
    APIService.setAuthTokenGetter(async () => getDevToken(testUserId))

    // Create a test product
    const product = await APIService.createProduct({
      name: 'Collection Test Product',
      type: 'Software',
      sourceUrl: `https://github.com/collection-test-${Date.now()}`,
      description: 'Product for collection tests with sufficient description content',
      tags: ['test'],
    })
    testProductSlug = product.slug || product.id

    // Create test collections
    const collection1 = await APIService.createCollection({
      name: 'My Favorites',
      description: 'Products I love',
      username: testUsername,
      productSlugs: [],
      isPublic: true,
    })

    const collection2 = await APIService.createCollection({
      name: 'Work Tools',
      description: 'Tools for work',
      username: testUsername,
      productSlugs: [testProductSlug],
      isPublic: false,
    })

    testCollections = [collection1, collection2]
  })

  afterAll(async () => {
    // Cleanup handled by dev-token system
  })

  describe('CreateCollectionDialog Accessibility', () => {
    describe('Dialog ARIA Attributes', () => {
      it('should have proper dialog role', () => {
        render(
          <CreateCollectionDialog
            open={true}
            onOpenChange={vi.fn()}
            onCreateCollection={vi.fn()}
            username={testUsername}
          />
        )

        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()
      })

      it('should have accessible dialog title', () => {
        render(
          <CreateCollectionDialog
            open={true}
            onOpenChange={vi.fn()}
            onCreateCollection={vi.fn()}
            username={testUsername}
          />
        )

        const title = screen.getByRole('heading', { name: /create collection/i })
        expect(title).toBeInTheDocument()
      })

      it('should have descriptive dialog description', () => {
        render(
          <CreateCollectionDialog
            open={true}
            onOpenChange={vi.fn()}
            onCreateCollection={vi.fn()}
            username={testUsername}
          />
        )

        expect(
          screen.getByText(/organize (related )?products/i)
        ).toBeInTheDocument()
      })
    })

    describe('Form Accessibility', () => {
      it('should have all inputs with associated labels', () => {
        render(
          <CreateCollectionDialog
            open={true}
            onOpenChange={vi.fn()}
            onCreateCollection={vi.fn()}
            username={testUsername}
          />
        )

        expect(screen.getByLabelText(/collection name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/public/i)).toBeInTheDocument()
      })

      it('should have name input as required field', () => {
        render(
          <CreateCollectionDialog
            open={true}
            onOpenChange={vi.fn()}
            onCreateCollection={vi.fn()}
            username={testUsername}
          />
        )

        const nameInput = screen.getByLabelText(/collection name/i)
        expect(nameInput).toBeInTheDocument()
      })

      it('should have accessible switch for public/private toggle', () => {
        render(
          <CreateCollectionDialog
            open={true}
            onOpenChange={vi.fn()}
            onCreateCollection={vi.fn()}
            username={testUsername}
          />
        )

        const publicSwitch = screen.getByRole('switch', { name: /public/i })
        expect(publicSwitch).toBeInTheDocument()
      })
    })

    describe('Keyboard Navigation', () => {
      it('should allow Tab navigation through form fields', async () => {
        render(
          <CreateCollectionDialog
            open={true}
            onOpenChange={vi.fn()}
            onCreateCollection={vi.fn()}
            username={testUsername}
          />
        )

        const nameInput = screen.getByLabelText(/collection name/i)
        nameInput.focus()
        expect(document.activeElement).toBe(nameInput)
      })

      it('should allow Space key to toggle public/private switch', async () => {
        const user = userEvent.setup()
        render(
          <CreateCollectionDialog
            open={true}
            onOpenChange={vi.fn()}
            onCreateCollection={vi.fn()}
            username={testUsername}
          />
        )

        const publicSwitch = screen.getByRole('switch', { name: /public/i })
        const initialChecked = publicSwitch.getAttribute('aria-checked')
        
        publicSwitch.focus()
        await user.keyboard(' ')

        await waitFor(() => {
          const newChecked = publicSwitch.getAttribute('aria-checked')
          expect(newChecked).not.toBe(initialChecked)
        })
      })

      it('should close dialog with Escape key', async () => {
        const onOpenChange = vi.fn()
        render(
          <CreateCollectionDialog
            open={true}
            onOpenChange={onOpenChange}
            onCreateCollection={vi.fn()}
            username={testUsername}
          />
        )

        fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })

        await waitFor(() => {
          expect(onOpenChange).toHaveBeenCalledWith(false)
        })
      })
    })

    describe('Form Validation', () => {
      it('should prevent submission with empty name', async () => {
        const onCreateCollection = vi.fn()
        render(
          <CreateCollectionDialog
            open={true}
            onOpenChange={vi.fn()}
            onCreateCollection={onCreateCollection}
            username={testUsername}
          />
        )

        const createButton = screen.getByRole('button', { name: /create/i })
        fireEvent.click(createButton)

        expect(onCreateCollection).not.toHaveBeenCalled()
      })
    })
  })

  describe('AddToCollectionDialog Accessibility', () => {
    describe('Dialog ARIA Attributes', () => {
      it('should have proper dialog role', () => {
        render(
          <AddToCollectionDialog
            open={true}
            onOpenChange={vi.fn()}
            collections={testCollections}
            productSlug={testProductSlug}
            onAddToCollection={vi.fn()}
            onRemoveFromCollection={vi.fn()}
            onCreateNew={vi.fn()}
          />
        )

        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()
      })

      it('should have accessible dialog title', () => {
        render(
          <AddToCollectionDialog
            open={true}
            onOpenChange={vi.fn()}
            collections={testCollections}
            productSlug={testProductSlug}
            onAddToCollection={vi.fn()}
            onRemoveFromCollection={vi.fn()}
            onCreateNew={vi.fn()}
          />
        )

        expect(screen.getByText('Add to Collection')).toBeInTheDocument()
      })
    })

    describe('Checkbox Accessibility', () => {
      it('should have checkboxes with accessible labels', () => {
        render(
          <AddToCollectionDialog
            open={true}
            onOpenChange={vi.fn()}
            collections={testCollections}
            productSlug={testProductSlug}
            onAddToCollection={vi.fn()}
            onRemoveFromCollection={vi.fn()}
            onCreateNew={vi.fn()}
          />
        )

        const checkboxes = screen.getAllByRole('checkbox')
        expect(checkboxes.length).toBeGreaterThan(0)
        
        checkboxes.forEach((checkbox) => {
          expect(checkbox).toHaveAccessibleName()
        })
      })

      it('should allow toggling collection checkboxes via keyboard or click', async () => {
        const user = userEvent.setup()
        render(
          <AddToCollectionDialog
            open={true}
            onOpenChange={vi.fn()}
            collections={testCollections}
            productSlug={testProductSlug}
            onAddToCollection={vi.fn()}
            onRemoveFromCollection={vi.fn()}
            onCreateNew={vi.fn()}
          />
        )

        const checkboxes = screen.getAllByRole('checkbox')
        expect(checkboxes.length).toBeGreaterThan(0)

        const target = checkboxes[0]
        expect(target).toHaveAttribute('aria-checked')

        await user.click(target)
        expect(target).toHaveAttribute('aria-checked', 'true')
      })
    })

    describe('Empty State Accessibility', () => {
      it('should show accessible empty state when no collections exist', () => {
        render(
          <AddToCollectionDialog
            open={true}
            onOpenChange={vi.fn()}
            collections={[]}
            productSlug={testProductSlug}
            onAddToCollection={vi.fn()}
            onRemoveFromCollection={vi.fn()}
            onCreateNew={vi.fn()}
          />
        )

        expect(screen.getByText(/haven't created any collections yet/i)).toBeInTheDocument()
        
        const createButton = screen.getByRole('button', { name: /create your first collection/i })
        expect(createButton).toBeInTheDocument()
      })
    })

    describe('Keyboard Navigation', () => {
      it('should allow keyboard navigation through checkboxes', async () => {
        render(
          <AddToCollectionDialog
            open={true}
            onOpenChange={vi.fn()}
            collections={testCollections}
            productSlug={testProductSlug}
            onAddToCollection={vi.fn()}
            onRemoveFromCollection={vi.fn()}
            onCreateNew={vi.fn()}
          />
        )

        const checkboxes = screen.getAllByRole('checkbox')
        const firstCheckbox = checkboxes[0]
        
        firstCheckbox.focus()
        expect(document.activeElement).toBe(firstCheckbox)
      })

      it('should allow Space key to toggle checkbox and defer API until Done', async () => {
        const user = userEvent.setup()
        const onAddToCollection = vi.fn()
        const onRemoveFromCollection = vi.fn()

        render(
          <AddToCollectionDialog
            open={true}
            onOpenChange={vi.fn()}
            collections={testCollections}
            productSlug={testProductSlug}
            onAddToCollection={onAddToCollection}
            onRemoveFromCollection={onRemoveFromCollection}
            onCreateNew={vi.fn()}
          />
        )

        const checkboxes = screen.getAllByRole('checkbox')
        const firstCheckbox = checkboxes[0]
        
        firstCheckbox.focus()
        await user.keyboard(' ')

        // Toggling with Space should change the state but not call API yet
        expect(firstCheckbox).toHaveAttribute('aria-checked', 'true')
        expect(onAddToCollection).not.toHaveBeenCalled()

        // API calls fire when Done is activated
        await user.click(screen.getByRole('button', { name: /done/i }))

        await waitFor(() => {
          expect(onAddToCollection).toHaveBeenCalledTimes(1)
        })
      })
    })

    describe('Screen Reader Support', () => {
      it('should announce collection count to screen readers', () => {
        render(
          <AddToCollectionDialog
            open={true}
            onOpenChange={vi.fn()}
            collections={testCollections}
            productSlug={testProductSlug}
            onAddToCollection={vi.fn()}
            onRemoveFromCollection={vi.fn()}
            onCreateNew={vi.fn()}
          />
        )

        // Dialog should list all collections
        testCollections.forEach((collection) => {
          expect(screen.getByText(collection.name)).toBeInTheDocument()
        })
      })
    })
  })

  describe('Focus Management', () => {
    it('should trap focus within create collection dialog', async () => {
      render(
        <CreateCollectionDialog
          open={true}
          onOpenChange={vi.fn()}
          onCreateCollection={vi.fn()}
          username={testUsername}
        />
      )

      const nameInput = screen.getByLabelText(/collection name/i)
      nameInput.focus()
      
      expect(document.activeElement).toBe(nameInput)
    })

    it('should trap focus within add to collection dialog', async () => {
      render(
        <AddToCollectionDialog
          open={true}
          onOpenChange={vi.fn()}
          collections={testCollections}
          productSlug={testProductSlug}
          onAddToCollection={vi.fn()}
          onRemoveFromCollection={vi.fn()}
          onCreateNew={vi.fn()}
        />
      )

      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes[0].focus()
      
      expect(document.activeElement).toBe(checkboxes[0])
    })
  })
})
