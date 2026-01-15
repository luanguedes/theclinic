import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

const DEFAULT_MESSAGE = 'Existem alteracoes nao salvas. Deseja sair sem salvar?';

export default function useUnsavedChanges(isDirty, message = DEFAULT_MESSAGE) {
  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    const shouldLeave = window.confirm(message);
    if (shouldLeave) blocker.proceed();
    else blocker.reset();
  }, [blocker, message]);

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
