'use client';

import React from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Badge } from '@astryxdesign/core/Badge';
import { Icon } from '@astryxdesign/core/Icon';
import {
  CurrencyDollarIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { SystemData } from '@/types';
import { formatCurrency } from '@/lib/huiCalculator';

interface DashboardOverviewProps {
  data: SystemData;
}

export function DashboardOverview({ data }: DashboardOverviewProps) {
  // 1. Tính toán thống kê Hụi
  let totalHuiFund = 0;
  let totalHuiCollected = 0;
  let totalHuiDebt = 0;
  let totalUnpaidSlots = 0;
  let totalPeriodsOpened = 0;
  let totalSlotsCount = 0;

  for (const hui of data.huiGroups) {
    totalHuiFund += hui.amountPerSlot * hui.totalSlots;
    totalSlotsCount += hui.totalSlots;
    totalPeriodsOpened += hui.periods?.length || 0;
    for (const period of hui.periods || []) {
      for (const p of period.payments) {
        if (p.isPaid) {
          totalHuiCollected += p.amountToPay;
        } else {
          totalHuiDebt += p.amountToPay;
          totalUnpaidSlots++;
        }
      }
    }
  }

  // Dữ liệu biểu đồ phân tích theo từng dây hụi
  const chartData =
    data.huiGroups.length > 0
      ? data.huiGroups.map((g) => {
          let col = 0;
          let debt = 0;
          for (const period of g.periods || []) {
            for (const p of period.payments) {
              if (p.isPaid) {
                col += p.amountToPay;
              } else {
                debt += p.amountToPay;
              }
            }
          }
          return {
            category: g.name,
            'Tổng Vốn Dây': Math.round((g.amountPerSlot * g.totalSlots) / 1000000),
            'Đã Thu': Math.round(col / 1000000),
            'Còn Nợ': Math.round(debt / 1000000),
          };
        })
      : [
          {
            category: 'Chưa có dây hụi',
            'Tổng Vốn Dây': 0,
            'Đã Thu': 0,
            'Còn Nợ': 0,
          },
        ];

  return (
    <VStack gap={6}>
      {/* 4 Thẻ chỉ số chính */}
      <Grid columns={{ minWidth: 260, repeat: 'fit' }} gap={4}>
        <Card>
          <VStack gap={2}>
            <HStack hAlign="between" vAlign="center">
              <Text type="supporting" color="secondary">
                Tổng Vốn Các Dây Hụi
              </Text>
              <Icon icon={CurrencyDollarIcon} size="md" />
            </HStack>
            <Heading level={3}>{formatCurrency(totalHuiFund)}</Heading>
            <Text type="supporting">
              {data.huiGroups.length} dây hụi đang hoạt động
            </Text>
          </VStack>
        </Card>

        <Card>
          <VStack gap={2}>
            <HStack hAlign="between" vAlign="center">
              <Text type="supporting" color="secondary">
                Tổng Tiền Đã Thu
              </Text>
              <Icon icon={CheckCircleIcon} size="md" />
            </HStack>
            <Heading level={3}>{formatCurrency(totalHuiCollected)}</Heading>
            <Text type="supporting">Các chân hụi đã đóng hoàn tất</Text>
          </VStack>
        </Card>

        <Card>
          <VStack gap={2}>
            <HStack hAlign="between" vAlign="center">
              <Text type="supporting" color="secondary">
                Dư Nợ Còn Phải Thu
              </Text>
              <Icon icon={ExclamationCircleIcon} size="md" />
            </HStack>
            <Heading level={3}>{formatCurrency(totalHuiDebt)}</Heading>
            <HStack gap={2} vAlign="center">
              <Text type="supporting">
                Cần đôn đốc nhắc nhở
              </Text>
              {totalUnpaidSlots > 0 && (
                <Badge label={`${totalUnpaidSlots} chân chưa đóng`} variant="warning" />
              )}
            </HStack>
          </VStack>
        </Card>

        <Card>
          <VStack gap={2}>
            <HStack hAlign="between" vAlign="center">
              <Text type="supporting" color="secondary">
                Tiến Độ Khui Hụi
              </Text>
              <Icon icon={SparklesIcon} size="md" />
            </HStack>
            <Heading level={3}>
              {totalPeriodsOpened} / {totalSlotsCount} Kỳ
            </Heading>
            <Text type="supporting">Tổng số kỳ đã khui thực tế</Text>
          </VStack>
        </Card>
      </Grid>

      {/* Biểu đồ dòng tiền phân tích */}
      <Card>
        <VStack gap={4}>
          <HStack hAlign="between" vAlign="center" wrap="wrap">
            <VStack gap={1}>
              <Heading level={4}>Thống Kê Dòng Tiền Dây Hụi (Triệu VNĐ)</Heading>
              <Text type="supporting" color="secondary">
                Biểu đồ phân bổ nguồn vốn, số tiền đã thu hồi và dư nợ còn lại theo từng dây hụi
              </Text>
            </VStack>
          </HStack>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="category" />
              <YAxis unit="tr" />
              <Tooltip formatter={(value) => [`${value} Triệu VNĐ`]} />
              <Legend />
              <Bar dataKey="Tổng Vốn Dây" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Đã Thu" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Còn Nợ" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </VStack>
      </Card>
    </VStack>
  );
}
