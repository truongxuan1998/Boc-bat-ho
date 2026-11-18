'use client';

import React, { useState, useEffect } from 'react';
import { Layout, LayoutContent, VStack, HStack } from '@astryxdesign/core/Layout';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { SystemData, HuiGroup, BatHoLoan } from '@/types';
import {
  loadSystemData,
  saveSystemData,
  initialSampleData,
} from '@/lib/storage';
import { HeaderNav } from '@/components/HeaderNav';
import { DashboardOverview } from '@/components/DashboardOverview';
import { HuiTab } from '@/components/HuiTab';
import { BatHoTab } from '@/components/BatHoTab';
import { CalculatorTab } from '@/components/CalculatorTab';
import { ZaloExportModal } from '@/components/ZaloExportModal';

export default function Home() {
  const [data, setData] = useState<SystemData>(initialSampleData);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isZaloModalOpen, setIsZaloModalOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Nạp dữ liệu từ LocalStorage khi render trên Client
  useEffect(() => {
    setIsClient(true);
    const stored = loadSystemData();
    setData(stored);

    // Đọc URL param ?tab=
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['overview', 'hui', 'batho', 'calc'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', newTab);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Lưu dữ liệu mỗi khi state thay đổi
  const handleUpdateHuiGroups = (groups: HuiGroup[]) => {
    const updated = { ...data, huiGroups: groups };
    setData(updated);
    saveSystemData(updated);
  };

  const handleUpdateBatHoLoans = (loans: BatHoLoan[]) => {
    const updated = { ...data, batHoLoans: loans };
    setData(updated);
    saveSystemData(updated);
  };

  // Khôi phục dữ liệu mẫu
  const handleResetData = () => {
    if (confirm('Bạn có chắc muốn khôi phục lại dữ liệu mẫu ban đầu?')) {
      setData(initialSampleData);
      saveSystemData(initialSampleData);
    }
  };

  // Xuất file JSON backup
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

  if (!isClient) {
    return (
      <Layout
        height="fill"
        content={
          <LayoutContent padding={6}>
            <VStack gap={4} hAlign="center" vAlign="center" minHeight="50vh">
              <Text>Đang tải dữ liệu Bốc Bát Họ...</Text>
            </VStack>
          </LayoutContent>
        }
      />
    );
  }

  return (
    <Layout
      height="fill"
      content={
        <LayoutContent padding={6}>
          <VStack gap={6}>
            {/* Header Navigation */}
            <HeaderNav
              onOpenZaloModal={() => setIsZaloModalOpen(true)}
              onResetData={handleResetData}
              onExportJson={handleExportJson}
            />

            {/* Thanh điều hướng tab chính */}
            <Card>
              <HStack hAlign="between" vAlign="center" wrap="wrap" gap={4}>
                <SegmentedControl
                  label="Chế độ làm việc"
                  value={activeTab}
                  onChange={handleTabChange}
                  size="md"
                >
                  <SegmentedControlItem
                    value="overview"
                    label="📊 Tổng Quan & Dòng Tiền"
                  />
                  <SegmentedControlItem
                    value="hui"
                    label="🤝 Hụi / Họ Xoay Vòng"
                  />
                  <SegmentedControlItem
                    value="batho"
                    label="📝 Bát Họ Ngày (10 Ăn 8)"
                  />
                  <SegmentedControlItem
                    value="calc"
                    label="🧮 Máy Tính Dự Toán"
                  />
                </SegmentedControl>

                <Text type="supporting" color="secondary">
                  Cập nhật: {new Date(data.lastUpdated).toLocaleDateString('vi-VN')}
                </Text>
              </HStack>
            </Card>

            {/* Nội dung tab tương ứng */}
            {activeTab === 'overview' && <DashboardOverview data={data} />}
            {activeTab === 'hui' && (
              <HuiTab
                huiGroups={data.huiGroups}
                onUpdateHuiGroups={handleUpdateHuiGroups}
              />
            )}
            {activeTab === 'batho' && (
              <BatHoTab
                batHoLoans={data.batHoLoans}
                onUpdateBatHoLoans={handleUpdateBatHoLoans}
              />
            )}
            {activeTab === 'calc' && <CalculatorTab />}

            {/* Modal Xuất Báo Cáo Zalo */}
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
