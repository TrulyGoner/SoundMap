'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Volume2, VolumeX, Headphones, Settings, MapPin, Radar } from 'lucide-react'
import { SoundMarker } from '@/types/sound'

type DistanceModelType = 'linear' | 'inverse' | 'exponential'

interface SpatialAudioControllerProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  listenerPosition: [number, number]
  sounds: SoundMarker[]
  isAudioInitialized: boolean
  onSettingsChange?: (settings: SpatialAudioSettings) => void
}

interface SpatialAudioSettings {
  maxDistance: number
  rolloffFactor: number
  masterVolume: number
  distanceModel: DistanceModelType
}

interface NearbySoundItem {
  sound: SoundMarker
  distance: number
  volume: number
}

let audioManager: any = null 

export function SpatialAudioController({
  enabled,
  onToggle,
  listenerPosition,
  sounds,
  isAudioInitialized,
  onSettingsChange,
}: SpatialAudioControllerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [maxDistance, setMaxDistance] = useState(1000)
  const [rolloffFactor, setRolloffFactor] = useState(2)
  const [masterVolume, setMasterVolume] = useState(0.7)
  const [distanceModel, setDistanceModel] = useState<DistanceModelType>('exponential')

  const calculateDistance = (coord1: [number, number], coord2: [number, number]): number => {
    const R = 6371000 
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

  const calculateVolumeByDistance = (
    distance: number,
    maxDist: number,
    model: DistanceModelType,
    rolloff: number
  ): number => {
    if (distance >= maxDist) return 0
    const normalizedDistance = distance / maxDist
    switch (model) {
      case 'linear':
        return Math.max(0, 1 - normalizedDistance)
      case 'inverse':
        return Math.max(0, 1 / (1 + rolloff * normalizedDistance))
      case 'exponential':
        return Math.max(0, Math.pow(1 - normalizedDistance, rolloff))
      default:
        return 1 - normalizedDistance
    }
  }

  const nearbySounds = useMemo((): NearbySoundItem[] => {
    const soundsMap = new Map<string, NearbySoundItem>()
    sounds.forEach(sound => {
      const distance = calculateDistance(listenerPosition, sound.coordinates)
      const volume = calculateVolumeByDistance(distance, maxDistance, distanceModel, rolloffFactor)
      if (distance <= maxDistance && volume > 0) {
        soundsMap.set(sound.id, { sound, distance, volume })
      }
    })
    return Array.from(soundsMap.values())
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5) 
  }, [listenerPosition[0], listenerPosition[1], sounds, maxDistance, distanceModel, rolloffFactor])

  useEffect(() => {
    if (enabled && onSettingsChange) {
      onSettingsChange({
        maxDistance,
        rolloffFactor,
        masterVolume,
        distanceModel,
      })
    }
  }, [enabled, maxDistance, rolloffFactor, masterVolume, distanceModel, onSettingsChange])

  useEffect(() => {
    if (!enabled || !isAudioInitialized) return
    try {
      if (audioManager && audioManager.updateSpatialSettings) {
        audioManager.updateSpatialSettings({
          maxDistance,
          rolloffFactor,
          distanceModel,
          masterVolume,
          listenerPosition,
        })
      } else if (audioManager && audioManager.setSpatialSettings) {
        audioManager.setSpatialSettings({
          maxDistance,
          rolloffFactor,
          distanceModel,
          masterVolume,
          listenerPosition,
        })
      }
    } catch (error) {
      console.warn('Failed to update spatial audio settings:', error)
    }
  }, [enabled, isAudioInitialized, maxDistance, rolloffFactor, distanceModel, masterVolume, listenerPosition])

  const formatDistance = (distance: number): string => {
    if (distance < 1000) {
      return `${Math.round(distance)}м`
    }
    return `${(distance / 1000).toFixed(1)}км`
  }

  const handleVolumeChange = useCallback((volume: number) => {
    setMasterVolume(volume)
    try {
      if (audioManager && audioManager.setMasterVolume) {
        audioManager.setMasterVolume(volume)
      } else if (audioManager && audioManager.setVolume) {
        audioManager.setVolume(volume)
      }
    } catch (error) {
      console.warn('Failed to update master volume:', error)
    }
  }, [])

  const handleMaxDistanceChange = useCallback((distance: number) => {
    setMaxDistance(distance)
  }, [])

  const handleRolloffChange = useCallback((rolloff: number) => {
    setRolloffFactor(rolloff)
  }, [])

  const handleDistanceModelChange = useCallback((model: DistanceModelType) => {
    setDistanceModel(model)
  }, [])

  const handleToggle = useCallback(
    (newEnabled: boolean) => {
      onToggle(newEnabled)
      if (!newEnabled) {
        try {
          if (audioManager && audioManager.stopAllSpatialAudio) {
            audioManager.stopAllSpatialAudio()
          } else if (audioManager && audioManager.stopAll) {
            audioManager.stopAll()
          } else if (audioManager && audioManager.pause) {
            audioManager.pause()
          }
        } catch (error) {
          console.warn('Failed to stop spatial audio:', error)
        }
      }
    },
    [onToggle]
  )

  return (
    <div className="fixed bottom-20 right-4 z-20">
      <button
        onClick={() => handleToggle(!enabled)}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 mb-3 ${
          enabled ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
        aria-label={enabled ? 'Отключить пространственное аудио' : 'Включить пространственное аудио'}
      >
        <Headphones className="w-6 h-6" />
      </button>

      {enabled && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-all duration-300 mb-3"
          aria-label={isExpanded ? 'Скрыть настройки' : 'Показать настройки'}
        >
          <Settings className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      )}

      {enabled && isExpanded && (
        <div className="bg-white rounded-lg shadow-xl p-4 w-80 mb-3 max-h-96 overflow-y-auto">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Headphones className="w-5 h-5" />
            Spatial Audio Settings
          </h3>

          <div className="mb-4">
            <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
              <span className="flex items-center gap-2">
                {masterVolume > 0 ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                Общая громкость
              </span>
              <span>{Math.round(masterVolume * 100)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={masterVolume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="slider w-full"
              aria-label="Общая громкость"
            />
          </div>

          <div className="mb-4">
            <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
              <span>Макс. расстояние</span>
              <span>{formatDistance(maxDistance)}</span>
            </label>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={maxDistance}
              onChange={(e) => handleMaxDistanceChange(parseInt(e.target.value))}
              className="slider w-full"
              aria-label="Максимальное расстояние"
            />
          </div>

          <div className="mb-4">
            <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
              <span>Коэффициент затухания</span>
              <span>{rolloffFactor.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={rolloffFactor}
              onChange={(e) => handleRolloffChange(parseFloat(e.target.value))}
              className="slider w-full"
              aria-label="Коэффициент затухания"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Модель расстояния</label>
            <select
              value={distanceModel}
              onChange={(e) => handleDistanceModelChange(e.target.value as DistanceModelType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Модель расстояния"
            >
              <option value="linear">Линейная</option>
              <option value="inverse">Обратная</option>
              <option value="exponential">Экспоненциальная</option>
            </select>
          </div>

          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-1">
              <MapPin className="w-4 h-4" />
              Позиция слушателя
            </div>
            <div className="text-xs text-blue-600 font-mono">
              {listenerPosition[1].toFixed(4)}, {listenerPosition[0].toFixed(4)}
            </div>
          </div>

          {nearbySounds.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Radar className="w-4 h-4" />
                Звуки поблизости ({nearbySounds.length})
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {nearbySounds.map(({ sound, distance, volume }) => (
                  <div
                    key={`nearby-${sound.id}-${distance.toFixed(0)}`}
                    className="flex items-center justify-between text-xs bg-gray-50 rounded p-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{sound.title}</div>
                      <div className="text-gray-500 truncate">{sound.author}</div>
                    </div>
                    <div className="ml-2 text-right">
                      <div className="font-medium">{formatDistance(distance)}</div>
                      <div className="text-gray-500">{Math.round(volume * 100)}% vol</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            className={`p-3 rounded-lg ${
              isAudioInitialized ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
            }`}
          >
            <div className="flex items-center gap-2 text-sm">
              {isAudioInitialized ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-800 font-medium">Аудио система активна</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-yellow-800 font-medium">Ожидание инициализации</span>
                </>
              )}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Звуков в радиусе: {nearbySounds.length} / {sounds.length}
            </div>
          </div>
        </div>
      )}

      {enabled && !isExpanded && (
        <div className="bg-white rounded-lg shadow-lg p-3 w-48">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isAudioInitialized ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
                }`}
              ></div>
              <span className="font-medium">Spatial Audio</span>
            </div>
            <span className="text-gray-500">{nearbySounds.length} поблизости</span>
          </div>
          {nearbySounds.length > 0 && (
            <div className="mt-2 text-xs text-gray-600">
              Ближайший: {nearbySounds[0]?.sound.title}
              <span className="ml-1 font-medium">({formatDistance(nearbySounds[0]?.distance)})</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}