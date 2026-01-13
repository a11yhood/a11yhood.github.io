import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { UserAccount } from '@/lib/types'
import { CheckCircle } from '@phosphor-icons/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

type UserSignupProps = {
  user: {
    id: string
    login: string
    avatarUrl: string
  }
  onComplete: (profile: Partial<Pick<UserAccount, 'displayName' | 'bio' | 'location' | 'website'>>) => void
  onSkip: () => void
}

export function UserSignup({ user, onComplete, onSkip }: UserSignupProps) {
  const [displayName, setDisplayName] = useState(user.login)
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onComplete({
      displayName: displayName.trim() || undefined,
      bio: bio.trim() || undefined,
      location: location.trim() || undefined,
      website: website.trim() || undefined,
    })
  }

  return (
    <div className="min-h-screen bg-(--color-bg) flex items-center justify-center px-6 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 rounded-full p-4">
              <CheckCircle size={48} className="text-primary" weight="duotone" />
            </div>
          </div>
          <CardTitle className="text-3xl">Welcome to a11yhood!</CardTitle>
          <CardDescription className="text-base mt-2">
            Complete your profile to get started (or skip for now)
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user.avatarUrl || undefined} alt={`${user.login}'s avatar`} />
                <AvatarFallback>{user.login.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">@{user.login}</p>
                <p className="text-sm text-muted-foreground">Connected via GitHub</p>
              </div>
            </div>

            <fieldset className="space-y-6" aria-describedby="signup-help">
              <legend className="sr-only">Profile information</legend>
              <p id="signup-help" className="text-sm text-muted-foreground">
                Complete your profile to personalize your experience.
              </p>

              <div className="space-y-2">
                <label className="block text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                  Display Name
                  <Input
                    id="displayName"
                    name="displayName"
                    type="text"
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="How should we call you?"
                    maxLength={50}
                    aria-describedby="displayName-help"
                    className="mt-1"
                  />
                </label>
                <p id="displayName-help" className="text-xs text-muted-foreground">
                  This will be shown on your ratings and contributions
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                  Bio
                  <Textarea
                    id="bio"
                    name="bio"
                    autoComplete="off"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us a bit about yourself..."
                    rows={4}
                    maxLength={500}
                    aria-describedby="bio-help"
                    className="mt-1"
                  />
                </label>
                <p id="bio-help" className="text-xs text-muted-foreground">
                  {bio.length}/500 characters
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                    Location
                    <Input
                      id="location"
                      name="location"
                      type="text"
                      autoComplete="address-level2"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, Country"
                      maxLength={100}
                      className="mt-1"
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                    Website
                    <Input
                      id="website"
                      name="website"
                      type="url"
                      autoComplete="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://yoursite.com"
                      maxLength={200}
                      className="mt-1"
                    />
                  </label>
                </div>
              </div>
            </fieldset>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-sm">What you can do on a11yhood:</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>✓ Browse and find access solutions</li>
                <li>✓ Rate products you've tried</li>
                <li>✓ Submit new accessibility tools and projects</li>
                <li>✓ Participate in community discussions</li>
                <li>✓ Create collections of your favorite products</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onSkip}
              className="w-full sm:w-auto"
            >
              Skip for now
            </Button>
            <Button type="submit" className="w-full sm:flex-1">
              Complete Profile
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
