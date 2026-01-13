import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserCircle, Star, Tag as TagIcon, Chat } from '@phosphor-icons/react'

type LoginPromptProps = {
  context: 'rate' | 'discuss' | 'tag'
}

export function LoginPrompt({ context }: LoginPromptProps) {
  const messages = {
    rate: {
      icon: Star,
      title: 'Sign in to rate',
      description: 'Your ratings help others find the best accessibility products.',
    },
    discuss: {
      icon: Chat,
      title: 'Sign in to join the discussion',
      description: 'Join the conversation and connect with the accessibility community.',
    },
    tag: {
      icon: TagIcon,
      title: 'Sign in to add tags',
      description: 'Help improve product discoverability by adding relevant tags.',
    },
  }

  const { icon: Icon, title, description } = messages[context]

  const handleLogin = () => {
    window.location.reload()
  }

  return (
    <Card className="p-6 text-center">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Icon size={32} className="text-muted-foreground" />
        </div>
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6">{description}</p>
      <Button onClick={handleLogin} className="w-full">
        <UserCircle size={20} className="mr-2" />
        Sign in with GitHub
      </Button>
    </Card>
  )
}
