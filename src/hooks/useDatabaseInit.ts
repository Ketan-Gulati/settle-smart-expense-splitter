import { useEffect, useState } from 'react';
import { databaseService } from '../database/db';
import { useAppStore } from '../store/appStore';

export function useDatabaseInit(): { isReady: boolean; error: Error | null } {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const initSession = useAppStore((state) => state.initSession);

  useEffect(() => {
    let isMounted = true;

    async function init(): Promise<void> {
      try {
        await initSession();
        await databaseService.initialize();
        if (isMounted) {
          setIsReady(true);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [initSession]);

  return { isReady, error };
}
