import { useEffect, useState } from 'react';
import { databaseService } from '../database/db';
import { useAppStore } from '../store/appStore';

export function useDatabaseInit(): { isReady: boolean; error: Error | null } {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const setInitialized = useAppStore((state) => state.setInitialized);

  useEffect(() => {
    let isMounted = true;

    async function init(): Promise<void> {
      try {
        await databaseService.initialize();
        const { SeedDataService } = await import('../repositories/seedDataService');
        await SeedDataService.seedDevelopmentData();
        if (isMounted) {
          setIsReady(true);
          setInitialized(true);
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
  }, [setInitialized]);

  return { isReady, error };
}
