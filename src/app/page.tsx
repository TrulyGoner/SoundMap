'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { AudioPlayer } from '@/components/AudioPlayer'
import { SoundUploadModal } from '@/components/SoundUploadModal'
import { Header } from '@/components/Header'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ControlPanel } from '@/components/ControlPanel'
import { SpatialAudioController } from '@/components/SpatialAudioController'
import { SoundMarker } from '@/types/sound'
import { initializeAudio, audioManager } from '@/utils/audioContext'
import { initializeCache, cacheManager } from '@/utils/cacheManager'

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <LoadingSpinner />
})

// Демо данные для примера
const DEMO_SOUNDS: SoundMarker[] = [
  {
    id: '1',
    title: 'Пение птиц в Сокольниках',
    description: 'Утреннее пение птиц в парке Сокольники. Записано весной 2024.',
    author: 'Анна Петрова',
    coordinates: [37.6773, 55.7914],
    audioUrl: '/demo/birds.mp3',
    duration: 45,
    tags: ['природа', 'птицы', 'парк', 'утро'],
    likes: 24,
    createdAt: '2024-01-15T08:30:00Z'
  },
  {
    id: '2',
    title: 'Звуки фонтана на Красной площади',
    description: 'Успокаивающий звук воды из фонтана.',
    author: 'Михаил Иванов',
    coordinates: [37.6226, 55.7539],
    audioUrl: '/demo/fountain.mp3',
    duration: 32,
    tags: ['вода', 'фонтан', 'город', 'релакс'],
    likes: 18,
    createdAt: '2024-01-14T16:20:00Z'
  },
  {
    id: '3',
    title: 'Уличный музыкант в Арбате',
    description: 'Живая музыка на старом Арбате. Гитара и вокал.',
    author: 'Елена Смирнова',
    coordinates: [37.5939, 55.7522],
    audioUrl: '/demo/street-music.mp3',
    duration: 67,
    tags: ['музыка', 'гитара', 'улица', 'арбат'],
    likes: 42,
    createdAt: '2024-01-13T19:45:00Z'
  },
  {
    id: '4',
    title: 'Звонок трамвая на Чистых прудах',
    description: 'Характерный звук московского трамвая.',
    author: 'Дмитрий Козлов',
    coordinates: [37.6334, 55.7658],
    audioUrl: '/demo/tram.mp3',
    duration: 12,
    tags: ['транспорт', 'трамвай', 'город', 'ностальгия'],
    likes: 15,
    createdAt: '2024-01-12T14:30:00Z'
  }
]

