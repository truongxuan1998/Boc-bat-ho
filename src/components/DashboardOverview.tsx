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
import { calculateBatHoStats } from '@/lib/batHoCalculator';

interface DashboardOverviewProps {
  data: SystemData;
}

export function DashboardOverview({ data }: DashboardOverviewProps) {
  // 1. Tính toán thống kê Hụi
  let totalHuiFund = 0;
  let totalHuiCommission = 0;
  let totalHuiCollected = 0;
  let totalHuiDebt = 0;

  for (const hui of data.huiGroups) {
    totalHuiFund += hui.amountPerSlot * hui.totalSlots;
    for (const period of hui.periods || []) {
      totalHuiCommission += period.commissionFee;
      for (const p of period.payments) {
        if (p.isPaid) {
          totalHuiCollected += p.amountToPay;
        } else {
          totalHuiDebt += p.amountToPay;
        }
      }
    }
  }

  // 2. Tính toán thống kê Bát Họ
  let totalBatHoFund = 0;
  let totalBatHoFee = 0;
  let totalBatHoCollected = 0;
  let totalBatHoDebt = 0;
  let overdueCount = 0;

  for (const loan of data.batHoLoans) {
    totalBatHoFund += loan.totalAmount;
    totalBatHoFee += loan.cutFee;
    const stats = calculateBatHoStats(loan);
    totalBatHoCollected += stats.paidAmount;
    totalBatHoDebt += stats.remainingAmount;
    if (stats.isOverdue) {
      overdueCount++;
    }
  }

  // Tổng cộng toàn hệ thống
  const grandTotalFund = totalHuiFund + totalBatHoFund;
  const grandTotalProfit = totalHuiCommission + totalBatHoFee;
  const grandTotalCollected = totalHuiCollected + totalBatHoCollected;
  const grandTotalDebt = totalHuiDebt + totalBatHoDebt;

  // Dữ liệu biểu đồ so sánh dòng tiền
  const chartData = [
    {
      category: 'Hụi / Họ Xoay Vòng',
      'Tổng Vốn': Math.round(totalHuiFund / 1000000),
      'Đã Thu': Math.round(totalHuiCollected / 1000000),
      'Còn Nợ': Math.round(totalHuiDebt / 1000000),
      'Lợi Nhuận / Xâu': Math.round(totalHuiCommission / 1000000),
    },
    {
      category: 'Bát Họ Ngày',
      'Tổng Vốn': Math.round(totalBatHoFund / 1000000),
      'Đã Thu': Math.round(totalBatHoCollected / 1000000),
      'Còn Nợ': Math.round(totalBatHoDebt / 1000000),
      'Lợi Nhuận / Xâu': Math.round(totalBatHoFee / 1000000),
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
                Tổng Vốn Lưu Hành
              </Text>
              <Icon icon={CurrencyDollarIcon} size="md" />
            </HStack>
            <Heading level={3}>{formatCurrency(grandTotalFund)}</Heading>
            <Text type="supporting">
              {data.huiGroups.length} dây hụi + {data.batHoLoans.length} bát họ
            </Text>
          </VStack>
        </Card>

        <Card>
          <VStack gap={2}>
            <HStack hAlign="between" vAlign="center">
              <Text type="supporting" color="secondary">
                Lợi Nhuận Ròng & Tiền Xâu
              </Text>
              <Icon icon={SparklesIcon} size="md" />
            </HStack>
            <Heading level={3}>{formatCurrency(grandTotalProfit)}</Heading>
            <Text type="supporting">
              Xâu hụi: {formatCurrency(totalHuiCommission)} | Cắt phế:{' '}
              {formatCurrency(totalBatHoFee)}
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
            <Heading level={3}>{formatCurrency(grandTotalCollected)}</Heading>
            <Text type="supporting">Tiền tươi đã về tài khoản / két</Text>
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
            <Heading level={3}>{formatCurrency(grandTotalDebt)}</Heading>
            <HStack gap={2} vAlign="center">
              <Text type="supporting">
                Cần đôn đốc nhắc nhở
              </Text>
              {overdueCount > 0 && (
                <Badge label={`${overdueCount} bát chậm`} variant="error" />
              )}
            </HStack>
          </VStack>
        </Card>
      </Grid>

      {/* Biểu đồ dòng tiền phân tích */}
      <Card>
        <VStack gap={4}>
          <HStack hAlign="between" vAlign="center" wrap="wrap">
            <VStack gap={1}>
              <Heading level={4}>Thống Kê So Sánh Dòng Tiền (Triệu VNĐ)</Heading>
              <Text type="supporting" color="secondary">
                Biểu đồ phân bổ nguồn vốn, số tiền đã thu hồi, dư nợ và lợi nhuận ròng
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
              <Bar dataKey="Tổng Vốn" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Đã Thu" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Còn Nợ" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Lợi Nhuận / Xâu" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </VStack>
      </Card>
    </VStack>
  );
}
