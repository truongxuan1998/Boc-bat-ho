'use client';

import React from 'react';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Icon } from '@astryxdesign/core/Icon';
import {
  BanknotesIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  CloudIcon,
} from '@heroicons/react/24/outline';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

interface HeaderNavProps {
  onOpenZaloModal: () => void;
  onOpenCloudModal: () => void;
  onResetData: () => void;
  onExportJson: () => void;
}

export function HeaderNav({
  onOpenZaloModal,
  onOpenCloudModal,
  onResetData,
  onExportJson,
}: HeaderNavProps) {
  const isCloud = isSupabaseConfigured();

  return (
    <VStack gap={4}>
      <HStack hAlign="between" vAlign="center" wrap="wrap" gap={4}>
        <HStack gap={3} vAlign="center">
          <Icon icon={BanknotesIcon} size="lg" />
          <VStack gap={0}>
            <HStack gap={2} vAlign="center">
              <Heading level={2}>BỐC BÁT HỌ</Heading>
              <Badge label="Vercel Ready" variant="success" />
              {isCloud ? (
                <Badge label="☁️ Supabase Connected" variant="info" />
              ) : (
                <Badge label="💾 Local Storage" variant="neutral" />
              )}
            </HStack>
            <Text type="supporting" color="secondary">
              Hệ thống quản lý, tính toán & thống kê Hụi, Bát Họ thông minh
            </Text>
          </VStack>
        </HStack>

        <HStack gap={2} vAlign="center" wrap="wrap">
          <Button
            label={isCloud ? 'Cấu Hình Đám Mây' : 'Kết Nối Supabase'}
            variant={isCloud ? 'secondary' : 'primary'}
            size="md"
            icon={<Icon icon={CloudIcon} size="sm" />}
            onClick={onOpenCloudModal}
          />
          <Button
            label="Xuất Báo Cáo Zalo"
            variant="secondary"
            size="md"
            icon={<Icon icon={ChatBubbleLeftRightIcon} size="sm" />}
            onClick={onOpenZaloModal}
          />
          <Button
            label="Tải Sao Lưu JSON"
            variant="ghost"
            size="md"
            icon={<Icon icon={ArrowDownTrayIcon} size="sm" />}
            onClick={onExportJson}
          />
          <Button
            label="Xóa Trắng Dữ Liệu"
            variant="ghost"
            size="md"
            icon={<Icon icon={ArrowPathIcon} size="sm" />}
            onClick={onResetData}
          />
        </HStack>
      </HStack>
    </VStack>
  );
}
