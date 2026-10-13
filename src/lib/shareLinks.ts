/**
 * Builders for "share this page" links. Plain intent URLs only: no third-party
 * scripts or tracking widgets are loaded.
 */
export type ShareTarget = 'linkedin' | 'mastodon' | 'bluesky' | 'email'

export function buildShareUrl(target: ShareTarget, url: string, title: string): string {
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(title)
  switch (target) {
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`
    case 'bluesky':
      return `https://bsky.app/intent/compose?text=${encodeURIComponent(`${title} ${url}`)}`
    case 'mastodon':
      // Mastodon has no single intent endpoint (every instance differs); this
      // community redirector asks which instance to post from.
      return `https://mastodonshare.com/?text=${t}&url=${u}`
    case 'email':
      return `mailto:?subject=${t}&body=${encodeURIComponent(`${title}\n${url}`)}`
  }
}
