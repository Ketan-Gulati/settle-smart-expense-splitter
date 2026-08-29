import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Text, Icon } from '@/components';
import { OfflineSyncEngine, PendingOfflineExpense } from '@/services/offline/syncEngine';

export const OfflineSyncBanner: React.FC = () => {
  const theme = useAppTheme();
  const [queue, setQueue] = useState<PendingOfflineExpense[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const unsubscribe = OfflineSyncEngine.subscribe((newQueue) => {
      setQueue(newQueue);
      setShowBanner(newQueue.length > 0);
      setIsSyncing(newQueue.some((q) => q.status === 'SYNCING'));
    });

    // Attempt automatic sync periodically or when online
    const interval = setInterval(() => {
      OfflineSyncEngine.getQueue().then((q) => {
        if (q.length > 0) {
          OfflineSyncEngine.syncPendingExpenses().catch(() => null);
        }
      });
    }, 15000); // Check every 15s

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      await OfflineSyncEngine.syncPendingExpenses();
    } finally {
      setIsSyncing(false);
    }
  };

  if (!showBanner || queue.length === 0) return null;

  return (
    <View style={[styles.bannerContainer, { backgroundColor: '#0F172A', borderColor: 'rgba(56, 189, 248, 0.25)' }]}>
      <View style={styles.leftRow}>
        <View style={[styles.cloudIconWrap, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
          {isSyncing ? (
            <ActivityIndicator size="small" color="#38BDF8" />
          ) : (
            <Icon name="cloud-offline-outline" size={18} color="#38BDF8" />
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="caption" weight="bold" color="#F8FAFC" style={{ fontSize: 13 }}>
            {isSyncing ? `Syncing ${queue.length} expense${queue.length > 1 ? 's' : ''}...` : `${queue.length} Offline Expense${queue.length > 1 ? 's' : ''} Saved`}
          </Text>
          <Text variant="caption" color="#94A3B8" style={{ fontSize: 11 }}>
            {isSyncing ? 'Pushing to group ledger...' : 'Stored locally on device. Will auto-sync when online.'}
          </Text>
        </View>
      </View>

      {!isSyncing && (
        <Pressable
          onPress={handleManualSync}
          style={[styles.syncButton, { backgroundColor: theme.colors.primary }]}
          hitSlop={8}
        >
          <Icon name="sync-outline" size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
          <Text variant="caption" weight="bold" color="#FFFFFF" style={{ fontSize: 12 }}>
            Sync Now
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    gap: 12,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cloudIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
});
