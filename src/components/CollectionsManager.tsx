import { FolderOpen, Plus } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Collection, UserData } from '@/lib/types'
import { useNavigate } from 'react-router-dom'

type CollectionsManagerProps = {
  productSlug?: string
  userCollections: Collection[]
  user: UserData | null
  onOpenAddDialog: () => void
}

export function CollectionsManager({
  productSlug,
  userCollections,
  user,
  onOpenAddDialog,
}: CollectionsManagerProps) {
  const navigate = useNavigate()

  const productCollections = productSlug
    ? userCollections.filter(c => (c.productSlugs ?? []).includes(productSlug))
    : []

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FolderOpen size={20} />
          Collections
        </h2>
        {user && (
          <button
            onClick={onOpenAddDialog}
            className="inline-flex items-center justify-center h-6 w-6 rounded-md text-xs border border-dashed border-muted-foreground/50 text-muted-foreground hover:border-muted-foreground hover:text-foreground transition-colors"
            aria-label="Add to collection"
          >
            <Plus size={14} weight="bold" />
          </button>
        )}
      </div>

      <ul className="flex flex-wrap gap-2">
        {productCollections.map((collection) => (
          <li key={collection.id}>
            <a
              href={`/collections/${collection.slug || collection.id}`}
              onClick={(e) => {
                e.preventDefault()
                navigate(`/collections/${collection.slug || collection.id}`)
              }}
              className="no-underline"
            >
              <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                {collection.name}
              </Badge>
            </a>
          </li>
        ))}
      </ul>

      {productCollections.length === 0 && (
        <p className="text-sm text-muted-foreground mt-3">No collections yet.</p>
      )}
    </div>
  )
}

