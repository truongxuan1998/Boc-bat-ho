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
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { generateProgressiveMatrix } from '@/lib/huiCalculator';
import { HuiMatrixTable } from '@/components/HuiMatrixTable';

function formatMoney(val: number): string {
  return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
}

export function CalculatorTab() {
  // 1. State cấu hình mô phỏng Ma Trận Lũy Tiến
  // Mặc định 5 người chơi và đóng 3.000.000 đ như ví dụ người dùng
  const [membersInput, setMembersInput] = useState('KM, BẢO, CƯỜNG, TRUNG, XUÂN');
  const [amountPerSlotInput, setAmountPerSlotInput] = useState('3000000');
  const [interestStepInput, setInterestStepInput] = useState('30000');
  const [startMonthInput, setStartMonthInput] = useState('4');

  // Tính toán ma trận lũy tiến theo công thức người dùng
  const matrix = useMemo(() => {
    const rawNames = membersInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const members = rawNames.length > 0 ? rawNames : ['KM', 'BẢO', 'CƯỜNG', 'TRUNG', 'XUÂN'];
    const startMonth = parseInt(startMonthInput, 10) || 4;
    const step = parseInt(interestStepInput.replace(/\D/g, ''), 10) || 30000;
    const amountPerSlot = parseInt(amountPerSlotInput.replace(/\D/g, ''), 10) || 3000000;

    return generateProgressiveMatrix(members, startMonth, step, amountPerSlot);
  }, [membersInput, amountPerSlotInput, startMonthInput, interestStepInput]);

  return (
    <VStack gap={6}>
      <Card>
        <HStack gap={3} vAlign="center">
          <Icon icon={CalculatorIcon} size="lg" />
          <VStack gap={0}>
            <Heading level={3}>Máy Tính Dự Toán Hụi Lũy Tiến Bậc Thang</Heading>
            <Text type="supporting" color="secondary">
              Mô phỏng chính xác số tiền nhận được tháng LỤM (Gốc + Lãi), các kỳ đóng bù sau lụm và tổng kết Lãi/Lỗ ròng
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
              placeholder="KM, BẢO, CƯỜNG, TRUNG, XUÂN"
            />
            <TextInput
              label="Tiền Đóng Hụi Mỗi Chân (VNĐ)"
              value={amountPerSlotInput}
              onChange={setAmountPerSlotInput}
              placeholder="3000000"
            />
            <TextInput
              label="Bước Nhảy Lãi Lũy Tiến Δ (VNĐ)"
              value={interestStepInput}
              onChange={setInterestStepInput}
              placeholder="30000"
            />
            <TextInput
              label="Tháng Bắt Đầu (1 - 12)"
              value={startMonthInput}
              onChange={setStartMonthInput}
              placeholder="4"
            />
          </Grid>

          <Divider />

          {/* HỘP GIẢI THÍCH VÍ DỤ RÕ RÀNG */}
          <Card variant="muted">
            <HStack gap={3} vAlign="center">
              <Icon icon={BanknotesIcon} size="md" />
              <VStack gap={1}>
                <Heading level={4}>
                  Cơ Chế Tiền Nhận Khi LỤM ({matrix.totalMembers} người chơi • Đóng {formatMoney(matrix.baseAmount)}/chân)
                </Heading>
                <Text type="supporting" color="secondary">
                  • <Text weight="semibold">Tiền LỤM gốc nhận được:</Text> ({matrix.totalMembers} - 1) người đóng × {formatMoney(matrix.baseAmount)} = <Badge label={formatMoney(matrix.basePot)} variant="success" />
                </Text>
                <Text type="supporting" color="secondary">
                  • <Text weight="semibold">Tháng người nào LỤM sẽ nhận:</Text> {formatMoney(matrix.basePot)} + Tiền Lãi Lũy Tiến
                </Text>
                <Text type="supporting" color="secondary">
                  (Ví dụ: Kỳ 1 nhận <Text weight="semibold">{formatMoney(matrix.basePot)}</Text>, Kỳ 2 nhận <Text weight="semibold">{formatMoney(matrix.basePot + matrix.interestStep)}</Text>, Kỳ 3 nhận <Text weight="semibold">{formatMoney(matrix.basePot + 3 * matrix.interestStep)}</Text>...)
                </Text>
              </VStack>
            </HStack>
          </Card>
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
