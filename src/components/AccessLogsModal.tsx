'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Icon } from '@astryxdesign/core/Icon';
import { Table, TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import { Card } from '@astryxdesign/core/Card';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { RotateCw, Globe, Smartphone, Monitor } from 'lucide-react';
import type { AccessLogItem } from '@/app/api/log-visit/route';

interface AccessLogsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccessLogsModal({ isOpen, onOpenChange }: AccessLogsModalProps) {
  const [logs, setLogs] = useState<AccessLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [source, setSource] = useState<'supabase' | 'memory'>('memory');
  const isCompact = useMediaQuery('(max-width: 640px)');

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/log-visit');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.logs)) {
          setLogs(json.logs);
          setSource(json.source || 'memory');
        }
      }
    } catch (err) {
      console.error('Không thể tải access logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, fetchLogs]);

  const columns: TableColumn<AccessLogItem>[] = useMemo(() => {
    if (isCompact) {
      return [
        {
          key: 'info',
          header: 'Thời gian & IP',
          width: pixel(130),
          renderCell: (item) => {
            const date = new Date(item.created_at);
            const timeStr = date.toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            });
            const dateStr = date.toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
            });
            return (
              <VStack gap={0}>
                <Text weight="semibold" hasTabularNumbers maxLines={1}>
                  {timeStr} {dateStr}
                </Text>
                <Text type="supporting" color="secondary" hasTabularNumbers maxLines={1}>
                  {item.ip}
                </Text>
              </VStack>
            );
          },
        },
        {
          key: 'details',
          header: 'Vị trí & Thiết bị',
          width: proportional(1, { minWidth: 150 }),
          renderCell: (item) => {
            const isMobile =
              /iPhone|iPad|Android/i.test(item.device) || /iOS|Android/i.test(item.os);
            return (
              <VStack gap={0}>
                <HStack gap={1} vAlign="center" wrap="nowrap">
                  <Icon icon={Globe} size="sm" />
                  <Text weight="semibold" maxLines={1}>
                    {item.location || 'Việt Nam'}
                  </Text>
                </HStack>
                <HStack gap={1} vAlign="center" wrap="nowrap">
                  <Icon icon={isMobile ? Smartphone : Monitor} size="sm" />
                  <Text type="supporting" color="secondary" maxLines={1}>
                    {item.device} • {item.browser}
                  </Text>
                </HStack>
              </VStack>
            );
          },
        },
      ];
    }

    return [
      {
        key: 'created_at',
        header: 'Thời gian',
        width: pixel(130),
        renderCell: (item) => {
          const date = new Date(item.created_at);
          const timeStr = date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          const dateStr = date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
          return (
            <VStack gap={0}>
              <Text weight="semibold" hasTabularNumbers maxLines={1}>
                {timeStr}
              </Text>
              <Text type="supporting" color="secondary" hasTabularNumbers maxLines={1}>
                {dateStr}
              </Text>
            </VStack>
          );
        },
      },
      {
        key: 'ip',
        header: 'Địa chỉ IP',
        width: pixel(140),
        renderCell: (item) => (
          <VStack gap={0}>
            <Text weight="semibold" hasTabularNumbers maxLines={1}>
              {item.ip}
            </Text>
            <Text type="supporting" color="secondary" maxLines={1}>
              {item.path || '/'}
            </Text>
          </VStack>
        ),
      },
      {
        key: 'location',
        header: 'Vị trí địa lý',
        width: proportional(1.2, { minWidth: 140 }),
        renderCell: (item) => (
          <HStack gap={1} vAlign="center" wrap="nowrap">
            <Icon icon={Globe} size="sm" />
            <Text maxLines={1}>{item.location || 'Việt Nam'}</Text>
          </HStack>
        ),
      },
      {
        key: 'device',
        header: 'Thiết bị & Trình duyệt',
        width: proportional(1.5, { minWidth: 180 }),
        renderCell: (item) => {
          const isMobile =
            /iPhone|iPad|Android/i.test(item.device) || /iOS|Android/i.test(item.os);
          return (
            <HStack gap={2} vAlign="center" wrap="nowrap">
              <Icon icon={isMobile ? Smartphone : Monitor} size="sm" />
              <VStack gap={0}>
                <Text weight="semibold" maxLines={1}>
                  {item.device} ({item.os})
                </Text>
                <Text type="supporting" color="secondary" maxLines={1}>
                  {item.browser}
                  {item.screen ? ` • ${item.screen}` : ''}
                </Text>
              </VStack>
            </HStack>
          );
        },
      },
    ];
  }, [isCompact]);

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={isCompact ? 360 : 820} purpose="info">
      <DialogHeader
        title="Nhật ký truy cập web"
        subtitle="Thông tin IP máy, vị trí địa lý và thiết bị của các lượt truy cập vào web"
        onOpenChange={onOpenChange}
      />
      <VStack gap={4} padding={isCompact ? 2 : 4}>
        <HStack hAlign="between" vAlign="center" wrap="wrap" gap={2}>
          <HStack gap={2} vAlign="center">
            <Text weight="semibold">Tổng số: {logs.length}</Text>
            <Badge
              label={source === 'supabase' ? 'Supabase' : 'Bộ nhớ tạm'}
              variant={source === 'supabase' ? 'green' : 'neutral'}
            />
          </HStack>

          <Button
            label={isLoading ? '...' : 'Làm mới'}
            variant="secondary"
            size="sm"
            icon={<Icon icon={RotateCw} />}
            onClick={fetchLogs}
          />
        </HStack>

        {logs.length === 0 ? (
          <Card variant="muted">
            <VStack gap={1} padding={4} hAlign="center">
              <Text weight="semibold">Chưa có lượt truy cập nào được ghi lại</Text>
              <Text type="supporting" color="secondary">
                Lượt truy cập mới sẽ tự động hiển thị tại đây khi có người vào website.
              </Text>
            </VStack>
          </Card>
        ) : (
          <Table<AccessLogItem>
            columns={columns}
            data={logs}
            idKey="id"
            density="compact"
            dividers="rows"
            hasHover
            aria-label="Bảng danh sách lượt truy cập"
          />
        )}

        <HStack hAlign="end">
          <Button label="Đóng" variant="ghost" onClick={() => onOpenChange(false)} />
        </HStack>
      </VStack>
    </Dialog>
  );
}
