'use client';

import React from 'react';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Icon } from '@astryxdesign/core/Icon';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

interface HeaderNavProps {
  onOpenZaloModal: () => void;
}

export function HeaderNav({ onOpenZaloModal }: HeaderNavProps) {
  return (
    <VStack gap={4}>
      <HStack hAlign="between" vAlign="center" wrap="wrap" gap={4}>
        <HStack gap={3} vAlign="center">
          <Avatar
            src="/logo.png"
            size="lg"
            shape="circle"
            name="Bốc Bát Họ"
            alt="Logo Bốc Bát Họ"
            tooltip={false}
          />
          <VStack gap={0}>
            <Heading level={2}>BỐC BÁT HỌ</Heading>
            <Text type="supporting" color="secondary">
              Hệ thống quản lý, tính toán & thống kê Hụi, Bát Họ thông minh
            </Text>
          </VStack>
        </HStack>

        <HStack gap={2} vAlign="center" wrap="wrap">
          <Button
            label="Xuất Báo Cáo Zalo"
            variant="primary"
            size="md"
            icon={<Icon icon={ChatBubbleLeftRightIcon} size="sm" />}
            onClick={onOpenZaloModal}
          />
        </HStack>
      </HStack>
    </VStack>
  );
}
