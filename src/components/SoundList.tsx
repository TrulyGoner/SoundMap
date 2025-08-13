'use client'

import { useState } from 'react'
import { Play, Heart, MapPin, Clock, User, Tag } from 'lucide-react'
import { SoundMarker } from '@/types/sound'
import { SoundCardSkeleton } from './LoadingSpinner'

interface SoundListProps {
  sounds: SoundMarker[]
  onSoundSelect: (sound: SoundMarker) => void
  onLocationClick: (coordinates: [number, number]) => void
  isLoading?: boolean
}

export function SoundList({ sounds, onSoundSelect, onLocationClick, isLoading }: SoundListProps) {
  const [filter, setFilter] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'likes' | 'duration'>('date')

  const filteredAndSortedSounds = sounds
    .filter(sound => 
      sound.title.toLowerCase().includes(filter.toLowerCase()) ||
      sound.author.toLowerCase().includes(filter.toLowerCase()) ||
      sound.tags.some(tag => tag.toLowerCase().includes(filter.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'likes':
          return b.likes - a.likes
        case 'duration':
          return b.duration - a.duration
        case 'date':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SoundCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters and Sort */}
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Поиск по названию, автору или тегам..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sound-primary focus:border-transparent"
        />
        
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'likes' | 'duration')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sound-primary focus:border-transparent"
          >
            <option value="date">По дате</option>
            <option value="likes">По популярности</option>
            <option value="duration">По длительности</option>
          </select>
          
          <div className="flex-1 text-right text-sm text-gray-500 py-2">
            {filteredAndSortedSounds.length} из {sounds.length} звуков
          </div>
        </div>
      </div>

      {/* Sound List */}
      <div className="space-y-3">
        {filteredAndSortedSounds.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {filter ? 'Ничего не найдено' : 'Пока нет звуков'}
          </div>
        ) : (
          filteredAndSortedSounds.map((sound) => (
            <SoundCard
              key={sound.id}
              sound={sound}
              onPlay={() => onSoundSelect(sound)}
              onLocationClick={() => onLocationClick(sound.coordinates)}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface SoundCardProps {
  sound: SoundMarker
  onPlay: () => void
  onLocationClick: () => void
}

function SoundCard({ sound, onPlay, onLocationClick }: SoundCardProps) {
  const [isLiked, setIsLiked] = useState(false)

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Play Button */}
        <button
          onClick={onPlay}
          className="w-12 h-12 rounded-full bg-sound-primary text-white flex items-center justify-center hover:bg-blue-600 transition-colors flex-shrink-0"
        >
          <Play className="w-5 h-5 ml-0.5" />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title and Author */}
          <div className="mb-2">
            <h3 className="font-semibold text-lg text-gray-900 truncate">
              {sound.title}
            </h3>
            <div className="flex items-center gap-1 text-gray-600 text-sm">
              <User className="w-3 h-3" />
              <span>{sound.author}</span>
            </div>
          </div>

          {/* Description */}
          {sound.description && (
            <p className="text-gray-700 text-sm mb-3 line-clamp-2">
              {sound.description}
            </p>
          )}

          {/* Tags */}
          {sound.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {sound.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
              {sound.tags.length > 3 && (
                <span className="text-xs text-gray-500 py-1">
                  +{sound.tags.length - 3} еще
                </span>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatDuration(sound.duration)}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                <span>{sound.likes}</span>
              </div>
              
              <span>{formatDate(sound.createdAt)}</span>
            </div>

            <button
              onClick={onLocationClick}
              className="flex items-center gap-1 text-sound-primary hover:text-blue-600 transition-colors"
            >
              <MapPin className="w-3 h-3" />
              <span>На карте</span>
            </button>
          </div>
        </div>

        {/* Like Button */}
        <button
          onClick={() => setIsLiked(!isLiked)}
          className={`p-2 rounded-lg transition-colors ${
            isLiked 
              ? 'text-red-500 bg-red-50 hover:bg-red-100' 
              : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
          }`}
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
        </button>
      </div>
    </div>
  )
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays === 1) {
    return 'вчера'
  } else if (diffDays < 7) {
    return `${diffDays} дн. назад`
  } else {
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  }
}
