/**
 * AppFooter component - Site-wide footer with GitHub link and mailing list invitation.
 * 
 * Displays:
 * - Project tagline
 * - Link to GitHub repository
 * - Call to action to join the mailing list
 * 
 * Accessibility:
 * - Uses semantic <footer> landmark (screen readers can jump to it with R key or landmark navigation)
 * - aria-label helps screen readers announce "Site footer"
 * - <nav> element creates a navigation landmark for footer links
 * - All links have descriptive text and proper ARIA attributes
 */
import { GithubLogo, EnvelopeSimple } from '@phosphor-icons/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub } from '@fortawesome/free-brands-svg-icons'

export function AppFooter() {
  return (
    <footer aria-label="Site footer" className="border-t border-border bg-muted/30 mt-12">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-center space-y-3">
          <nav aria-label="Footer links">
            <div className="flex items-center justify-center gap-6 text-sm">
              <a
                href="https://github.com/a11yhood/a11yhood-frontend"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <GithubLogo size={18} weight="fill" aria-hidden="true" />
                <span>View on GitHub</span>
              </a>
              <span className="text-muted-foreground/50" aria-hidden="true">•</span>
              <a
                href="https://groups.google.com/g/caos-announcements/?pli=1"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <EnvelopeSimple size={18} weight="fill" aria-hidden="true" />
                <span>Join our mailing list</span>
              </a>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
              <span className="font-medium text-muted-foreground"><i>Funded by:</i></span>
              <a
                href="https://acl.gov/about-acl/about-national-institute-disability-independent-living-and-rehabilitation-research"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                <img src="https://acl.gov/themes/custom/acl/favicon.ico" alt="ACL logo" className="h-4 w-4" />
                <span>NIDILRR</span>
              </a>
              <span className="text-muted-foreground/50" aria-hidden="true">•</span>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                <FontAwesomeIcon icon={faGithub} className="h-4 w-4" />
                <span>GitHub</span>
              </a>
              <span className="font-medium text-muted-foreground"><i>Partners:</i></span>
              <a
                href="https://create.uw.edu"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <img src="https://create.uw.edu/favicon.ico" alt="CREATE logo" className="h-4 w-4" />
                <span>CREATE</span>
              </a>
              <span className="text-muted-foreground/50" aria-hidden="true">•</span>
              <a
                href="https://caos.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                caos
              </a>
              <span className="text-muted-foreground/50" aria-hidden="true">•</span>
              <a
                href="https://openassistivetech.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                GOAT
              </a>
            </div>
          </nav>
        </div>
      </div>
    </footer>
  )
}
