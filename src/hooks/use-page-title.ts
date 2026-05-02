import { useEffect } from 'react'

const BASE_TITLE = 'a11yhood - Accessible Product Reviews'

/**
 * Sets document.title for the current page to aid screen reader navigation.
 * When a title is provided, the format is "<title> | a11yhood".
 * When title is empty, falls back to the site-wide base title.
 * Resets to the base title on unmount.
 */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} | a11yhood` : BASE_TITLE
    return () => {
      document.title = BASE_TITLE
    }
  }, [title])
}
