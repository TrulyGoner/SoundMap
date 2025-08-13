import { AudioContextState, SpatialAudioSettings } from '@/types/sound'

class AudioManager {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private pannerNodes: Map<string, PannerNode> = new Map()
  private gainNodes: Map<string, GainNode> = new Map()
  private audioBuffers: Map<string, AudioBuffer> = new Map()
  private activeSourceNodes: Map<string, AudioBufferSourceNode> = new Map()
  private isInitialized = false

  private spatialSettings: SpatialAudioSettings = {
    maxDistance: Number(process.env.NEXT_PUBLIC_MAX_AUDIO_DISTANCE) || 1000,
    rolloffFactor: 2,
    distanceModel: 'exponential',
    panningModel: 'HRTF'
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Создание AudioContext напрямую
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Создание мастер-узла громкости
      this.masterGain = this.audioContext.createGain()
      this.masterGain.connect(this.audioContext.destination)
      this.masterGain.gain.value = 0.7

      this.isInitialized = true
      console.log('Audio system initialized')
    } catch (error) {
      console.error('Failed to initialize audio system:', error)
      throw error
    }
  }

  async loadAudioBuffer(url: string, soundId: string): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('Audio context not initialized')

    // Проверяем кеш
    if (this.audioBuffers.has(soundId)) {
      return this.audioBuffers.get(soundId)!
    }

    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      
      this.audioBuffers.set(soundId, audioBuffer)
      return audioBuffer
    } catch (error) {
      console.error('Failed to load audio buffer:', error)
      throw error
    }
  }

  createSpatialSound(
    soundId: string,
    position: [number, number, number] = [0, 0, 0]
  ): { pannerNode: PannerNode; gainNode: GainNode } {
    if (!this.audioContext || !this.masterGain) {
      throw new Error('Audio context not initialized')
    }

    // Создаем узел панорамирования
    const pannerNode = this.audioContext.createPanner()
    pannerNode.panningModel = this.spatialSettings.panningModel
    pannerNode.distanceModel = this.spatialSettings.distanceModel
    pannerNode.maxDistance = this.spatialSettings.maxDistance
    pannerNode.rolloffFactor = this.spatialSettings.rolloffFactor
    pannerNode.coneInnerAngle = 360
    pannerNode.coneOuterAngle = 0
    pannerNode.coneOuterGain = 0

    // Устанавливаем позицию звука
    pannerNode.positionX.value = position[0]
    pannerNode.positionY.value = position[1]
    pannerNode.positionZ.value = position[2]

    // Создаем узел громкости для этого звука
    const gainNode = this.audioContext.createGain()
    gainNode.gain.value = 1

    // Соединяем: gain -> panner -> master -> destination
    gainNode.connect(pannerNode)
    pannerNode.connect(this.masterGain)

    this.pannerNodes.set(soundId, pannerNode)
    this.gainNodes.set(soundId, gainNode)

    return { pannerNode, gainNode }
  }

  async playSound(
    soundId: string,
    audioBuffer: AudioBuffer,
    loop: boolean = false,
    volume: number = 1
  ): Promise<void> {
    if (!this.audioContext) throw new Error('Audio context not initialized')

    // Останавливаем предыдущий звук если он играет
    this.stopSound(soundId)

    // Создаем spatial узлы, если они еще не существуют
    if (!this.pannerNodes.has(soundId) || !this.gainNodes.has(soundId)) {
      this.createSpatialSound(soundId)
    }

    // Получаем spatial узлы
    const spatialNodes = {
      pannerNode: this.pannerNodes.get(soundId)!,
      gainNode: this.gainNodes.get(soundId)!
    }

    // Создаем источник звука
    const sourceNode = this.audioContext.createBufferSource()
    sourceNode.buffer = audioBuffer
    sourceNode.loop = loop
    
    // Подключаем к spatial системе
    sourceNode.connect(spatialNodes.gainNode)
    
    // Устанавливаем громкость
    spatialNodes.gainNode.gain.value = volume

    // Запускаем воспроизведение
    sourceNode.start(0)
    this.activeSourceNodes.set(soundId, sourceNode)

    // Удаляем из активных при завершении
    sourceNode.onended = () => {
      this.activeSourceNodes.delete(soundId)
    }
  }

  stopSound(soundId: string): void {
    const sourceNode = this.activeSourceNodes.get(soundId)
    if (sourceNode) {
      try {
        sourceNode.stop()
      } catch (error) {
        // Игнорируем ошибки если звук уже остановлен
      }
      this.activeSourceNodes.delete(soundId)
    }
  }

  updateListenerPosition(x: number, y: number, z: number = 0): void {
    if (!this.audioContext) return

    const listener = this.audioContext.listener
    
    if (listener.positionX) {
      listener.positionX.value = x
      listener.positionY.value = y
      listener.positionZ.value = z
    } else {
      // Fallback для старых браузеров
      listener.setPosition(x, y, z)
    }
  }

  updateSoundPosition(soundId: string, x: number, y: number, z: number = 0): void {
    const pannerNode = this.pannerNodes.get(soundId)
    if (!pannerNode) return

    if (pannerNode.positionX) {
      pannerNode.positionX.value = x
      pannerNode.positionY.value = y
      pannerNode.positionZ.value = z
    } else {
      // Fallback для старых браузеров
      pannerNode.setPosition(x, y, z)
    }
  }

  updateSoundVolume(soundId: string, volume: number): void {
    const gainNode = this.gainNodes.get(soundId)
    if (gainNode) {
      gainNode.gain.setTargetAtTime(volume, this.audioContext!.currentTime, 0.1)
    }
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(volume, this.audioContext!.currentTime, 0.1)
    }
  }

  isPlaying(soundId: string): boolean {
    return this.activeSourceNodes.has(soundId)
  }

  stopAllSounds(): void {
    this.activeSourceNodes.forEach((sourceNode, soundId) => {
      this.stopSound(soundId)
    })
  }

  cleanup(): void {
    this.stopAllSounds()
    this.pannerNodes.clear()
    this.gainNodes.clear()
    this.audioBuffers.clear()
    this.activeSourceNodes.clear()
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
    }
    
    this.isInitialized = false
  }

  createAudioPlayer(url: string): Promise<AudioBufferSourceNode> {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(url)
        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer)

        const source = this.audioContext!.createBufferSource()
        source.buffer = audioBuffer
        source.connect(this.masterGain!)

        resolve(source)
      } catch (error) {
        reject(error)
      }
    })
  }
}

// Singleton 
export const audioManager = new AudioManager()

export async function initializeAudio(): Promise<void> {
  await audioManager.initialize()
}

export function getAudioManager(): AudioManager {
  return audioManager
}