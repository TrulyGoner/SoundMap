import localforage from 'localforage'
import { SoundMarker } from '@/types/sound'

// Конфигурация localForage
const audioCache = localforage.createInstance({
  name: 'SoundMapAudio',
  storeName: 'audioFiles',
  description: 'Кеш аудиофайлов для оффлайн воспроизведения'
})

const metadataCache = localforage.createInstance({
  name: 'SoundMapMetadata',
  storeName: 'soundMetadata',
  description: 'Метаданные звуков'
})

const settingsCache = localforage.createInstance({
  name: 'SoundMapSettings',
  storeName: 'userSettings',
  description: 'Пользовательские настройки'
})

export interface CacheSettings {
  maxCacheSize: number // в МБ
  maxCacheAge: number // в днях
  autoDownload: boolean
  preloadNearby: boolean
  maxDistance: number // метры для preload
}

export interface CacheItem {
  id: string
  audioBuffer: ArrayBuffer
  cachedAt: number
  size: number
  lastAccessed: number
}

export interface CacheStats {
  totalSize: number
  itemCount: number
  oldestItem: number
  newestItem: number
}

class CacheManager {
  private maxCacheSize = 50 * 1024 * 1024 // 50MB по умолчанию
  private maxCacheAge = 7 * 24 * 60 * 60 * 1000 // 7 дней
  
  async initialize(): Promise<void> {
    try {
      // Загружаем настройки кеша
      const settings = await this.getSettings()
      this.maxCacheSize = settings.maxCacheSize * 1024 * 1024
      this.maxCacheAge = settings.maxCacheAge * 24 * 60 * 60 * 1000
      
      // Очищаем устаревшие элементы
      await this.cleanupExpiredItems()
      
      console.log('Cache manager initialized')
    } catch (error) {
      console.error('Failed to initialize cache manager:', error)
    }
  }

  // Кеширование аудиофайлов
  async cacheAudioFile(soundId: string, audioUrl: string): Promise<boolean> {
    try {
      // Проверяем, есть ли уже в кеше
      const existing = await audioCache.getItem<CacheItem>(soundId)
      if (existing) {
        // Обновляем время последнего доступа
        existing.lastAccessed = Date.now()
        await audioCache.setItem(soundId, existing)
        return true
      }

      // Загружаем файл
      const response = await fetch(audioUrl)
      if (!response.ok) throw new Error('Failed to fetch audio file')
      
      const arrayBuffer = await response.arrayBuffer()
      const size = arrayBuffer.byteLength

      // Проверяем лимиты кеша
      if (!(await this.canCacheItem(size))) {
        console.warn('Cannot cache item: size limit exceeded')
        return false
      }

      // Создаем запись в кеше
      const cacheItem: CacheItem = {
        id: soundId,
        audioBuffer: arrayBuffer,
        cachedAt: Date.now(),
        size,
        lastAccessed: Date.now()
      }

      await audioCache.setItem(soundId, cacheItem)
      
      // Очищаем кеш если превышен лимит
      await this.enforceStorageLimit()
      
      return true
    } catch (error) {
      console.error('Failed to cache audio file:', error)
      return false
    }
  }

  async getCachedAudioBuffer(soundId: string): Promise<ArrayBuffer | null> {
    try {
      const cacheItem = await audioCache.getItem<CacheItem>(soundId)
      if (!cacheItem) return null

      // Обновляем время последнего доступа
      cacheItem.lastAccessed = Date.now()
      await audioCache.setItem(soundId, cacheItem)

      return cacheItem.audioBuffer
    } catch (error) {
      console.error('Failed to get cached audio buffer:', error)
      return null
    }
  }

  async isCached(soundId: string): Promise<boolean> {
    try {
      const item = await audioCache.getItem<CacheItem>(soundId)
      return item !== null
    } catch (error) {
      return false
    }
  }

  // Кеширование метаданных звуков
  async cacheSoundMetadata(sounds: SoundMarker[]): Promise<void> {
    try {
      const metadata = {
        sounds,
        cachedAt: Date.now()
      }
      await metadataCache.setItem('soundList', metadata)
    } catch (error) {
      console.error('Failed to cache sound metadata:', error)
    }
  }

  async getCachedSoundMetadata(): Promise<SoundMarker[] | null> {
    try {
      const metadata = await metadataCache.getItem<{
        sounds: SoundMarker[]
        cachedAt: number
      }>('soundList')
      
      if (!metadata) return null
      
      // Проверяем возраст кеша (обновляем каждые 30 минут)
      const maxAge = 30 * 60 * 1000 // 30 минут
      if (Date.now() - metadata.cachedAt > maxAge) {
        return null
      }
      
      return metadata.sounds
    } catch (error) {
      console.error('Failed to get cached sound metadata:', error)
      return null
    }
  }

