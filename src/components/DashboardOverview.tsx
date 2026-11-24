'use client';

import React, { useMemo } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Grid, GridSpan } from '@astryxdesign/core/Grid';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Table, TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Wallet, CheckCircle2, AlertCircle, CalendarClock, Plus, Users } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { SystemData, HuiGroup } from '@/types';
import { formatCurrency, generateProgressiveMatrix } from '@/lib/huiCalculator';
import { formatDateVi } from '@/lib/format';

interface DashboardOverviewProps {
  data: SystemData;
  onGoToHui: () => void;
}

interface GroupSummary extends Record<string, unknown> {
  id: string;
  name: string;
  totalValue: number; // Tổng tiền góp của cả chu kỳ dây hụi
  collected: number; // Đã thu trong các kỳ đã khui
  debt: number; // Còn nợ trong các kỳ đã khui
  periodsOpened: number;
  totalSlots: number;
  latestDate?: string;
  latestWinner?: string;
}

// Tổng tiền góp cả chu kỳ = tổng số tiền tất cả các kỳ lụm (gốc + lãi lũy tiến)
function summarizeGroup(hui: HuiGroup): GroupSummary {
  const matrix = generateProgressiveMatrix(
    hui.slots.map((s) => s.memberName),
    hui.startMonth || 4,
    hui.interestStep ?? 0,
    hui.amountPerSlot
  );
  const totalValue = matrix.members.reduce((sum, m) => sum + m.wonAmount, 0);

  let collected = 0;
  let debt = 0;
  for (const period of hui.periods || []) {
    for (const p of period.payments) {
      if (p.isPaid) collected += p.amountToPay;
      else debt += p.amountToPay;
    }
  }
  const latest = hui.periods?.[hui.periods.length - 1];

  return {
    id: hui.id,
    name: hui.name,
    totalValue,
    collected,
    debt,
    periodsOpened: hui.periods?.length || 0,
    totalSlots: hui.totalSlots,
    latestDate: latest?.openDate,
    latestWinner: latest?.winnerName,
  };
}

// Làm tròn về đơn vị triệu, giữ 1 chữ số thập phân
const toMillions = (v: number) => Math.round(v / 100000) / 10;

const CHART_SERIES = [
  { key: 'tongGiaTri', name: 'Tổng giá trị dây', color: 'var(--color-accent)', dot: 'accent' },
  { key: 'daThu', name: 'Đã thu', color: 'var(--color-success)', dot: 'success' },
  { key: 'conNo', name: 'Còn nợ', color: 'var(--color-warning)', dot: 'warning' },
] as const;

