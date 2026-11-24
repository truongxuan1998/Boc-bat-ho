'use client';

import React from 'react';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Heading } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Icon, IconType } from '@astryxdesign/core/Icon';
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { TopNav } from '@astryxdesign/core/TopNav';
import { TabList, Tab } from '@astryxdesign/core/TabList';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { Sun, Moon, Download } from 'lucide-react';
import { useThemeMode } from './AstryxProvider';

export interface AppTab {
  value: string;
  label: string;
  icon: IconType;
}

interface NavProps {
  tabs: readonly AppTab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenZaloModal: () => void;
  onExportJson: () => void;
}

const logo = (
  <Avatar src="/logo.png" size="md" shape="circle" name="Bốc Bát Họ" alt="Logo Bốc Bát Họ" tooltip={false} />
);

// Desktop: thanh bên trái với toàn bộ điều hướng và thao tác chung
export function DesktopSideNav({ tabs, activeTab, onTabChange, onOpenZaloModal, onExportJson }: NavProps) {
  const { mode, toggleTheme } = useThemeMode();
  return (
    <SideNav
      header={<SideNavHeading heading="Bốc Bát Họ" subheading="Hụi, chia tiền & quỹ nhóm" icon={logo} />}
      topContent={
        <Button
          label="Gửi Zalo"
          variant="primary"
          icon={<Icon icon={ChatBubbleLeftRightIcon} />}
          onClick={onOpenZaloModal}
        />
      }
      footer={
        <VStack gap={1}>
          <SideNavItem
            label={mode === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
            icon={mode === 'dark' ? Sun : Moon}
            onClick={toggleTheme}
          />
          <SideNavItem label="Sao lưu dữ liệu" icon={Download} onClick={onExportJson} />
        </VStack>
      }
    >
      <SideNavSection title="Chức năng" isHeaderHidden>
        {tabs.map((t) => (
          <SideNavItem
            key={t.value}
            label={t.label}
            icon={t.icon}
            isSelected={t.value === activeTab}
            onClick={() => onTabChange(t.value)}
          />
        ))}
      </SideNavSection>
    </SideNav>
  );
}

// Mobile: thanh trên cùng với tên app, Gửi Zalo và menu thao tác chung
export function MobileTopNav({ onOpenZaloModal, onExportJson }: Pick<NavProps, 'onOpenZaloModal' | 'onExportJson'>) {
  const { mode, toggleTheme } = useThemeMode();
  return (
    <TopNav
      label="Thanh ứng dụng"
      heading={
        <HStack gap={2} vAlign="center" wrap="nowrap">
          {logo}
          <Heading level={3} accessibilityLevel={1}>
            Bốc Bát Họ
          </Heading>
        </HStack>
      }
      endContent={
        <HStack gap={1} vAlign="center" wrap="nowrap">
          <IconButton
            label="Gửi Zalo"
            variant="primary"
            size="lg"
            icon={<Icon icon={ChatBubbleLeftRightIcon} />}
            onClick={onOpenZaloModal}
          />
          <MoreMenu
            label="Tùy chọn khác"
            size="lg"
            alignment="end"
            presentation="adaptive"
            items={[
              {
                label: mode === 'dark' ? 'Chế độ sáng' : 'Chế độ tối',
                icon: <Icon icon={mode === 'dark' ? Sun : Moon} />,
                onClick: toggleTheme,
              },
              {
                label: 'Sao lưu dữ liệu (JSON)',
                description: 'Tải toàn bộ dữ liệu về máy',
                icon: <Icon icon={Download} />,
                onClick: onExportJson,
              },
            ]}
          />
        </HStack>
      }
    />
  );
}

// Mobile: thanh tab ở đáy, tab đang chọn hiện chữ, các tab khác chỉ hiện icon cho vừa 5 tab
export function MobileTabBar({ tabs, activeTab, onTabChange }: Pick<NavProps, 'tabs' | 'activeTab' | 'onTabChange'>) {
  return (
    <TabList value={activeTab} onChange={onTabChange} size="lg" layout="fill" aria-label="Chức năng">
      {tabs.map((t) => (
        <Tab
          key={t.value}
          value={t.value}
          label={t.label}
          isLabelHidden={t.value !== activeTab}
          icon={<Icon icon={t.icon} />}
        />
      ))}
    </TabList>
  );
}
