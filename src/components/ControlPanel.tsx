'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, List, Map, Settings, Volume2, Wifi, WifiOff } from 'lucide-react'
import { SoundMarker } from '@/types/sound'
import { SoundList } from './SoundList'

interface ControlPanelProps {
  sounds: SoundMarker[]
  onSoundSelect: (sound: SoundMarker) => void
  onLocationClick: (coordinates: [number, number]) => void
  isOnline: boolean
}

export function ControlPanel({ 
  sounds, 
  onSoundSelect, 
  onLocationClick, 
  isOnline 
}: ControlPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [activeTab, setActiveTab] = useState<'sounds' | 'settings'>('sounds')
  const [spatialAudioEnabled, setSpatialAudioEnabled] = useState(true)
  const [masterVolume, setMasterVolume] = useState(0.7)

  return (
    <>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`fixed top-20 z-20 bg-white shadow-lg rounded-r-lg p-3 transition-all duration-300 ${
          isExpanded ? 'left-80' : 'left-0'
        }`}
      >
        {isExpanded ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>

      <div className={`fixed left-0 top-0 bottom-0 z-10 bg-white shadow-xl transition-transform duration-300 ${
        isExpanded ? 'translate-x-0' : '-translate-x-full'
      }`} style={{ width: '320px' }}>
        
        <div className="h-20 border-b border-gray-200 flex items-center justify-between px-6">
          <h2 className="text-xl font-bold text-gray-900">Панель управления</h2>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-500" aria-label="Онлайн" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" aria-label="Оффлайн" />
            )}
          </div>
        </div>

        
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('sounds')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'sounds'
                  ? 'text-sound-primary border-b-2 border-sound-primary bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4 inline mr-2" />
              Звуки ({sounds.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'text-sound-primary border-b-2 border-sound-primary bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Настройки
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'sounds' ? (
            <SoundList
              sounds={sounds}
              onSoundSelect={onSoundSelect}
              onLocationClick={onLocationClick}
            />
          ) : (
            <SettingsPanel
              spatialAudioEnabled={spatialAudioEnabled}
              onSpatialAudioToggle={setSpatialAudioEnabled}
              masterVolume={masterVolume}
              onVolumeChange={setMasterVolume}
              isOnline={isOnline}
            />
          )}
        </div>
      </div>
    </>
  )
}

interface SettingsPanelProps {
  spatialAudioEnabled: boolean
  onSpatialAudioToggle: (enabled: boolean) => void
  masterVolume: number
  onVolumeChange: (volume: number) => void
  isOnline: boolean
}

function SettingsPanel({
  spatialAudioEnabled,
  onSpatialAudioToggle,
  masterVolume,
  onVolumeChange,
  isOnline
}: SettingsPanelProps) {
  const [autoCache, setAutoCache] = useState(false)
  const [maxDistance, setMaxDistance] = useState(1000)
  const [maxConcurrentSounds, setMaxConcurrentSounds] = useState(8)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Аудио настройки</h3>
        
        <div className="space-y-4">
          <div>
            <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
              <span className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Общая громкость
              </span>
              <span>{Math.round(masterVolume * 100)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={masterVolume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Пространственный звук
            </label>
            <button
              onClick={() => onSpatialAudioToggle(!spatialAudioEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                spatialAudioEnabled ? 'bg-sound-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  spatialAudioEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
              <span>Макс. расстояние звука</span>
              <span>{maxDistance}м</span>
            </label>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={maxDistance}
              onChange={(e) => setMaxDistance(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          <div>
            <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
              <span>Макс. одновременных звуков</span>
              <span>{maxConcurrentSounds}</span>
            </label>
            <input
              type="range"
              min="1"
              max="16"
              step="1"
              value={maxConcurrentSounds}
              onChange={(e) => setMaxConcurrentSounds(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Кеш и оффлайн</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Автоматическое кеширование
              </label>
              <p className="text-xs text-gray-500">
                Загружать звуки рядом с вами
              </p>
            </div>
            <button
              onClick={() => setAutoCache(!autoCache)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoCache ? 'bg-sound-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoCache ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Кешировано звуков:</span>
              <span className="font-medium">12 / 50</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-gray-600">Размер кеша:</span>
              <span className="font-medium">25 МБ</span>
            </div>
            <button className="text-red-600 text-sm mt-2 hover:text-red-700">
              Очистить кеш
            </button>
          </div>

          <div className={`rounded-lg p-3 ${
            isOnline ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-green-600" />
                  <span className="text-green-800 text-sm font-medium">Подключение активно</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-600" />
                  <span className="text-red-800 text-sm font-medium">Работаем оффлайн</span>
                </>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {isOnline 
                ? 'Все функции доступны' 
                : 'Доступны только кешированные звуки'
              }
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Карта</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Стиль карты
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-sound-primary focus:border-transparent">
              <option value="dark">Темная</option>
              <option value="light">Светлая</option>
              <option value="streets">Улицы</option>
              <option value="satellite">Спутник</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Показывать радиус звука
            </label>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-sound-primary">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">О приложении</h3>
        <p className="text-sm text-gray-600 mb-2">
          SoundMap v1.0.0 - Интерактивная карта звуков с пространственным аудио
        </p>
        <p className="text-xs text-gray-500">
          Создано с использованием Next.js, Mapbox GL, Web Audio API и Tone.js
        </p>
      </div>
    </div>
  )
}
