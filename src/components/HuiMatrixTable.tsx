'use client';

import React from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Table, TableColumn } from '@astryxdesign/core/Table';
import { Badge } from '@astryxdesign/core/Badge';
import { Icon } from '@astryxdesign/core/Icon';
import { Grid } from '@astryxdesign/core/Grid';
import {
  Table as TableIcon,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { ProgressiveHuiMatrix, ProgressiveHuiMemberRow } from '@/types';

interface HuiMatrixTableProps {
  matrix: ProgressiveHuiMatrix;
  title?: string;
  subtitle?: string;
}

function formatMoneyOrStep(val: number): string {
  return new Intl.NumberFormat('vi-VN').format(val) + ' ₫';
}

export function HuiMatrixTable({
  matrix,
  title = 'Bảng ma trận đóng hụi lũy tiến bậc thang',
  subtitle = 'Mô hình chuẩn theo dõi kỳ lụm (xanh lá), kỳ đóng bù sau lụm (xám), và kỳ chân sống',
}: HuiMatrixTableProps) {
  // Định nghĩa các cột Table động theo danh sách tháng
  const columns: TableColumn<ProgressiveHuiMemberRow>[] = [
    {
      key: 'memberName',
      header: 'Thành viên',
      renderCell: (row) => (
        <HStack gap={2} vAlign="center">
          <Badge label={row.memberName} variant="yellow" />
          <Text type="supporting" color="secondary">
            (Kỳ {row.turnIndex})
          </Text>
        </HStack>
      ),
    },
  ];

  // Thêm từng cột tháng
  matrix.months.forEach((monthName, idx) => {
    columns.push({
      key: `month_${idx}`,
      header: monthName.toLowerCase().replace(/^t/, 'T'),
      renderCell: (row) => {
        const cell = row.cells[idx];
        if (!cell) return <Text color="disabled">—</Text>;

        if (cell.type === 'WON') {
          const received = cell.totalReceived || row.wonAmount;
          return (
            <VStack gap={0} hAlign="center">
              <Badge
                label={matrix.basePot > 0 ? formatMoneyOrStep(received) : cell.label}
                variant="green"
              />
              {matrix.basePot > 0 && (
                <Text type="supporting" color="secondary">
                  {cell.label}
                </Text>
              )}
            </VStack>
          );
        }

        if (cell.type === 'DEAD') {
          return (
            <VStack gap={0} hAlign="center">
              <Badge
                label={cell.label}
                variant="neutral"
              />
              {matrix.baseAmount > 0 && (
                <Text type="supporting" color="secondary">
                  Đóng: {formatMoneyOrStep(cell.totalToPay || 0)}
                </Text>
              )}
            </VStack>
          );
        }

        // ALIVE (Chân sống chưa lụm - ô đen)
        return (
          <VStack gap={0} hAlign="center">
            <Text type="supporting" color="disabled">
              —
            </Text>
            {matrix.baseAmount > 0 && (
              <Text type="supporting" color="secondary">
                Đóng: {formatMoneyOrStep(matrix.baseAmount)}
              </Text>
            )}
          </VStack>
        );
      },
    });
  });

  // Cột Số Tiền Lụm (Nhận Được)
  if (matrix.basePot > 0) {
    columns.push({
      key: 'wonAmount',
      header: 'Tiền lụm',
      renderCell: (row) => (
        <VStack gap={0} hAlign="center">
          <Badge
            label={formatMoneyOrStep(row.wonAmount)}
            variant="green"
          />
          {row.wonBonus > 0 && (
            <Text type="supporting" color="secondary">
              +{formatMoneyOrStep(row.wonBonus)} lãi
            </Text>
          )}
        </VStack>
      ),
    });

    // Cột Tổng Tiền Đã Đóng
    columns.push({
      key: 'totalPaid',
      header: 'Tổng đóng',
      renderCell: (row) => (
        <VStack gap={0} hAlign="center">
          <Text weight="semibold">
            {formatMoneyOrStep(row.totalPaid)}
          </Text>
          {row.totalInterestPaid > 0 && (
            <Text type="supporting" color="secondary">
              +{formatMoneyOrStep(row.totalInterestPaid)} bù
            </Text>
          )}
        </VStack>
      ),
    });
  }

  // Cột tổng kết Lãi / Lỗ ròng
  columns.push({
    key: 'netProfit',
    header: 'Lãi / Lỗ',
    renderCell: (row) => {
      if (row.netProfit > 0) {
        return (
          <Badge
            label={`+${formatMoneyOrStep(row.netProfit)} (Lời)`}
            variant="green"
          />
        );
      }
      if (row.netProfit < 0) {
        return (
          <Badge
            label={`${formatMoneyOrStep(row.netProfit)} (Lỗ)`}
            variant="red"
          />
        );
      }
      return <Badge label="0 ₫ (Hòa)" variant="neutral" />;
    },
  });

  // Thống kê nhanh người lời nhiều nhất và người chịu lãi nhiều nhất
  const firstWinner = matrix.members[0];
  const lastWinner = matrix.members[matrix.members.length - 1];

  return (
    <VStack gap={4}>
      <Card>
        <VStack gap={4}>
          <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
            <HStack gap={3} vAlign="center">
              <Icon icon={TableIcon} size="md" />
              <VStack gap={0}>
                <Heading level={4}>{title}</Heading>
                <Text type="supporting" color="secondary">
                  {subtitle} • Bước nhảy lãi: <Text weight="semibold">{formatMoneyOrStep(matrix.interestStep)}</Text>
                </Text>
              </VStack>
            </HStack>

            <HStack gap={2} vAlign="center" wrap="wrap">
              <Badge label="Ô xanh: Số tiền nhận được" variant="green" />
              <Badge label="Ô xám: Sau lụm (-bù)" variant="neutral" />
              <Badge label="Ô trống: Chân sống" variant="neutral" />
            </HStack>
          </HStack>

          {/* Bảng Ma Trận Dữ Liệu */}
          <Table<ProgressiveHuiMemberRow>
            data={matrix.members}
            columns={columns}
            idKey="memberId"
            density="compact"
            dividers="rows"
            hasHover
          />
        </VStack>
      </Card>

      {/* 2 Thẻ đối xứng giải thích quy luật dòng tiền */}
      <Grid columns={{ minWidth: 260, repeat: 'fit' }} gap={4}>
        <Card variant="muted">
          <VStack gap={2}>
            <HStack hAlign="between" vAlign="center">
              <Text type="supporting" color="secondary">
                Lấy vốn sớm nhất (kỳ 1)
              </Text>
              <Icon icon={TrendingDown} size="md" />
            </HStack>
            <HStack gap={2} vAlign="center">
              <Heading level={3}>{firstWinner ? firstWinner.memberName : '—'}</Heading>
              {firstWinner && (
                <Badge label={`${formatMoneyOrStep(firstWinner.netProfit)} (Chịu lãi)`} variant="red" />
              )}
            </HStack>
            <Text type="supporting">
              Lấy tiền tươi kỳ đầu để kinh doanh / xoay sở vốn ({firstWinner ? formatMoneyOrStep(firstWinner.wonAmount) : ''}), đóng bù dần qua các kỳ sau
            </Text>
          </VStack>
        </Card>

        <Card variant="muted">
          <VStack gap={2}>
            <HStack hAlign="between" vAlign="center">
              <Text type="supporting" color="secondary">
                Hốt chót lãi cao nhất (kỳ cuối)
              </Text>
              <Icon icon={TrendingUp} size="md" />
            </HStack>
            <HStack gap={2} vAlign="center">
              <Heading level={3}>{lastWinner ? lastWinner.memberName : '—'}</Heading>
              {lastWinner && (
                <Badge label={`+${formatMoneyOrStep(lastWinner.netProfit)} (Lời ròng)`} variant="green" />
              )}
            </HStack>
            <Text type="supporting">
              Gửi tiết kiệm trọn gói cả dây, nhận toàn bộ lãi lũy tiến từ các chân chết trước ({lastWinner ? formatMoneyOrStep(lastWinner.wonAmount) : ''})
            </Text>
          </VStack>
        </Card>
      </Grid>
    </VStack>
  );
}
