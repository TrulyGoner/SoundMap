import { Plus, Volume2, Settings } from 'lucide-react'

interface HeaderProps {
  onAddSound: () => void
}

export function Header({ onAddSound }: HeaderProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Volume2 className="w-8 h-8 text-sound-primary" />
          <h1 className="text-2xl font-bold text-gray-900">SoundMap</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={onAddSound}
            className="btn-primary px-4 py-2 gap-2"
          >
            <Plus className="w-4 h-4" />
            Добавить звук
          </button>
          
          <button className="audio-control">
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    </header>
  )
}
