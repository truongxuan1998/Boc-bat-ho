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
  TableCellsIcon,
  CheckBadgeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { ProgressiveHuiMatrix, ProgressiveHuiMemberRow } from '@/types';

interface HuiMatrixTableProps {
  matrix: ProgressiveHuiMatrix;
  title?: string;
  subtitle?: string;
}

export function HuiMatrixTable({
  matrix,
  title = 'Bảng Ma Trận Đóng Hụi Lũy Tiến Bậc Thang',
  subtitle = 'Mô hình chuẩn theo dõi kỳ LỤM (xanh lá), kỳ đóng bù sau lụm (xám), và kỳ chân sống',
}: HuiMatrixTableProps) {
  // Định nghĩa các cột Table động theo danh sách tháng
  const columns: TableColumn<ProgressiveHuiMemberRow>[] = [
    {
      key: 'memberName',
      header: 'TÊN',
      renderCell: (row) => (
        <HStack gap={2} vAlign="center">
          <Badge label={row.memberName} variant="warning" />
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
      header: monthName.toUpperCase(),
      renderCell: (row) => {
        const cell = row.cells[idx];
        if (!cell) return <Text color="disabled">—</Text>;

        if (cell.type === 'WON') {
          return (
            <Badge
              label={cell.label}
              variant="success"
            />
          );
        }

        if (cell.type === 'DEAD') {
          return (
            <Badge
              label={cell.label}
              variant="neutral"
            />
          );
        }

        // ALIVE (Chân sống chưa lụm - ô đen)
        return (
          <Text type="supporting" color="disabled">
            —
          </Text>
        );
      },
    });
  });

  // Cột tổng kết Lãi / Lỗ ròng
  columns.push({
    key: 'netProfit',
    header: 'TỔNG LÃI / LỖ',
    renderCell: (row) => {
      if (row.netProfit > 0) {
        return (
          <Badge
            label={`+${row.netProfit} (Lời)`}
            variant="success"
          />
        );
      }
      if (row.netProfit < 0) {
        return (
          <Badge
            label={`${row.netProfit} (Lỗ)`}
            variant="error"
          />
        );
      }
      return <Badge label="0" variant="neutral" />;
    },
  });

  // Thống kê nhanh người lời nhiều nhất và người chịu lãi nhiều nhất
  const firstWinner = matrix.members[0];
  const lastWinner = matrix.members[matrix.members.length - 1];

  return (
    <VStack gap={4}>
      <Card>
        <VStack gap={3}>
          <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
            <HStack gap={3} vAlign="center">
              <Icon icon={TableCellsIcon} size="md" />
              <VStack gap={0}>
                <Heading level={4}>{title}</Heading>
                <Text type="supporting" color="secondary">
                  {subtitle} • Bước nhảy lãi: <Text weight="semibold">Δ = {matrix.interestStep}</Text>
                </Text>
              </VStack>
            </HStack>

            <HStack gap={2} vAlign="center">
              <Badge label="Ô Xanh: LỤM Tiền" variant="success" />
              <Badge label="Ô Xám: Sau Lụm (-bù)" variant="neutral" />
              <Badge label="Ô Trống: Chân Sống" variant="neutral" />
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
                Lấy Vốn Sớm Nhất (Kỳ 1)
              </Text>
              <Icon icon={ArrowTrendingDownIcon} size="md" />
            </HStack>
            <HStack gap={2} vAlign="center">
              <Heading level={3}>{firstWinner ? firstWinner.memberName : '—'}</Heading>
              {firstWinner && (
                <Badge label={`${firstWinner.netProfit} (Chịu Lãi)`} variant="error" />
              )}
            </HStack>
            <Text type="supporting">
              Lấy tiền tươi kỳ đầu để kinh doanh / xoay sở vốn, đóng bù dần qua các kỳ sau
            </Text>
          </VStack>
        </Card>

        <Card variant="muted">
          <VStack gap={2}>
            <HStack hAlign="between" vAlign="center">
              <Text type="supporting" color="secondary">
                Hốt Chót Lãi Cao Nhất (Kỳ Cuối)
              </Text>
              <Icon icon={ArrowTrendingUpIcon} size="md" />
            </HStack>
            <HStack gap={2} vAlign="center">
              <Heading level={3}>{lastWinner ? lastWinner.memberName : '—'}</Heading>
              {lastWinner && (
                <Badge label={`+${lastWinner.netProfit} (Lời Ròng)`} variant="success" />
              )}
            </HStack>
            <Text type="supporting">
              Gửi tiết kiệm trọn gói cả dây, nhận toàn bộ lãi lũy tiến từ các chân chết trước
            </Text>
          </VStack>
        </Card>
      </Grid>
    </VStack>
  );
}