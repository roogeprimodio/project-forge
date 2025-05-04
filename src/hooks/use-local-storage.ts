
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
  // This runs AFTER the initial state is set by useState's initializer function.
  // Its main purpose here is to ensure client-side hydration matches storage
  // and to handle potential key changes.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedValue = getStorageValue(key, defaultValue);
      // Update the state ONLY if the value derived from storage differs
      // from the currently rendered state. Prevents loops.
      setValue(currentValue => {
        // Use JSON.stringify for robust comparison of objects/arrays
        if (JSON.stringify(currentValue) !== JSON.stringify(storedValue)) {
          return storedValue;
        }
        return currentValue;
      });
      if (!isMounted.current) {
          isMounted.current = true; // Mark as mounted after initial hydration sync attempt
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // ONLY depend on the key. defaultValue is used by getStorageValue internally if needed.

  // Effect to update localStorage when value changes
  useEffect(() => {
    // Only run this effect on the client-side and after the initial value has been loaded/synced
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
    // Use JSON.stringify for defaultValue dependency comparison to avoid unnecessary effect runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, JSON.stringify(defaultValue)]);

  // useCallback ensures the setter function has a stable identity
  const setStoredValue = useCallback((newValue: T | ((val: T) => T)) => {
    setValue(prevValue => {
      const valueToStore = newValue instanceof Function ? newValue(prevValue) : newValue;
      // The useEffect listening to [key, value] will handle saving to localStorage
      return valueToStore;
    });
  }, []); // Removed key dependency as setValue from useState is stable

  return [value, setStoredValue];
}
