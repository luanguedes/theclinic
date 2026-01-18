import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useUnsavedChangesRegistry } from '../context/UnsavedChangesContext';

const DEFAULT_MESSAGE = 'Existem alteracoes nao salvas. Deseja sair sem salvar?';

export default function useUnsavedChanges(isDirty, message = DEFAULT_MESSAGE) {
  const location = useLocation();
  const registry = useUnsavedChangesRegistry();

  useEffect(() => {
    if (!registry) return;
    const key = `${location.pathname}${location.search}${location.hash}`;
    registry.setDirty(key, isDirty, message);
    return () => registry.setDirty(key, false);
  }, [isDirty, location.pathname, location.search, location.hash, message, registry]);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
}
