# SoundMap - Интерактивная карта звуков

SoundMap - это интерактивное веб-приложение для создания и исследования звуковых ландшафтов с помощью пространственного аудио и интерактивной карты.

##  Основные возможности

### Этап 1 - MVP (Реализовано)
- ✅ **Интерактивная карта** с MapLibre GL JS (open-source)
- ✅ **Размещение звуков** с привязкой к координатам
- ✅ **Загрузка аудио** через модальное окно
- ✅ **Предпросмотр звуков** с управлением воспроизведением
- ✅ **Метаданные звуков** (автор, теги, лайки)


### Этап 2 - Spatial Audio (В разработке)
-  **Пространственное позиционирование** звуков
-  **Плавное затухание** по расстоянию
-  **Динамическая панорама** на основе координат
-  **Кластеризация маркеров** для производительности

### Этап 3 - Расширенные фичи (Планируется)
-  **Генерация миксов маршрутов**
-  **Модерация контента**
-  **Экспорт аудио**

##  Архитектура

```
├── Frontend (Next.js + TypeScript)
│   ├── Map Rendering (MapLibre GL JS + OpenStreetMap)
│   ├── Audio Engine (Web Audio API)
│   ├── Offline Cache (IndexedDB/localForage)
│   └── UI Components (React + Tailwind)
│
├── Audio Pipeline
│   ├── AudioContext → PannerNode → GainNode → Output
│   ├── Spatial positioning based on coordinates
│   └── Real-time volume/pan calculation
│
└── Data Flow
    ├── SoundMarker (coordinates + metadata)
    ├── Cache Management (offline support)
    └── State Management (React hooks)
```

##  Запуск приложения

### Требования
- Node.js 18+
- npm или yarn


### Установка

1. Установите зависимости:
```bash
npm install
```

2. (Опционально) Настройте переменные окружения:
```bash
cp .env.local.example .env.local
```

3. Запустите сервер разработки:
```bash
npm run dev
```

4. Откройте http://localhost:3000

**Готово!** MapLibre GL JS работает с бесплатными картами OpenStreetMap без регистрации.

##  Технические особенности

### Web Audio API
- **PannerNode** для пространственного позиционирования
- **GainNode** для управления громкостью
- **Логарифмическое затухание** по расстоянию
- **HRTF панорамирование** для реалистичного звука

### Оффлайн кеширование
- **IndexedDB** для хранения аудио буферов
- **localForage** для удобной работы с кешем
- **Автоматическая очистка** устаревших файлов
- **Предзагрузка** ближайших звуков

### Spatial Audio алгоритм
```javascript
// Расчет громкости по расстоянию
volume = Math.max(0, 1 - (distance / maxDistance) ** 0.5)

// Расчет панорамы по углу
const angle = Math.atan2(deltaY, deltaX)
const pan = Math.sin(angle) // -1 (лево) до 1 (право)
```

## Интерфейс

### Основные компоненты
- **MapComponent** - интерактивная карта с маркерами
- **AudioPlayer** - плеер с элементами управления
- **SoundUploadModal** - форма загрузки новых звуков
- **ControlPanel** - боковая панель с настройками
- **SoundList** - список всех звуков с фильтрацией

### Возможности UI
- **Responsive дизайн** для всех устройств
- **Темная тема** карты для лучшего восприятия
- **Скелетоны** для плавной загрузки
- **Статусы соединения** (онлайн/оффлайн)


##  API и типы данных

### SoundMarker Interface
```typescript
interface SoundMarker {
  id: string
  title: string
  description?: string
  author: string
  coordinates: [number, number] // [lng, lat]
  audioUrl: string
  duration: number
  tags: string[]
  likes: number
  createdAt: string
}
```

### Spatial Audio Settings
```typescript
interface SpatialAudioSettings {
  maxDistance: number // метры
  rolloffFactor: number // коэффициент затухания
  distanceModel: DistanceModelType
  panningModel: PanningModelType
}
```

##  Планы развития

### Ближайшие обновления
1. **Улучшенный spatial audio** с более точным позиционированием
2. **Кластеризация маркеров** для карт с большим количеством звуков
3. **Система пользователей** с профилями и подписками
4. **API интеграция** для синхронизации между устройствами

### Долгосрочные цели
1. **Мобильное приложение** с нативным spatial audio
2. **VR/AR интеграция** для иммерсивного опыта
3. **AI генерация** звуковых ландшафтов
4. **Коллаборативные миксы** между пользователями

##  Лицензия

MIT License - см. файл LICENSE для деталей.

---

**SoundMap** - Превращаем мир в интерактивную звуковую карту 
