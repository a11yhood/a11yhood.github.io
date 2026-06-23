import { FolderOpen, Plus } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Collection, UserData } from '@/lib/types'
import { Link } from 'react-router-dom'
import { collectionContainsProduct } from '@/lib/collectionUtils'

type CollectionsManagerProps = {
  productKey?: string
  productKeys?: string[]
  userCollections: Collection[]
  user: UserData | null
  onOpenAddDialog: () => void
  onRequireLogin?: () => void
}

export function CollectionsManager({
  productKey,
  productKeys,
  userCollections,
  user,
  onOpenAddDialog,
  onRequireLogin,
}: CollectionsManagerProps) {
  const resolvedProductKeys = (productKeys && productKeys.length > 0)
    ? productKeys.filter(Boolean)
    : (productKey ? [productKey] : [])

  const productCollections = resolvedProductKeys.length > 0
    ? userCollections.filter((collection) => resolvedProductKeys.some((key) => collectionContainsProduct(collection, key, userCollections)))
    : []

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FolderOpen size={20} />
          Collections
        </h2>
        <button
          type="button"
          onClick={() => {
            if (user) {
              onOpenAddDialog()
              return
            }
            onRequireLogin?.()
          }}
          className="inline-flex items-center justify-center h-6 w-6 rounded-md text-xs border-2 border-dashed border-foreground/60 text-foreground/80 hover:border-foreground hover:text-foreground transition-colors"
          aria-label={user ? 'Add to collection' : 'Sign in to add to collection'}
        >
          <Plus size={14} weight="bold" />
        </button>
      </div>

      <ul className="flex flex-wrap gap-2">
        {productCollections.map((collection) => (
          <li key={collection.id}>
            <Link
              to={`/collections/${collection.slug || collection.id}`}
              className="no-underline"
            >
              <Badge variant="outline" className="cursor-pointer hover:bg-accent hover:text-accent-foreground motion-safe:hover:-translate-y-0.5 transition-all">
                {collection.name}
              </Badge>
            </Link>
          </li>
        ))}
      </ul>

      {productCollections.length === 0 && (
        <p className="text-sm text-muted-foreground mt-3">No collections yet.</p>
      )}
    </div>
  )
}

