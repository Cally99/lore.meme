import { Metadata } from 'next'
import { SubmitLoreForm } from '@/components/lore/SubmitLoreForm'

export const metadata: Metadata = {
  title: 'Submit Token Lore | Lore.meme',
  description: 'Submit the story behind your cryptocurrency token',
}

export default function SubmitLorePage() {
  return (
    <div className="min-h-screen">
      <SubmitLoreForm />
    </div>
  )
}
