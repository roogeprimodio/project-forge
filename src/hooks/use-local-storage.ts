
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

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

export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // Initialize state. Use a function to read from storage only once on initial render client-side.
  const [value, setValue] = useState<T>(() => {
    // Check if window is defined (client-side)
    if (typeof window !== "undefined") {
      return getStorageValue(key, defaultValue);
    }
    // Server-side or during build, return default
    return defaultValue;
  });

  // Ref to track if the component has mounted and initial value loaded
  const isMounted = useRef(false);

  // Effect to load initial value from localStorage on mount (client-side only)
  // And handle updates if defaultValue or key changes (though key change is less common)
  useEffect(() => {
    if (typeof window !== "undefined") {
      // On mount, ensure the state reflects the current storage value.
      // This also handles cases where the value might have changed between SSR and client hydration.
      setValue(getStorageValue(key, defaultValue));
      isMounted.current = true; // Mark as mounted after initial load
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, defaultValue]); // Depend on key and defaultValue

  // Effect to update localStorage when value changes
  useEffect(() => {
    // Only run this effect on the client-side and after the initial value has been loaded
    if (typeof window !== "undefined" && isMounted.current) {
      try {
        const newValueString = JSON.stringify(value);
        localStorage.setItem(key, newValueString);
      } catch (error) {
        console.error(`Error setting localStorage key “${key}”:`, error);
      }
    }
  }, [key, value]); // Only depends on key and value

  // Effect to listen for storage events from other tabs/windows
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.storageArea === localStorage && event.key === key) {
        try {
          const newValueParsed = event.newValue !== null ? JSON.parse(event.newValue) : defaultValue;
          // Update state only if the new value is actually different from the current state
          setValue(currentVal => {
            // Use JSON.stringify for comparison to handle objects/arrays correctly
            if (JSON.stringify(currentVal) !== JSON.stringify(newValueParsed)) {
              return newValueParsed;
            }
            return currentVal;
          });
        } catch (error) {
          console.error(`Error parsing storage event value for key "${key}"`, error);
          // Fallback to reading directly from storage if parsing fails
          setValue(getStorageValue(key, defaultValue));
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, defaultValue]); // Include defaultValue in dependencies

  // useCallback ensures the setter function has a stable identity
  const setStoredValue = useCallback((newValue: T | ((val: T) => T)) => {
    setValue(prevValue => {
      const valueToStore = newValue instanceof Function ? newValue(prevValue) : newValue;
      // The useEffect listening to [key, value] will handle saving to localStorage
      return valueToStore;
    });
  }, [key]); // Setter depends on the key

  return [value, setStoredValue];
}
