import { SoundMarker } from '@/types/sound'

export function createSoundMarkerElement(sound: SoundMarker): HTMLElement {
  const element = document.createElement('div')
  element.className = 'sound-marker'
  
  // Определяем цвет маркера по категории тегов
  const getMarkerColor = (tags: string[]): string => {
    if (tags.some(tag => ['nature', 'птицы', 'вода', 'ветер'].includes(tag.toLowerCase()))) {
      return 'bg-green-500'
    }
    if (tags.some(tag => ['музыка', 'инструмент', 'пение'].includes(tag.toLowerCase()))) {
      return 'bg-purple-500'
    }
    if (tags.some(tag => ['город', 'транспорт', 'люди'].includes(tag.toLowerCase()))) {
      return 'bg-blue-500'
    }
    return 'bg-sound-primary'
  }

  const color = getMarkerColor(sound.tags)
  element.classList.add(color)

  // Анимация пульсации для активных звук��в
  if (sound.isPlaying) {
    element.classList.add('animate-pulse-slow')
  }

  // Иконка звука в центре
  element.innerHTML = `
    <div class="w-full h-full rounded-full flex items-center justify-center">
      <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
      </svg>
    </div>
  `

  // Добавляем подсказку
  element.title = `${sound.title} - ${sound.author}`
  element.style.cursor = 'pointer'

  return element
}

export function getDistanceBetweenPoints(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000 // Радиус Земли в метрах
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function calculateSpatialVolume(
  listenerCoords: [number, number],
  soundCoords: [number, number],
  maxDistance: number = 1000
): number {
  const distance = getDistanceBetweenPoints(
    listenerCoords[1],
    listenerCoords[0],
    soundCoords[1],
    soundCoords[0]
  )

  if (distance >= maxDistance) return 0

  // Логарифмическое затухание звука по расстоянию
  return Math.max(0, 1 - (distance / maxDistance) ** 0.5)
}

export function calculatePanPosition(
  listenerCoords: [number, number],
  soundCoords: [number, number]
): number {
  const deltaX = soundCoords[0] - listenerCoords[0]
  const deltaY = soundCoords[1] - listenerCoords[1]
  
  // Вычисляем угол для панорамирования (-1 = лево, 1 = право)
  const angle = Math.atan2(deltaY, deltaX)
  return Math.sin(angle)
}
