import { useState, useEffect, useCallback } from 'react';
import type { SavedLocation } from '../types/weather';

const STORAGE_KEY = 'nl-weather-locations';
const SELECTED_KEY = 'nl-weather-selected-location';

function loadLocations(): SavedLocation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadSelectedId(): string | null {
  try {
    return localStorage.getItem(SELECTED_KEY);
  } catch {
    return null;
  }
}

export function useLocations(serverDefault: { latitude: number; longitude: number; locationName: string; province: string } | null) {
  const [locations, setLocations] = useState<SavedLocation[]>(loadLocations);
  const [selectedId, setSelectedId] = useState<string | null>(loadSelectedId);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
  }, [locations]);

  useEffect(() => {
    if (selectedId) {
      localStorage.setItem(SELECTED_KEY, selectedId);
    } else {
      localStorage.removeItem(SELECTED_KEY);
    }
  }, [selectedId]);

  const selectedLocation: SavedLocation | null =
    locations.find((l) => l.id === selectedId) ??
    locations[0] ??
    (serverDefault
      ? {
          id: '__default__',
          name: serverDefault.locationName,
          latitude: serverDefault.latitude,
          longitude: serverDefault.longitude,
          province: serverDefault.province,
        }
      : null);

  const addLocation = useCallback((loc: Omit<SavedLocation, 'id'>) => {
    const newLoc: SavedLocation = { ...loc, id: crypto.randomUUID() };
    setLocations((prev) => [...prev, newLoc]);
    setSelectedId(newLoc.id);
  }, []);

  const removeLocation = useCallback((id: string) => {
    setLocations((prev) => prev.filter((l) => l.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  const selectLocation = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const updateGpsLocation = useCallback((latitude: number, longitude: number) => {
    setLocations((prev) => {
      const existing = prev.find((l) => l.isGps);
      if (existing) {
        // Select existing GPS location immediately
        setSelectedId(existing.id);
        return prev.map((l) =>
          l.isGps ? { ...l, latitude, longitude } : l
        );
      }
      const gpsLoc: SavedLocation = {
        id: crypto.randomUUID(),
        name: 'Huidige locatie',
        latitude,
        longitude,
        isGps: true,
      };
      // Select new GPS location immediately
      setSelectedId(gpsLoc.id);
      return [gpsLoc, ...prev];
    });
  }, []);

  return {
    locations,
    selectedLocation,
    addLocation,
    removeLocation,
    selectLocation,
    updateGpsLocation,
  };
}
