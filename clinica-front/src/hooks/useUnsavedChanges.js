import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const DEFAULT_MESSAGE = 'Existem alteracoes nao salvas. Deseja sair sem salvar?';

export default function useUnsavedChanges(isDirty, message = DEFAULT_MESSAGE) {
  const navigate = useNavigate();
  const location = useLocation();
  const lastLocationRef = useRef(location);
  const revertingRef = useRef(false);

  useEffect(() => {
    if (!isDirty) {
      lastLocationRef.current = location;
      return;
    }

    if (revertingRef.current) {
      revertingRef.current = false;
      lastLocationRef.current = location;
      return;
    }

    const last = lastLocationRef.current;
    const changed = (
      location.pathname !== last.pathname ||
      location.search !== last.search ||
      location.hash !== last.hash
    );

    if (!changed) return;

    const shouldLeave = window.confirm(message);
    if (shouldLeave) {
      lastLocationRef.current = location;
      return;
    }

    revertingRef.current = true;
    navigate(`${last.pathname}${last.search}${last.hash}`, { replace: true });
  }, [isDirty, location, message, navigate]);

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
