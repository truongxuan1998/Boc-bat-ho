'use client';

import React from 'react';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Icon } from '@astryxdesign/core/Icon';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { Sun, Moon, Download, ShieldCheck } from 'lucide-react';
import { useThemeMode } from './AstryxProvider';

interface HeaderNavProps {
  onOpenZaloModal: () => void;
  onExportJson: () => void;
  onOpenAccessLogs?: () => void;
}

export function HeaderNav({
  onOpenZaloModal,
  onExportJson,
  onOpenAccessLogs,
}: HeaderNavProps) {
  const { mode, toggleTheme } = useThemeMode();
  const isCompact = useMediaQuery('(max-width: 640px)');

  return (
    <HStack hAlign="between" vAlign="center" gap={3} wrap="nowrap" width="100%">
      <HStack gap={3} vAlign="center" wrap="nowrap">
        <Avatar
          src="/logo.png"
          size={isCompact ? 'md' : 'lg'}
          shape="circle"
          name="Bốc Bát Họ"
          alt="Logo Bốc Bát Họ"
          tooltip={false}
        />
        <VStack gap={0}>
          <Heading level={1} type="display-3">
            Bốc Bát Họ
          </Heading>
          {!isCompact && (
            <Text type="supporting" color="secondary">
              Quản lý dây hụi, điểm danh thu tiền và dự toán lãi lũy tiến
            </Text>
          )}
        </VStack>
      </HStack>

      <HStack gap={1} vAlign="center" wrap="nowrap">
        <IconButton
          label={mode === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          tooltip={mode === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
          variant="ghost"
          icon={<Icon icon={mode === 'dark' ? Sun : Moon} />}
          onClick={toggleTheme}
        />
        <MoreMenu
          label="Tùy chọn khác"
          alignment="end"
          presentation="adaptive"
          items={[
            {
              label: 'Sao lưu dữ liệu (JSON)',
              description: 'Tải toàn bộ dây hụi về máy',
              icon: <Icon icon={Download} />,
              onClick: onExportJson,
            },
            ...(onOpenAccessLogs
              ? [
                  {
                    label: 'Nhật ký truy cập (Logs)',
                    description: 'Xem IP, vị trí và thiết bị người vào web',
                    icon: <Icon icon={ShieldCheck} />,
                    onClick: onOpenAccessLogs,
                  },
                ]
              : []),
          ]}
        />
        <Button
          label="Gửi Zalo"
          variant="primary"
          isIconOnly={isCompact}
          icon={<Icon icon={ChatBubbleLeftRightIcon} />}
          onClick={onOpenZaloModal}
        />
      </HStack>
    </HStack>
  );
}
