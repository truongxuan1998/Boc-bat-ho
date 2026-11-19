'use client';

import React from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Badge } from '@astryxdesign/core/Badge';
import { Icon } from '@astryxdesign/core/Icon';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import {
  Wallet,
  CheckCircle2,
  AlertCircle,
  CalendarClock,
} from 'lucide-react';
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

  // Dữ liệu biểu đồ phân tích theo từng dây hụi (Đơn vị triệu ₫)
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
            tongVon: Math.round((g.amountPerSlot * g.totalSlots) / 1000000),
            daThu: Math.round(col / 1000000),
            conNo: Math.round(debt / 1000000),
          };
        })
      : [
          {
            category: 'Chưa có dây hụi',
            tongVon: 0,
            daThu: 0,
            conNo: 0,
          },
        ];

  return (
    <VStack gap={6}>
      {/* 4 THẺ CHỈ SỐ KPI CHÍNH */}
      <Grid columns={{ minWidth: 260, repeat: 'fit' }} gap={4}>
        {/* THẺ 1: TỔNG VỐN DÂY HỤI */}
        <Card>
          <VStack gap={2}>
            <HStack hAlign="between" vAlign="center">
              <Text type="supporting" color="secondary">
                Tổng vốn các dây hụi
              </Text>
              <Card variant="muted" padding={1.5}>
                <Icon icon={Wallet} size="md" color="blue" />
              </Card>
            </HStack>
            <Heading level={3}>
              <Text size="2xl" weight="bold" hasTabularNumbers>
                {formatCurrency(totalHuiFund)}
              </Text>
            </Heading>
            <Text type="supporting" color="secondary">
              {data.huiGroups.length} dây hụi đang hoạt động
            </Text>
          </VStack>
        </Card>

        {/* THẺ 2: TỔNG TIỀN ĐÃ THU */}
        <Card>
          <VStack gap={2}>
            <HStack hAlign="between" vAlign="center">
              <Text type="supporting" color="secondary">
                Tổng tiền đã thu
              </Text>
              <Card variant="muted" padding={1.5}>
                <Icon icon={CheckCircle2} size="md" color="green" />
              </Card>
            </HStack>
            <Heading level={3}>
              <Text size="2xl" weight="bold" hasTabularNumbers>
                {formatCurrency(totalHuiCollected)}
              </Text>
            </Heading>
            <Text type="supporting" color="secondary">
              Các chân hụi đã đóng hoàn tất
            </Text>
          </VStack>
        </Card>

        {/* THẺ 3: DƯ NỢ CÒN PHẢI THU */}
        <Card>
          <VStack gap={2}>
            <HStack hAlign="between" vAlign="center">
              <Text type="supporting" color="secondary">
                Dư nợ còn phải thu
              </Text>
              <Card variant="muted" padding={1.5}>
                <Icon icon={AlertCircle} size="md" color="orange" />
              </Card>
            </HStack>
            <Heading level={3}>
              <Text size="2xl" weight="bold" hasTabularNumbers>
                {formatCurrency(totalHuiDebt)}
              </Text>
            </Heading>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <Text type="supporting" color="secondary">
                {totalHuiDebt > 0 ? 'Cần đôn đốc nhắc nhở' : 'Chưa có khoản nợ cần thu'}
              </Text>
              {totalUnpaidSlots > 0 && (
                <Badge label={`${totalUnpaidSlots} chân chưa đóng`} variant="orange" />
              )}
            </HStack>
          </VStack>
        </Card>

        {/* THẺ 4: TIẾN ĐỘ KHUI HỤI KÈM PROGRESS BAR */}
        <Card>
          <VStack gap={2}>
            <HStack hAlign="between" vAlign="center">
              <Text type="supporting" color="secondary">
                Tiến độ khui hụi
              </Text>
              <Card variant="muted" padding={1.5}>
                <Icon icon={CalendarClock} size="md" color="purple" />
              </Card>
            </HStack>
            <Heading level={3}>
              <Text size="2xl" weight="bold" hasTabularNumbers>
                {totalPeriodsOpened} / {totalSlotsCount} kỳ
              </Text>
            </Heading>
            <VStack gap={1}>
              <ProgressBar
                label="Tiến độ khui hụi"
                isLabelHidden
                value={totalPeriodsOpened}
                max={totalSlotsCount > 0 ? totalSlotsCount : 1}
                variant="accent"
              />
              <Text type="supporting" color="secondary">
                {totalSlotsCount > 0
                  ? `Đạt ${Math.round((totalPeriodsOpened / totalSlotsCount) * 100)}% tổng số kỳ`
                  : 'Chưa có dây hụi nào'}
              </Text>
            </VStack>
          </VStack>
        </Card>
      </Grid>

      {/* BIỂU ĐỒ DÒNG TIỀN PHÂN TÍCH */}
      <Card>
        <VStack gap={4}>
          <HStack hAlign="between" vAlign="center" wrap="wrap">
            <VStack gap={1}>
              <Heading level={4}>Thống kê dòng tiền dây hụi (triệu ₫)</Heading>
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
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.7} />
              <XAxis
                dataKey="category"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 13 }}
              />
              <YAxis
                unit=" tr"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <Tooltip formatter={(value) => [`${value} triệu ₫`]} />
              <Bar
                dataKey="tongVon"
                name="Tổng vốn dây"
                fill="#3b82f6"
                maxBarSize={44}
                radius={[6, 6, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="daThu"
                name="Đã thu"
                fill="#10b981"
                maxBarSize={44}
                radius={[6, 6, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="conNo"
                name="Còn nợ"
                fill="#f59e0b"
                maxBarSize={44}
                radius={[6, 6, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>

          {/* CHÚ THÍCH BIỂU ĐỒ (LEGEND) CHUẨN XÁC THEO LOGIC THỨ TỰ */}
          <HStack hAlign="center" vAlign="center" gap={4} wrap="wrap">
            <Badge variant="blue" label="Tổng vốn dây" />
            <Badge variant="green" label="Đã thu" />
            <Badge variant="orange" label="Còn nợ" />
          </HStack>
        </VStack>
      </Card>
    </VStack>
  );
}