  // Настройки кеша
  async getSettings(): Promise<CacheSettings> {
    try {
      const settings = await settingsCache.getItem<CacheSettings>('cacheSettings')
      return settings || {
        maxCacheSize: 50,
        maxCacheAge: 7,
        autoDownload: false,
        preloadNearby: true,
        maxDistance: 1000
      }
    } catch (error) {
      return {
        maxCacheSize: 50,
        maxCacheAge: 7,
        autoDownload: false,
        preloadNearby: true,
        maxDistance: 1000
      }
    }
  }

  async updateSettings(settings: CacheSettings): Promise<void> {
    try {
      await settingsCache.setItem('cacheSettings', settings)
      this.maxCacheSize = settings.maxCacheSize * 1024 * 1024
      this.maxCacheAge = settings.maxCacheAge * 24 * 60 * 60 * 1000
    } catch (error) {
      console.error('Failed to update cache settings:', error)
    }
  }

  // Статистика кеша
  async getCacheStats(): Promise<CacheStats> {
    try {
      const keys = await audioCache.keys()
      let totalSize = 0
      let oldestItem = Date.now()
      let newestItem = 0
      
      for (const key of keys) {
        const item = await audioCache.getItem<CacheItem>(key)
        if (item) {
          totalSize += item.size
          oldestItem = Math.min(oldestItem, item.cachedAt)
          newestItem = Math.max(newestItem, item.cachedAt)
        }
      }
      
      return {
        totalSize,
        itemCount: keys.length,
        oldestItem,
        newestItem
      }
    } catch (error) {
      console.error('Failed to get cache stats:', error)
      return {
        totalSize: 0,
        itemCount: 0,
        oldestItem: 0,
        newestItem: 0
      }
    }
  }

  // Очистка кеша
  async clearCache(): Promise<void> {
    try {
      await audioCache.clear()
      await metadataCache.clear()
      console.log('Cache cleared')
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }

  async removeCachedSound(soundId: string): Promise<void> {
    try {
      await audioCache.removeItem(soundId)
    } catch (error) {
      console.error('Failed to remove cached sound:', error)
    }
  }

  // Приватные методы
  private async canCacheItem(size: number): Promise<boolean> {
    const stats = await this.getCacheStats()
    return (stats.totalSize + size) <= this.maxCacheSize
  }

  private async enforceStorageLimit(): Promise<void> {
    const stats = await this.getCacheStats()
    
    if (stats.totalSize <= this.maxCacheSize) return

    // Получаем все элементы и сортируем по времени последнего доступа
    const keys = await audioCache.keys()
    const items: Array<{ key: string; item: CacheItem }> = []
    
    for (const key of keys) {
      const item = await audioCache.getItem<CacheItem>(key)
      if (item) {
        items.push({ key, item })
      }
    }
    
    // Сортируем по времени последнего доступа (старые первыми)
    items.sort((a, b) => a.item.lastAccessed - b.item.lastAccessed)
    
    // Удаляем старые элементы пока не освободим достаточно места
    let freedSpace = 0
    const targetSpace = stats.totalSize - this.maxCacheSize + (this.maxCacheSize * 0.1) // Освобождаем +10%
    
    for (const { key } of items) {
      await audioCache.removeItem(key)
      freedSpace += items.find(item => item.key === key)?.item.size || 0
      
      if (freedSpace >= targetSpace) break
    }
  }

  private async cleanupExpiredItems(): Promise<void> {
    try {
      const keys = await audioCache.keys()
      const now = Date.now()
      
      for (const key of keys) {
        const item = await audioCache.getItem<CacheItem>(key)
        if (item && (now - item.cachedAt) > this.maxCacheAge) {
          await audioCache.removeItem(key)
        }
      }
    } catch (error) {
      console.error('Failed to cleanup expired items:', error)
    }
  }

  // Предзагрузка ближайших звуков
  async preloadNearby(
    userCoords: [number, number], 
    sounds: SoundMarker[], 
    maxDistance: number = 1000
  ): Promise<void> {
    const settings = await this.getSettings()
    if (!settings.preloadNearby) return

    const nearbySounds = sounds.filter(sound => {
      const distance = this.calculateDistance(userCoords, sound.coordinates)
      return distance <= maxDistance
    })

    // Кешируем ближайшие звуки в фоне
    for (const sound of nearbySounds.slice(0, 5)) { // Максимум 5 звуков
      if (!(await this.isCached(sound.id))) {
        this.cacheAudioFile(sound.id, sound.audioUrl).catch(console.error)
      }
    }
  }

  private calculateDistance(coord1: [number, number], coord2: [number, number]): number {
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
}

// Singleton instance
export const cacheManager = new CacheManager()

// Utility functions
export async function initializeCache(): Promise<void> {
  await cacheManager.initialize()
}

export function getCacheManager(): CacheManager {
  return cacheManager
}
