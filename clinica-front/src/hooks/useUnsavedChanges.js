import { useCallback, useContext, useEffect } from 'react';
import { UNSAFE_NavigationContext } from 'react-router-dom';

const DEFAULT_MESSAGE = 'Existem alteracoes nao salvas. Deseja sair sem salvar?';

function useBlocker(blocker, when = true) {
  const { navigator } = useContext(UNSAFE_NavigationContext);

  useEffect(() => {
    if (!when || typeof navigator?.block !== 'function') return;
    const unblock = navigator.block((tx) => {
      const autoUnblockingTx = {
        ...tx,
        retry() {
          unblock();
          tx.retry();
        },
      };
      blocker(autoUnblockingTx);
    });
    return unblock;
  }, [navigator, blocker, when]);
}

export default function useUnsavedChanges(isDirty, message = DEFAULT_MESSAGE) {
  const handleBlock = useCallback((tx) => {
    const shouldLeave = window.confirm(message);
    if (shouldLeave) tx.retry();
  }, [message]);

  useBlocker(handleBlock, isDirty);

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
