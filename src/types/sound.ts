export interface SoundMarker {
  id: string
  title: string
  description?: string
  author: string
  coordinates: [number, number] // [lng, lat]
  audioUrl: string
  audioBuffer?: AudioBuffer
  duration: number
  tags: string[]
  likes: number
  createdAt: string
  volume?: number
  isPlaying?: boolean
}

export interface AudioContextState {
  context: AudioContext | null
  gainNode: GainNode | null
  pannerNodes: Map<string, PannerNode>
  isInitialized: boolean
}

export interface MapState {
  center: [number, number]
  zoom: number
  bearing: number
  pitch: number
}

export interface SpatialAudioSettings {
  maxDistance: number
  rolloffFactor: number
  distanceModel: DistanceModelType
  panningModel: PanningModelType
}

export interface AudioUploadData {
  title: string
  description?: string
  author: string
  tags: string[]
  audioFile: File
  coordinates: [number, number]
}
