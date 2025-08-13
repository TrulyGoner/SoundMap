import type { Metadata } from 'next'
import './globals.css'
import ErrorBoundary from '../components/ErrorBoundary'

export const metadata: Metadata = {
  title: 'SoundMap - Интерактивная карта звуков',
  description: 'Создавайте и исследуйте звуковые ландшафты с помощью интерактивной карты',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className="antialiased bg-gray-50">
        <ErrorBoundary>
          <div id="root">{children}</div>
        </ErrorBoundary>
      </body>
    </html>
  )
}
