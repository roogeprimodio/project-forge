
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
    // In case of parsing error, return default value to prevent breaking the app
    localStorage.removeItem(key); // Clean up corrupted data
    return defaultValue;
  }
}

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Initialize state with defaultValue initially, useEffect will load from storage client-side
  const [value, setValue] = useState<T>(() => defaultValue);

  // Effect to load initial value from localStorage on mount (client-side only)
  useEffect(() => {
    // Ensure this runs only once on mount client-side
    setValue(getStorageValue(key, defaultValue));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // Only depend on key

  // Effect to update localStorage when value changes
  useEffect(() => {
    // Check if window is defined (runs only on client-side)
    if (typeof window !== "undefined") {
      try {
        // Prevent storing the initial defaultValue if it hasn't been updated yet by the load effect
        // This check might be redundant if the initial state is set correctly, but adds safety
        const currentValueInStorage = localStorage.getItem(key);
        const newValueString = JSON.stringify(value);
        // Only write if the value is different or if storage is empty (initial set)
        if (currentValueInStorage !== newValueString) {
            localStorage.setItem(key, newValueString);
        }
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
      // Check if the change involves the key this hook is managing
      if (event.key === key) {
        if (event.newValue !== null) {
          // Item updated or added in another tab
          try {
             const newValueParsed = JSON.parse(event.newValue);
             // Update state only if the parsed new value differs from the current state
             // This prevents unnecessary re-renders if the value is technically the same
             setValue(currentVal => {
                 if (JSON.stringify(currentVal) !== event.newValue) {
                     return newValueParsed;
                 }
                 return currentVal;
             });
          } catch(error) {
            console.error(`Error parsing storage event value for key "${key}"`, error);
            // If parsing fails, revert to reading directly from storage as a fallback
            setValue(getStorageValue(key, defaultValue));
          }
        } else {
          // Item deleted or cleared in another tab (event.newValue is null)
          // Update the state to reflect the deletion, typically by setting it to the default value
          setValue(defaultValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, defaultValue]); // Include defaultValue in dependencies


  // useCallback ensures the setter function has a stable identity
  const setStoredValue = useCallback((newValue: T | ((val: T) => T)) => {
      // Allow functional updates like useState
      setValue(prevValue => {
          const valueToStore = newValue instanceof Function ? newValue(prevValue) : newValue;
          // The useEffect listening to [key, value] will handle saving to localStorage
          return valueToStore;
      });
  }, [key]); // Keep key in dependency array? No, setter shouldn't change if key changes. Removed key.


  return [value, setStoredValue];
}

