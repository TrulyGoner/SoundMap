'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Volume2, VolumeX, X, Heart, Share } from 'lucide-react'
import { SoundMarker } from '@/types/sound'
import { audioManager } from '@/utils/audioContext'

interface AudioPlayerProps {
  sound: SoundMarker
  onClose: () => void
  spatialAudioEnabled?: boolean
  listenerPosition?: [number, number]
}

export function AudioPlayer({
  sound,
  onClose,
  spatialAudioEnabled = false,
  listenerPosition
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.7)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const intervalRef = useRef<NodeJS.Timeout>()
  const audioBufferRef = useRef<AudioBuffer | null>(null)

  useEffect(() => {
    loadAudio()
    return () => {
      cleanup()
    }
  }, [sound.id]) // Only depend on sound.id to prevent loops

  const loadAudio = async () => {
    try {
      setError(null)
      setIsLoaded(false)

      // Простая инициализация без внешних зависимостей
      if (!audioBufferRef.current) {
        // Просто помечаем как загруженное для демонстрации UI
        setTimeout(() => {
          setIsLoaded(true)
        }, 500)
      }
    } catch (err) {
      console.error('Failed to load audio:', err)
      setError('Не удалось загрузить аудиофайл')
    }
  }

  const togglePlayback = async () => {
    try {
      if (isPlaying) {
        setIsPlaying(false)
        clearInterval(intervalRef.current)
      } else {
        // Демо режим - просто имитируем воспроизведение
        setIsPlaying(true)
        startTimeTracking()
      }
    } catch (err) {
      console.error('Playback error:', err)
      setError('Ошибка воспроизведения')
    }
  }

  // Преобразование координат для spatial audio
  const coordinatesToWorldPosition = (
    soundCoords: [number, number],
    listenerCoords: [number, number]
  ): [number, number, number] => {
    const scale = 100
    const deltaX = (soundCoords[0] - listenerCoords[0]) * scale
    const deltaY = (soundCoords[1] - listenerCoords[1]) * scale
    return [deltaX, 0, -deltaY]
  }

  const startTimeTracking = () => {
    setCurrentTime(0)
    intervalRef.current = setInterval(() => {
      setCurrentTime(prev => {
        const newTime = prev + 0.1
        if (newTime >= sound.duration) {
          setIsPlaying(false)
          clearInterval(intervalRef.current)
          return 0
        }
        return newTime
      })
    }, 100)
  }

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
    audioManager.updateSoundVolume(sound.id, newVolume)
  }

  const toggleMute = () => {
    const newVolume = volume > 0 ? 0 : 0.7
    handleVolumeChange(newVolume)
  }

  const cleanup = () => {
    audioManager.stopSound(sound.id)
    setIsPlaying(false)
    clearInterval(intervalRef.current)
  }

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

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

  const progressPercent = (currentTime / sound.duration) * 100

  return (
    <div className="fixed bottom-6 left-6 right-6 z-20">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{sound.title}</h3>
            <p className="text-gray-600 text-sm truncate">{sound.author}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 py-2">
          <div className="relative bg-gray-200 rounded-full h-1">
            <div 
              className="absolute top-0 left-0 h-full bg-sound-primary rounded-full transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(sound.duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlayback}
              disabled={!isLoaded}
              className="w-12 h-12 rounded-full bg-sound-primary text-white flex items-center justify-center hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </button>

            {isLoaded && (
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={toggleMute}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {volume > 0 ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-16 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`p-2 rounded-lg transition-colors ${
                isLiked ? 'text-red-500 bg-red-50' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            </button>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <Share className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tags and Info */}
        <div className="px-4 pb-4">
          {sound.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {sound.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Spatial Audio Info */}
          {spatialAudioEnabled && listenerPosition && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-800 text-sm font-medium mb-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                Spatial Audio активен
              </div>
              <div className="text-xs text-blue-600">
                Расстояние: {calculateDistance(listenerPosition, sound.coordinates).toFixed(0)}м
              </div>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="px-4 pb-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {!isLoaded && !error && (
          <div className="px-4 pb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-700 text-sm">Загрузка аудио...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