export function DashboardOverview({ data, onGoToHui }: DashboardOverviewProps) {
  const isCompact = useMediaQuery('(max-width: 640px)');
  const summaries = useMemo(() => data.huiGroups.map(summarizeGroup), [data.huiGroups]);

  if (summaries.length === 0) {
    return (
      <Card padding={8}>
        <EmptyState
          icon={<Icon icon={Users} size="lg" />}
          title="Chưa có dây hụi nào"
          description="Tạo dây hụi đầu tiên để bắt đầu theo dõi tiền đóng, kỳ khui và lãi lũy tiến của từng thành viên."
          actions={
            <Button
              label="Tạo dây hụi"
              variant="primary"
              icon={<Icon icon={Plus} />}
              onClick={onGoToHui}
            />
          }
        />
      </Card>
    );
  }

  const totals = summaries.reduce(
    (acc, s) => ({
      totalValue: acc.totalValue + s.totalValue,
      collected: acc.collected + s.collected,
      debt: acc.debt + s.debt,
      periodsOpened: acc.periodsOpened + s.periodsOpened,
      totalSlots: acc.totalSlots + s.totalSlots,
    }),
    { totalValue: 0, collected: 0, debt: 0, periodsOpened: 0, totalSlots: 0 }
  );
  const unpaidCount = data.huiGroups.reduce(
    (n, h) =>
      n + (h.periods || []).reduce((m, p) => m + p.payments.filter((x) => !x.isPaid).length, 0),
    0
  );
  const collectedPct = totals.totalValue > 0 ? Math.round((totals.collected / totals.totalValue) * 100) : 0;
  const progressPct = totals.totalSlots > 0 ? Math.round((totals.periodsOpened / totals.totalSlots) * 100) : 0;

  const chartData = summaries.map((s) => ({
    category: s.name,
    tongGiaTri: toMillions(s.totalValue),
    daThu: toMillions(s.collected),
    conNo: toMillions(s.debt),
  }));

  const valueSize = isCompact ? 'xl' : '2xl';

  const kpis = [
    {
      label: 'Tổng giá trị',
      value: formatCurrency(totals.totalValue),
      icon: Wallet,
      iconColor: 'blue',
      footer: (
        <Text type="supporting" color="secondary">
          {summaries.length} dây · tính trọn chu kỳ
        </Text>
      ),
    },
    {
      label: 'Đã thu',
      value: formatCurrency(totals.collected),
      icon: CheckCircle2,
      iconColor: 'green',
      footer: (
        <Text type="supporting" color="secondary">
          {collectedPct}% tổng giá trị
        </Text>
      ),
    },
    {
      label: 'Còn phải thu',
      value: formatCurrency(totals.debt),
      icon: AlertCircle,
      iconColor: 'orange',
      footer:
        unpaidCount > 0 ? (
          <Badge label={`${unpaidCount} lượt chưa đóng`} variant="orange" />
        ) : (
          <Text type="supporting" color="secondary">
            Không có khoản nợ
          </Text>
        ),
    },
    {
      label: 'Tiến độ khui',
      value: `${totals.periodsOpened}/${totals.totalSlots} kỳ`,
      icon: CalendarClock,
      iconColor: 'purple',
      footer: (
        <ProgressBar
          label="Tiến độ khui hụi"
          isLabelHidden
          value={totals.periodsOpened}
          max={totals.totalSlots || 1}
          variant="accent"
        />
      ),
      sub: `${progressPct}%`,
    },
  ] as const;

  const groupColumns: TableColumn<GroupSummary>[] = [
    {
      key: 'name',
      header: 'Dây hụi',
      width: proportional(2, { minWidth: 140 }),
      renderCell: (s) => (
        <VStack gap={0}>
          <Text weight="semibold" maxLines={1}>
            {s.name}
          </Text>
          <Text type="supporting" color="secondary">
            {isCompact
              ? `Đã thu ${formatCurrency(s.collected)}${s.debt > 0 ? ` · nợ ${formatCurrency(s.debt)}` : ''}`
              : s.latestWinner
              ? `Kỳ gần nhất ${formatDateVi(s.latestDate)} · ${s.latestWinner}`
              : 'Chưa khui kỳ nào'}
          </Text>
        </VStack>
      ),
    },
    {
      key: 'progress',
      header: 'Tiến độ',
      width: proportional(1.5, { minWidth: 96 }),
      renderCell: (s) => (
        <VStack gap={1}>
          <Text type="supporting" hasTabularNumbers>
            {s.periodsOpened}/{s.totalSlots} kỳ
          </Text>
          <ProgressBar
            label={`Tiến độ ${s.name}`}
            isLabelHidden
            value={s.periodsOpened}
            max={s.totalSlots || 1}
            variant={s.periodsOpened === s.totalSlots ? 'success' : 'accent'}
          />
        </VStack>
      ),
    },
    {
      key: 'collected',
      header: 'Đã thu',
      align: 'end',
      width: pixel(130),
      renderCell: (s) => <Text hasTabularNumbers>{formatCurrency(s.collected)}</Text>,
    },
    {
      key: 'debt',
      header: 'Còn nợ',
      align: 'end',
      width: pixel(130),
      renderCell: (s) =>
        s.debt > 0 ? (
          <Text weight="semibold" hasTabularNumbers>
            {formatCurrency(s.debt)}
          </Text>
        ) : (
          <Text color="secondary">—</Text>
        ),
    },
  ];

  return (
    <VStack gap={isCompact ? 4 : 6}>
      <Grid columns={{ minWidth: isCompact ? 150 : 220, repeat: 'fit' }} gap={isCompact ? 3 : 4}>
        {kpis.map((k, idx) => (
          <GridSpan key={k.label} columns={isCompact && idx === 0 ? 'full' : 1}>
          <Card variant={idx === 0 ? 'blue' : 'default'}>
            <VStack gap={3}>
              <HStack hAlign="between" vAlign="center" gap={2} wrap="nowrap">
                <Text type="supporting" color="secondary" maxLines={1}>
                  {k.label}
                </Text>
                <Icon icon={k.icon} size="md" color={idx === 0 ? 'secondary' : k.iconColor} />
              </HStack>
              <HStack vAlign="end" gap={2} wrap="nowrap">
                <Text size={valueSize} weight="bold" hasTabularNumbers maxLines={1}>
                  {k.value}
                </Text>
                {'sub' in k && (
                  <Text type="supporting" color="secondary">
                    {k.sub}
                  </Text>
                )}
              </HStack>
              {k.footer}
            </VStack>
          </Card>
          </GridSpan>
        ))}
      </Grid>

      <Card>
        <VStack gap={4}>
          <HStack hAlign="between" vAlign="start" wrap="wrap" gap={3}>
            <VStack gap={1}>
              <Heading level={2}>Dòng tiền theo dây hụi</Heading>
              <Text type="supporting" color="secondary">
                Đơn vị: triệu ₫. Tổng giá trị tính trọn chu kỳ; đã thu và còn nợ tính trên các kỳ đã khui.
              </Text>
            </VStack>
            <HStack gap={4} vAlign="center" wrap="wrap">
              {CHART_SERIES.map((s) => (
                <HStack key={s.key} gap={1.5} vAlign="center">
                  <StatusDot variant={s.dot} label={s.name} />
                  <Text type="supporting">{s.name}</Text>
                </HStack>
              ))}
            </HStack>
          </HStack>

          <ResponsiveContainer width="100%" height={isCompact ? 220 : 280}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="category"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 13 }}
              />
              <YAxis
                unit=" tr"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: 'var(--color-accent-muted)', opacity: 0.4 }}
                formatter={(value) => `${value} triệu ₫`}
                contentStyle={{
                  backgroundColor: 'var(--color-background-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--radius-element)',
                }}
                labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 600 }}
              />
              {CHART_SERIES.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.name}
                  fill={s.color}
                  maxBarSize={36}
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </VStack>
      </Card>

      <Card>
        <VStack gap={3}>
          <Heading level={2}>Các dây hụi</Heading>
          <Table<GroupSummary>
            data={summaries}
            columns={isCompact ? groupColumns.slice(0, 2) : groupColumns}
            idKey="id"
            density="compact"
            dividers="rows"
          />
        </VStack>
      </Card>
    </VStack>
  );
}
