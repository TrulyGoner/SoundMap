import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

export function LoadingSpinner() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-sound-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Загрузка карты звуков...</p>
      </div>
    </div>
  )
}

export function MapSkeleton() {
  return (
    <div className="w-full h-full">
      <Skeleton height="100%" />
    </div>
  )
}

export function SoundCardSkeleton() {
  return (
    <div className="card">
      <div className="flex items-start gap-4">
        <Skeleton circle width={40} height={40} />
        <div className="flex-1">
          <Skeleton height={20} width="60%" className="mb-2" />
          <Skeleton height={16} width="80%" className="mb-2" />
          <Skeleton height={14} width="40%" />
        </div>
      </div>
    </div>
  )
}