export default function Home() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedSound, setSelectedSound] = useState<SoundMarker | null>(null)
  const [sounds, setSounds] = useState<SoundMarker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [isAudioInitialized, setIsAudioInitialized] = useState(false)
  const [clickedCoordinates, setClickedCoordinates] = useState<[number, number] | null>(null)
  const [listenerPosition, setListenerPosition] = useState<[number, number]>([37.6176, 55.7558])
  const [spatialAudioEnabled, setSpatialAudioEnabled] = useState(true)
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.6176, 55.7558])
  const [mapZoom, setMapZoom] = useState(10)

  useEffect(() => {
    initializeApp()
    setupOnlineStatusListener()

    // Global error handler for unhandled network errors
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('Failed to fetch') ||
          event.reason?.message?.includes('NetworkError') ||
          event.reason?.message?.includes('AbortError')) {
        console.warn('Network error handled:', event.reason.message)
        event.preventDefault() // Prevent error from being logged to console
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  // Обновление spatial audio при изменении позиции слушателя
  useEffect(() => {
    if (isAudioInitialized && spatialAudioEnabled) {
      updateSpatialAudio()
    }
  }, [listenerPosition, spatialAudioEnabled, isAudioInitialized])

  const initializeApp = async () => {
    try {
      setIsLoading(true)
      
      // Инициализируем кеш
      await initializeCache()
      
      // Пытаемся загрузить звуки из кеша
      const cachedSounds = await cacheManager.getCachedSoundMetadata()
      if (cachedSounds) {
        setSounds(cachedSounds)
      } else {
        // Загружаем д��мо данные
        setSounds(DEMO_SOUNDS)
        // Кешируем их
        await cacheManager.cacheSoundMetadata(DEMO_SOUNDS)
      }
      
    } catch (error) {
      console.error('Failed to initialize app:', error)
      // В случае ошибки используем демо данные
      setSounds(DEMO_SOUNDS)
    } finally {
      setIsLoading(false)
    }
  }

  const setupOnlineStatusListener = () => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    
    updateOnlineStatus()
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }

  const handleAddSound = async (newSoundData: any) => {
    const sound: SoundMarker = {
      ...newSoundData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      likes: 0
    }
    
    const updatedSounds = [...sounds, sound]
    setSounds(updatedSounds)
    
    // Обновляем кеш
    await cacheManager.cacheSoundMetadata(updatedSounds)
    
    // Пытаемся кешировать аудио файл
    if (isOnline) {
      cacheManager.cacheAudioFile(sound.id, sound.audioUrl).catch(console.error)
    }
  }

  const handleSoundSelect = async (sound: SoundMarker) => {
    setSelectedSound(sound)
    
    // Инициализируем аудио систему при первом воспроизведении
    if (!isAudioInitialized) {
      try {
        await initializeAudio()
        setIsAudioInitialized(true)
      } catch (error) {
        console.error('Failed to initialize audio:', error)
      }
    }
  }

  const handleMapClick = useCallback((coordinates: [number, number]) => {
    setClickedCoordinates(coordinates)
    setIsUploadModalOpen(true)
  }, [])

  const handleLocationClick = useCallback((coordinates: [number, number]) => {
    setMapCenter(coordinates)
    setMapZoom(15)
  }, [])

  // Обновление позиции слушателя при движении по карте
  const handleMapMove = useCallback((center: [number, number], zoom: number) => {
    setMapCenter(center)
    setMapZoom(zoom)
    setListenerPosition(center)
  }, [])

  // Обновление spatial audio для всех звуков
  const updateSpatialAudio = useCallback(() => {
    if (!isAudioInitialized || !spatialAudioEnabled) return

    sounds.forEach(sound => {
      // Обновляем позицию звука в 3D пространстве
      const worldPos = coordinatesToWorldPosition(sound.coordinates, listenerPosition)
      audioManager.updateSoundPosition(sound.id, worldPos[0], worldPos[1], worldPos[2])
      
      // Обновляем громкость на основе расстояния
      const distance = calculateDistance(listenerPosition, sound.coordinates)
      const volume = calculateSpatialVolume(distance, 1000) // 1000м макс расстояние
      audioManager.updateSoundVolume(sound.id, volume)
    })
  }, [sounds, listenerPosition, isAudioInitialized, spatialAudioEnabled])

  // Преобразование географических координат в мировые 3D координаты
  const coordinatesToWorldPosition = (
    soundCoords: [number, number], 
    listenerCoords: [number, number]
  ): [number, number, number] => {
    const scale = 100 // Масштаб для Web Audio API
    const deltaX = (soundCoords[0] - listenerCoords[0]) * scale
    const deltaY = (soundCoords[1] - listenerCoords[1]) * scale
    return [deltaX, 0, -deltaY] // Z инвертирован для правильной ориентации
  }

  // Расчет расстояния между точками
  const calculateDistance = (coord1: [number, number], coord2: [number, number]): number => {
    const R = 6371000 // Радиус Земли в метрах
    const dLat = ((coord2[1] - coord1[1]) * Math.PI) / 180
    const dLng = ((coord2[0] - coord1[0]) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coord1[1] * Math.PI) / 180) *
        Math.cos((coord2[1] * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Расчет громкости на основе расстояния
  const calculateSpatialVolume = (distance: number, maxDistance: number): number => {
    if (distance >= maxDistance) return 0
    return Math.max(0, 1 - (distance / maxDistance) ** 0.5)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <main className="relative h-screen overflow-hidden">
      <Header onAddSound={() => setIsUploadModalOpen(true)} />
      
      <div className="relative h-full">
        <MapComponent 
          sounds={sounds}
          onMarkerClick={handleSoundSelect}
          onMapClick={handleMapClick}
          onMapMove={handleMapMove}
          center={mapCenter}
          zoom={mapZoom}
        />
        
        <ControlPanel
          sounds={sounds}
          onSoundSelect={handleSoundSelect}
          onLocationClick={handleLocationClick}
          isOnline={isOnline}
        />

        {/* Spatial Audio Controller */}
        <SpatialAudioController
          enabled={spatialAudioEnabled}
          onToggle={setSpatialAudioEnabled}
          listenerPosition={listenerPosition}
          sounds={sounds}
          isAudioInitialized={isAudioInitialized}
        />
      </div>

      {selectedSound && (
        <AudioPlayer 
          sound={selectedSound}
          onClose={() => setSelectedSound(null)}
          spatialAudioEnabled={spatialAudioEnabled}
          listenerPosition={listenerPosition}
        />
      )}

      <SoundUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false)
          setClickedCoordinates(null)
        }}
        onSubmit={handleAddSound}
        defaultCoordinates={clickedCoordinates || undefined}
      />

      {/* Status indicators */}
      {!isOnline && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-30">
          Работаем в оффлайн режиме
        </div>
      )}

      {spatialAudioEnabled && isAudioInitialized && (
        <div className="fixed top-24 right-4 bg-green-500 text-white px-3 py-1 rounded-lg shadow-lg z-30 text-sm">
          🎧 Spatial Audio активен
        </div>
      )}
    </main>
  )
}
