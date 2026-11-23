'use client';

import React from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import {
  Table,
  TableColumn,
  pixel,
  useTableStickyColumns,
} from '@astryxdesign/core/Table';
import { Badge } from '@astryxdesign/core/Badge';
import { Icon } from '@astryxdesign/core/Icon';
import { Grid } from '@astryxdesign/core/Grid';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { ProgressiveHuiMatrix, ProgressiveHuiMemberRow } from '@/types';
import { formatCurrency } from '@/lib/huiCalculator';

interface HuiMatrixTableProps {
  matrix: ProgressiveHuiMatrix;
  title?: string;
  subtitle?: string;
}

export function ProfitBadge({ value }: { value: number }) {
  if (value > 0) return <Badge label={`+${formatCurrency(value)}`} variant="green" />;
  if (value < 0) return <Badge label={formatCurrency(value)} variant="red" />;
  return <Badge label="Hòa vốn" variant="neutral" />;
}

export function HuiMatrixTable({
  matrix,
  title = 'Ma trận đóng hụi lũy tiến',
  subtitle,
}: HuiMatrixTableProps) {
  // Cố định cột "Thành viên" khi cuộn ngang
  const stickyPlugin = useTableStickyColumns<ProgressiveHuiMemberRow>({
    startKeys: ['memberName'],
  });

  const columns: TableColumn<ProgressiveHuiMemberRow>[] = [
    {
      key: 'memberName',
      header: 'Thành viên',
      width: pixel(124),
      renderCell: (row) => (
        <VStack gap={0}>
          <Text weight="semibold" maxLines={1}>
            {row.memberName}
          </Text>
          <Text type="supporting" color="secondary">
            Lụm kỳ {row.turnIndex}
          </Text>
        </VStack>
      ),
    },
  ];

  matrix.months.forEach((monthName, idx) => {
    columns.push({
      key: `month_${idx}`,
      header: monthName,
      align: 'center',
      width: pixel(116),
      renderCell: (row) => {
        const cell = row.cells[idx];
        if (!cell) return <Text color="disabled">—</Text>;

        if (cell.type === 'WON') {
          return (
            <VStack gap={0.5} hAlign="center">
              <Badge label={formatCurrency(cell.totalReceived || row.wonAmount)} variant="green" />
              <Text type="supporting" color="secondary">
                {cell.label}
              </Text>
            </VStack>
          );
        }

        if (cell.type === 'DEAD') {
          return (
            <VStack gap={0.5} hAlign="center">
              <Text weight="semibold" hasTabularNumbers>
                {formatCurrency(cell.totalToPay || 0)}
              </Text>
              <Badge label={cell.label} variant="orange" />
            </VStack>
          );
        }

        // Chân sống: đóng gốc
        return (
          <Text color="secondary" hasTabularNumbers>
            {formatCurrency(matrix.baseAmount)}
          </Text>
        );
      },
    });
  });

  columns.push(
    {
      key: 'totalPaid',
      header: 'Tổng đóng',
      align: 'end',
      width: pixel(124),
      renderCell: (row) => (
        <VStack gap={0} hAlign="end">
          <Text weight="semibold" hasTabularNumbers>
            {formatCurrency(row.totalPaid)}
          </Text>
          {row.totalInterestPaid > 0 && (
            <Text type="supporting" color="secondary" hasTabularNumbers>
              gồm {formatCurrency(row.totalInterestPaid)} bù
            </Text>
          )}
        </VStack>
      ),
    },
    {
      key: 'netProfit',
      header: 'Lãi/lỗ cả dây',
      align: 'end',
      width: pixel(124),
      renderCell: (row) => <ProfitBadge value={row.netProfit} />,
    }
  );

  const firstWinner = matrix.members[0];
  const lastWinner = matrix.members[matrix.members.length - 1];

  return (
    <VStack gap={4}>
      <Card>
        <VStack gap={4}>
          <HStack hAlign="between" vAlign="start" wrap="wrap" gap={3}>
            <VStack gap={1}>
              <Heading level={2}>{title}</Heading>
              <Text type="supporting" color="secondary">
                {subtitle ? `${subtitle} · ` : ''}Lãi tăng {formatCurrency(matrix.interestStep)} mỗi kỳ
              </Text>
            </VStack>

            <HStack gap={4} vAlign="center" wrap="wrap">
              <HStack gap={1.5} vAlign="center">
                <StatusDot variant="success" label="Tháng lụm" />
                <Text type="supporting">Tháng lụm (tiền nhận)</Text>
              </HStack>
              <HStack gap={1.5} vAlign="center">
                <StatusDot variant="warning" label="Đóng bù" />
                <Text type="supporting">Sau lụm (đóng gốc + bù)</Text>
              </HStack>
              <HStack gap={1.5} vAlign="center">
                <StatusDot variant="neutral" label="Chân sống" />
                <Text type="supporting">Chân sống (đóng gốc)</Text>
              </HStack>
            </HStack>
          </HStack>

          <Table<ProgressiveHuiMemberRow>
            data={matrix.members}
            columns={columns}
            idKey="memberId"
            density="compact"
            dividers="rows"
            hasHover
            plugins={{ sticky: stickyPlugin }}
          />
        </VStack>
      </Card>

      {firstWinner && lastWinner && matrix.members.length > 1 && (
        <Grid columns={{ minWidth: 260, repeat: 'fit' }} gap={4}>
          <Card variant="muted">
            <VStack gap={2}>
              <HStack hAlign="between" vAlign="center">
                <Text type="supporting" color="secondary">
                  Lụm đầu (kỳ 1): lấy vốn sớm
                </Text>
                <Icon icon={TrendingDown} size="md" color="red" />
              </HStack>
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Heading level={3}>{firstWinner.memberName}</Heading>
                <ProfitBadge value={firstWinner.netProfit} />
              </HStack>
              <Text type="supporting">
                Nhận {formatCurrency(firstWinner.wonAmount)} ngay kỳ đầu, sau đó đóng bù tăng dần mỗi kỳ.
              </Text>
            </VStack>
          </Card>

          <Card variant="muted">
            <VStack gap={2}>
              <HStack hAlign="between" vAlign="center">
                <Text type="supporting" color="secondary">
                  Lụm chót (kỳ {lastWinner.turnIndex}): lãi cao nhất
                </Text>
                <Icon icon={TrendingUp} size="md" color="green" />
              </HStack>
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Heading level={3}>{lastWinner.memberName}</Heading>
                <ProfitBadge value={lastWinner.netProfit} />
              </HStack>
              <Text type="supporting">
                Nhận {formatCurrency(lastWinner.wonAmount)} ở kỳ cuối, gồm toàn bộ tiền bù của các chân lụm trước.
              </Text>
            </VStack>
          </Card>
        </Grid>
      )}
    </VStack>
  );
}
