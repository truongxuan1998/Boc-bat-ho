'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Layout, LayoutContent, VStack, HStack } from '@astryxdesign/core/Layout';
import { TabList, Tab } from '@astryxdesign/core/TabList';
import { Text } from '@astryxdesign/core/Text';
import { Icon } from '@astryxdesign/core/Icon';
import { Grid } from '@astryxdesign/core/Grid';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { BarChart3, Users, Calculator, Receipt, PiggyBank } from 'lucide-react';
import { SystemData, HuiGroup, SplitEvent, GroupFund } from '@/types';
import {
  loadSystemData,
  loadSystemDataWithCloud,
  saveSystemData,
  emptySystemData,
} from '@/lib/storage';
import { subscribeToRealtimeChanges } from '@/lib/supabaseClient';
import { HeaderNav } from '@/components/HeaderNav';
import { DashboardOverview } from '@/components/DashboardOverview';
import { HuiTab } from '@/components/HuiTab';
import { CalculatorTab } from '@/components/CalculatorTab';
import { SplitTab } from '@/components/SplitTab';
import { FundTab } from '@/components/FundTab';
import { ZaloExportModal } from '@/components/ZaloExportModal';

const TABS = [
  { value: 'overview', label: 'Tổng quan', icon: BarChart3 },
  { value: 'hui', label: 'Dây hụi', icon: Users },
  { value: 'calc', label: 'Dự toán', icon: Calculator },
  { value: 'split', label: 'Chia tiền', icon: Receipt },
  { value: 'fund', label: 'Quỹ nhóm', icon: PiggyBank },
] as const;

export default function Home() {
  const [data, setData] = useState<SystemData>(emptySystemData);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isZaloModalOpen, setIsZaloModalOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const isCompact = useMediaQuery('(max-width: 640px)');

  const refreshCloudData = useCallback(async () => {
    const cloudData = await loadSystemDataWithCloud();
    setData(cloudData);
  }, []);

  useEffect(() => {
    setIsClient(true);

    // Chọn tab qua URL (?tab=hui hoặc ?tab=calc)
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (tabParam && TABS.some((t) => t.value === tabParam)) {
      setActiveTab(tabParam);
    }

    // 1. Tải tức thì từ LocalStorage, 2. đồng bộ Supabase, 3. lắng nghe Realtime
    setData(loadSystemData());
    refreshCloudData();
    const unsubscribe = subscribeToRealtimeChanges(() => {
      refreshCloudData();
    });

    return () => {
      unsubscribe();
    };
  }, [refreshCloudData]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', newTab);
    window.history.replaceState({}, '', url.toString());
  };

  const handleUpdateHuiGroups = (groups: HuiGroup[]) => {
    const updated = { ...data, huiGroups: groups };
    setData(updated);
    saveSystemData(updated);
  };

  const handleUpdateSplitEvents = (events: SplitEvent[]) => {
    const updated = { ...data, splitEvents: events };
    setData(updated);
    saveSystemData(updated);
  };

  const handleUpdateGroupFunds = (funds: GroupFund[]) => {
    const updated = { ...data, groupFunds: funds };
    setData(updated);
    saveSystemData(updated);
  };

  // Xuất file JSON sao lưu
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boc_bat_ho_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout
      height="auto"
      contentWidth={1152}
      content={
        <LayoutContent padding={isCompact ? 3 : 5} isScrollable={false}>
          <VStack gap={isCompact ? 4 : 6} width="100%">
            <HeaderNav
              onOpenZaloModal={() => setIsZaloModalOpen(true)}
              onExportJson={handleExportJson}
            />

            <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
              <TabList
                value={activeTab}
                onChange={handleTabChange}
                size="lg"
                aria-label="Chế độ làm việc"
              >
                {TABS.map((t) => (
                  <Tab
                    key={t.value}
                    value={t.value}
                    label={t.label}
                    icon={<Icon icon={t.icon} size="sm" />}
                  />
                ))}
              </TabList>

              {isClient && !isCompact && (
                <Text type="supporting" color="secondary">
                  Cập nhật lần cuối {new Date(data.lastUpdated).toLocaleString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </Text>
              )}
            </HStack>

            {!isClient ? (
              <VStack gap={4}>
                <Grid columns={{ minWidth: 160, repeat: 'fit' }} gap={4}>
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} index={i} height={128} />
                  ))}
                </Grid>
                <Skeleton index={4} height={320} />
              </VStack>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <DashboardOverview
                    data={data}
                    onGoToHui={() => handleTabChange('hui')}
                  />
                )}
                {activeTab === 'hui' && (
                  <HuiTab
                    huiGroups={data.huiGroups}
                    onUpdateHuiGroups={handleUpdateHuiGroups}
                  />
                )}
                {activeTab === 'calc' && <CalculatorTab />}
                {activeTab === 'fund' && (
                  <FundTab
                    funds={data.groupFunds}
                    onUpdateFunds={handleUpdateGroupFunds}
                  />
                )}
                {activeTab === 'split' && (
                  <SplitTab
                    events={data.splitEvents}
                    onUpdateEvents={handleUpdateSplitEvents}
                  />
                )}
              </>
            )}

            <ZaloExportModal
              isOpen={isZaloModalOpen}
              onOpenChange={setIsZaloModalOpen}
              data={data}
            />
          </VStack>
        </LayoutContent>
      }
    />
  );
}
