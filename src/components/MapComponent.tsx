'use client'

import React from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { SoundMarker } from '@/types/sound';

function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: any[]) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  } as T;
}

interface MapComponentProps {
  sounds: SoundMarker[];
  onMarkerClick: (sound: SoundMarker) => void;
  onMapClick: (coordinates: [number, number]) => void;
  onMapMove?: (center: [number, number], zoom: number) => void;
  center?: [number, number];
  zoom?: number;
}

const loadMapLibre = async () => {
  const maplibregl = await import('maplibre-gl');
  return maplibregl;
};

function MapComponent({
  sounds,
  onMarkerClick,
  onMapClick,
  onMapMove,
  center,
  zoom,
}: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  // Изменяем структуру для хранения маркеров по ID
  const markersRef = useRef<Map<string, any>>(new Map());
  const isCleaningUp = useRef(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  console.log('MapComponent rendered:', { soundsLength: sounds.length, isMapLoaded });

  const handleMapClick = useCallback(
    (e: any) => {
      if (isCleaningUp.current) return;
      const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      onMapClick(coordinates);
    },
    [onMapClick]
  );

  const handleMapMove = useCallback(
    debounce(() => {
      if (isCleaningUp.current || !mapInstance.current || !onMapMove) return;
      try {
        const center = mapInstance.current.getCenter();
        const zoom = mapInstance.current.getZoom();
        onMapMove([center.lng, center.lat], zoom);
      } catch (error) {}
    }, 100),
    [onMapMove]
  );

  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      try {
        if (!mapContainer.current || mapInstance.current || isCleaningUp.current) return;

        const maplibregl = await loadMapLibre();

        if (!mounted || !mapContainer.current) return;

        const map = new maplibregl.Map({
          container: mapContainer.current,
          style: {
            version: 8,
            sources: {
              osm: {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors',
              },
            },
            layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
          },
          center: [center?.[0] || 37.6176, center?.[1] || 55.7558],
          zoom: zoom || 10,
          renderWorldCopies: false,
        });

        if (!mounted) {
          map.remove();
          return;
        }

        mapInstance.current = map;
        map.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.on('click', handleMapClick);

        if (onMapMove) {
          map.on('moveend', handleMapMove);
        }

        map.on('load', () => {
          if (mounted && !isCleaningUp.current) {
            setIsMapLoaded(true);
            setMapError(null);
          }
        });

        map.on('error', (e) => {
          if (mounted && !isCleaningUp.current && !e.error?.message?.includes('AbortError')) {
            setMapError('Ошибка загрузки карты');
          }
        });
      } catch (error) {
        if (mounted && !isCleaningUp.current) {
          setMapError('Не удалось загрузить библиотеку карт');
        }
      }
    };

    initMap();

    return () => {
      mounted = false;
      isCleaningUp.current = true;
      if (mapInstance.current) {
        try {
          mapInstance.current.off('click', handleMapClick);
          if (onMapMove) mapInstance.current.off('moveend');
          mapInstance.current.off('load');
          mapInstance.current.off('error');
          
          // Очищаем все маркеры
          markersRef.current.forEach(marker => {
            try {
              marker.remove();
            } catch (e) {
              console.warn('Error removing marker during cleanup:', e);
            }
          });
          markersRef.current.clear();
          
          mapInstance.current.remove();
        } catch (error) {
          console.warn('Error during map cleanup:', error);
        }
        mapInstance.current = null;
        isCleaningUp.current = false;
      }
    };
  }, [handleMapClick, handleMapMove, center, zoom]);

  useEffect(() => {
    if (!mapInstance.current || !isMapLoaded || isCleaningUp.current) return;

    const updateMarkers = async () => {
      console.log('updateMarkers started:', performance.now());
      try {
        const maplibregl = await loadMapLibre();

        // Создаем Set с ID существующих звуков для быстрого поиска
        const currentSoundIds = new Set(sounds.map(sound => sound.id).filter(Boolean));
        
        // Удаляем маркеры, которых больше нет в списке звуков
         markersRef.current.forEach((marker, soundId) => {
          if (!currentSoundIds.has(soundId)) {
            try {
              marker.remove();
              markersRef.current.delete(soundId);
              console.log(`Removed marker with id: ${soundId}`);
            } catch (e) {
              console.warn('Error removing marker:', e);
            }
          }
        });

        // Обновляем или создаем маркеры для существующих звуков
        sounds.forEach((sound, index) => {
          if (isCleaningUp.current) return;
          
          // Используем ID звука или временный ID на основе индекса и координат
          const soundId = sound.id ?? `temp-${index}-${sound.coordinates.join('-')}`;

          const existingMarker = markersRef.current.get(soundId);
          
          if (existingMarker) {
            // Обновляем позицию существующего маркера если нужно
            const [lng, lat] = sound.coordinates;
            const currentLngLat = existingMarker.getLngLat();
            if (
              Math.abs(currentLngLat.lng - lng) > 0.0001 ||
              Math.abs(currentLngLat.lat - lat) > 0.0001
            ) {
              existingMarker.setLngLat(sound.coordinates);
              console.log(`Updated marker position for id: ${soundId}`);
            }
            return;
          }

          // Создаем новый маркер
          try {
            const markerDiv = document.createElement('div');
            markerDiv.className =
              'w-8 h-8 bg-blue-500 rounded-full border-2 border-white shadow-lg cursor-pointer flex items-center justify-center';
            markerDiv.innerHTML = '🎵';
            markerDiv.addEventListener('click', (e) => {
              e.stopPropagation();
              onMarkerClick(sound);
            });

            const marker = new maplibregl.Marker({ element: markerDiv })
              .setLngLat(sound.coordinates)
              .addTo(mapInstance.current);

            markersRef.current.set(soundId, marker);
            console.log(`Added new marker with id: ${soundId}`);
          } catch (error) {
            console.warn('Failed to add marker:', error);
          }
        });
      } catch (error) {
        console.warn('Failed to load MapLibre for markers:', error);
      }
      console.log('updateMarkers finished:', performance.now());
    };

    updateMarkers();
  }, [sounds, onMarkerClick, isMapLoaded]);

  if (mapError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🗺️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Карта недоступна</h3>
          <p className="text-gray-600 mb-4">{mapError}</p>
          <button
            onClick={() => {
              setMapError(null);
              window.location.reload();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Обновить страницу
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" style={{ minHeight: '400px' }} />
      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
          <div className="text-white text-center">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p>Загрузка MapLibre GL...</p>
          </div>
        </div>
      )}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          SoundMap
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">MapLibre GL</span>
        </h3>
        <p className="text-sm text-gray-600 mb-1">Звуков на карте: {sounds.length}</p>
        <p className="text-xs text-gray-500">Нажмите на карту, чтобы добавить новый звук</p>
        <p className="text-xs text-gray-400 mt-1">Данные карты: © OpenStreetMap</p>
      </div>
    </div>
  );
}

export default React.memo(MapComponent);