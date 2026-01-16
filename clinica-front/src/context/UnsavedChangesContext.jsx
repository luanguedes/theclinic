import React, { createContext, useCallback, useContext, useRef } from 'react';

const UnsavedChangesContext = createContext(null);

export function UnsavedChangesProvider({ children }) {
  const mapRef = useRef(new Map());

  const setDirty = useCallback((path, dirty, message) => {
    if (!path) return;
    if (dirty) {
      mapRef.current.set(path, { dirty: true, message });
      return;
    }
    mapRef.current.delete(path);
  }, []);

  const getDirty = useCallback((path) => mapRef.current.get(path), []);

  const value = { setDirty, getDirty };

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChangesRegistry() {
  return useContext(UnsavedChangesContext);
}
