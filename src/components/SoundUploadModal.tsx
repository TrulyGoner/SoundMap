'use client'

import { useState, useRef, useCallback } from 'react'
import { X, Upload, Play, Pause, MapPin } from 'lucide-react'
import { AudioUploadData } from '@/types/sound'

interface SoundUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Omit<AudioUploadData, 'audioFile'> & { audioUrl: string; duration: number }) => void
  defaultCoordinates?: [number, number]
}

export function SoundUploadModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  defaultCoordinates 
}: SoundUploadModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    author: '',
    tags: '',
    coordinates: defaultCoordinates || [37.6176, 55.7558] as [number, number]
  })
  
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string>('')
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Проверяем тип файла
    if (!file.type.startsWith('audio/')) {
      setError('Пожалуйста, выберите аудиофайл')
      return
    }

    // Проверяем размер файла (максимум 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Размер файла не должен превышать 10MB')
      return
    }

    setError('')
    setAudioFile(file)
    
    // Создаем URL для предпросмотра
    const url = URL.createObjectURL(file)
    setAudioUrl(url)

    // Получаем длительность
    const audio = new Audio(url)
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration)
    })

    // Предзаполняем название если оно пустое
    if (!formData.title) {
      const fileName = file.name.replace(/\.[^/.]+$/, '') // Убираем расширени��
      setFormData(prev => ({ ...prev, title: fileName }))
    }
  }, [formData.title])

  const toggleAudioPreview = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!audioFile || !audioUrl) {
      setError('Пожалуйста, выберите аудиофайл')
      return
    }

    if (!formData.title.trim()) {
      setError('Пожалуйста, введите название')
      return
    }

    if (!formData.author.trim()) {
      setError('Пожалуйста, введите имя автора')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // В реальном приложении здесь был бы upload на сервер
      // Для демо используем локальный URL
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      onSubmit({
        title: formData.title.trim(),
        description: formData.description.trim(),
        author: formData.author.trim(),
        tags,
        coordinates: formData.coordinates,
        audioUrl,
        duration
      })

      // Сброс формы
      setFormData({
        title: '',
        description: '',
        author: '',
        tags: '',
        coordinates: defaultCoordinates || [37.6176, 55.7558]
      })
      setAudioFile(null)
      setAudioUrl('')
      setDuration(0)
      onClose()
    } catch (err) {
      setError('Произошла ошибка при загрузке звука')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCoordinateChange = (index: 0 | 1, value: string) => {
    const numValue = parseFloat(value)
    if (isNaN(numValue)) return
    
    const newCoords = [...formData.coordinates] as [number, number]
    newCoords[index] = numValue
    setFormData(prev => ({ ...prev, coordinates: newCoords }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Добавить звук</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Аудиофайл
            </label>
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-sound-primary transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="hidden"
              />
              
              {audioFile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <Upload className="w-5 h-5" />
                    <span className="font-medium">{audioFile.name}</span>
                  </div>
                  
                  {audioUrl && (
                    <div className="flex items-center justify-center gap-4">
                      <button
                        type="button"
                        onClick={toggleAudioPreview}
                        className="btn-primary px-4 py-2 gap-2"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {isPlaying ? 'Пауза' : 'Прослушать'}
                      </button>
                      
                      <span className="text-sm text-gray-600">
                        Длительность: {Math.round(duration)}с
                      </span>
                    </div>
                  )}
                  
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => setIsPlaying(false)}
                    preload="metadata"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <p className="text-gray-600">
                    Нажмите для выбора аудиофайла или перетащите сюда
                  </p>
                  <p className="text-sm text-gray-500">
                    Поддерживаются форматы: MP3, WAV, OGG (до 10MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sound-primary focus:border-transparent"
              placeholder="Например: Пение птиц в парке"
              maxLength={100}
            />
          </div>

          {/* Author */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Автор *
            </label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sound-primary focus:border-transparent"
              placeholder="Ваше имя"
              maxLength={50}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sound-primary focus:border-transparent resize-none"
              rows={3}
              placeholder="Опишите ваш звук..."
              maxLength={500}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Теги
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sound-primary focus:border-transparent"
              placeholder="п��ирода, птицы, релакс (разделяйте запятыми)"
            />
          </div>

          {/* Coordinates */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Координаты
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Долгота</label>
                <input
                  type="number"
                  step="any"
                  value={formData.coordinates[0]}
                  onChange={(e) => handleCoordinateChange(0, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sound-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Широта</label>
                <input
                  type="number"
                  step="any"
                  value={formData.coordinates[1]}
                  onChange={(e) => handleCoordinateChange(1, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sound-primary focus:border-transparent"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Нажмите на карту для автоматического заполнения координат
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading || !audioFile}
              className="flex-1 btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Загрузка...' : 'Добавить звук'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
