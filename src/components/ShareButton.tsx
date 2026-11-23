import { useCallback } from 'react'
import { Butterfly, Envelope, LinkSimple, LinkedinLogo, MastodonLogo, ShareNetwork } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNotifications } from '@/contexts/NotificationContext'
import { buildShareUrl, type ShareTarget } from '@/lib/shareLinks'

type ShareButtonProps = {
  /** Title used in the shared post / email subject, e.g. the product name. */
  title: string
  /** Absolute URL to share. Defaults to the current page. */
  url?: string
  /** Noun used in the accessible name, e.g. "product", "blog post". */
  label?: string
  className?: string
}

const TARGETS: { target: ShareTarget; text: string; Icon: typeof Envelope }[] = [
  { target: 'linkedin', text: 'LinkedIn', Icon: LinkedinLogo },
  { target: 'mastodon', text: 'Mastodon', Icon: MastodonLogo },
  { target: 'bluesky', text: 'Bluesky', Icon: Butterfly },
  { target: 'email', text: 'Email', Icon: Envelope },
]

/**
 * Share menu for a product, blog post or collection. The shared URL is the
 * page's own address; the link preview comes from the route-aware social
 * metadata served by the routing middleware.
 */
export function ShareButton({ title, url, label = 'page', className }: ShareButtonProps) {
  const { notify } = useNotifications()
  const shareUrl = url ?? (typeof window !== 'undefined' ? window.location.href : '')
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      notify.success('Link copied to clipboard')
    } catch {
      notify.error('Could not copy the link. You can copy it from the address bar.')
    }
  }, [shareUrl, notify])

  const nativeShare = useCallback(async () => {
    try {
      await navigator.share({ title, url: shareUrl })
    } catch (err) {
      // AbortError means the person dismissed the share sheet; not a failure.
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        notify.error('Sharing failed. Try copying the link instead.')
      }
    }
  }, [title, shareUrl, notify])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className} aria-label={`Share this ${label}`}>
          <ShareNetwork size={16} className="mr-2" aria-hidden="true" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={copyLink}>
          <LinkSimple size={16} aria-hidden="true" />
          Copy link
        </DropdownMenuItem>
        {canNativeShare && (
          <DropdownMenuItem onSelect={nativeShare}>
            <ShareNetwork size={16} aria-hidden="true" />
            Share via device…
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {TARGETS.map(({ target, text, Icon }) => (
          <DropdownMenuItem key={target} asChild>
            <a
              href={buildShareUrl(target, shareUrl, title)}
              {...(target === 'email' ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
            >
              <Icon size={16} aria-hidden="true" />
              {text}
              {target !== 'email' && <span className="sr-only"> (opens in new tab)</span>}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
