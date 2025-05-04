"use client";

import { useState, useEffect, useCallback } from 'react';

// Helper function to safely access localStorage
function getStorageValue<T>(key: string, defaultValue: T): T {
  // Check if window is defined (runs only on client-side)
  if (typeof window === "undefined") {
    return defaultValue;
  }
  try {
    const saved = localStorage.getItem(key);
    // Attempt to parse, fallback to default if null or error
    return saved !== null ? JSON.parse(saved) : defaultValue;
  } catch (error) {
    console.error(`Error reading localStorage key “${key}”:`, error);
    return defaultValue;
  }
}

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  // Effect to load initial value from localStorage on mount (client-side only)
  useEffect(() => {
    setValue(getStorageValue(key, defaultValue));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // Only re-run if key changes (unlikely for this hook's usage)


  // Effect to update localStorage when value changes
  useEffect(() => {
    // Check if window is defined (runs only on client-side)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Error setting localStorage key “${key}”:`, error);
      }
    }
  }, [key, value]);

  // Effect to listen for storage events from other tabs/windows
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
           setValue(JSON.parse(event.newValue));
        } catch(error) {
          console.error(`Error parsing storage event value for key "${key}"`, error);
        }

      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);


  const setStoredValue = useCallback((newValue: T | ((val: T) => T)) => {
      setValue(newValue);
  }, []);


  return [value, setStoredValue];
}
