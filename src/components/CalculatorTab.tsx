'use client';

import React, { useState, useMemo } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Badge } from '@astryxdesign/core/Badge';
import { Divider } from '@astryxdesign/core/Divider';
import { Icon } from '@astryxdesign/core/Icon';
import {
  CalculatorIcon,
  SparklesIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { generateProgressiveMatrix } from '@/lib/huiCalculator';
import { HuiMatrixTable } from '@/components/HuiMatrixTable';

export function CalculatorTab() {
  // 1. State cấu hình mô phỏng Ma Trận Lũy Tiến
  const [membersInput, setMembersInput] = useState('KM, BẢO, CƯỜNG, TRUNG, XUÂN, BÌNH');
  const [startMonthInput, setStartMonthInput] = useState('4');
  const [interestStepInput, setInterestStepInput] = useState('30');

  // Tính toán ma trận lũy tiến theo công thức người dùng
  const matrix = useMemo(() => {
    const rawNames = membersInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const members = rawNames.length > 0 ? rawNames : ['KM', 'BẢO', 'CƯỜNG', 'TRUNG', 'XUÂN', 'BÌNH'];
    const startMonth = parseInt(startMonthInput, 10) || 4;
    const step = parseInt(interestStepInput.replace(/\D/g, ''), 10) || 30;

    return generateProgressiveMatrix(members, startMonth, step);
  }, [membersInput, startMonthInput, interestStepInput]);

  return (
    <VStack gap={6}>
      <Card>
        <HStack gap={3} vAlign="center">
          <Icon icon={CalculatorIcon} size="lg" />
          <VStack gap={0}>
            <Heading level={3}>Máy Tính Dự Toán Hụi Lũy Tiến Bậc Thang</Heading>
            <Text type="supporting" color="secondary">
              Mô phỏng chính xác ma trận dòng tiền, kỳ LỤM tiền tươi, các kỳ đóng bù sau khi lụm và tổng kết Lãi/Lỗ ròng
            </Text>
          </VStack>
        </HStack>
      </Card>

      {/* CẤU HÌNH THÔNG SỐ MA TRẬN */}
      <Card>
        <VStack gap={4}>
          <HStack gap={2} vAlign="center">
            <Icon icon={SparklesIcon} size="md" />
            <Heading level={4}>Thiết Lập Thông Số Dây Hụi</Heading>
          </HStack>

          <Grid columns={{ minWidth: 240, repeat: 'fit' }} gap={4}>
            <TextInput
              label="Danh Sách Thành Viên (Theo Thứ Tự LỤM)"
              value={membersInput}
              onChange={setMembersInput}
              placeholder="KM, BẢO, CƯỜNG, TRUNG, XUÂN, BÌNH"
            />
            <TextInput
              label="Tháng Bắt Đầu (1 - 12)"
              value={startMonthInput}
              onChange={setStartMonthInput}
              placeholder="4"
            />
            <TextInput
              label="Bước Nhảy Lãi Lũy Tiến (Δ)"
              value={interestStepInput}
              onChange={setInterestStepInput}
              placeholder="30"
            />
          </Grid>

          <Divider />

          <HStack gap={2} vAlign="center" wrap="wrap">
            <Icon icon={InformationCircleIcon} size="sm" />
            <Text type="supporting" color="secondary">
              Công thức người lụm kỳ t: <Text weight="semibold">LỤM + [ (t - 1) × t / 2 ] × Δ</Text> • Người đã lụm đóng bù: <Text weight="semibold">-(t - k) × Δ</Text>
            </Text>
          </HStack>
        </VStack>
      </Card>

      {/* HIỂN THỊ MA TRẬN BẢNG HỤI TRỰC QUAN */}
      <HuiMatrixTable
        matrix={matrix}
        title="Ma Trận Kết Quả Dự Toán Dây Hụi"
        subtitle={`Dây ${matrix.totalMembers} thành viên từ ${matrix.months[0]} đến ${matrix.months[matrix.months.length - 1]}`}
      />
    </VStack>
  );
}
