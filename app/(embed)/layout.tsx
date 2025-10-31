import { Providers } from '@/app/providers'
import '@/app/globals.css'
import './embed.css'

export const metadata = {
  title: 'WalPlayer Embed',
  description: 'Watch and trade directly on X',
}

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}