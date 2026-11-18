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

  const firstWinner = matrix.members[0];
  const lastWinner = matrix.members[matrix.members.length - 1];

  return (
    <VStack gap={6}>
      {/* HEADER GIỚI THIỆU */}
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

      {/* FORM THIẾT LẬP THÔNG SỐ CÂN ĐỐI */}
      <Card>
        <VStack gap={5}>
          <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
            <HStack gap={2} vAlign="center">
              <Icon icon={SparklesIcon} size="md" />
              <Heading level={4}>Thiết Lập Thông Số Dây Hụi</Heading>
            </HStack>
            <Badge
              label={`Tổng cộng: ${matrix.totalMembers} thành viên (${matrix.totalMembers} kỳ)`}
              variant="info"
            />
          </HStack>

          {/* HÀNG 1: DANH SÁCH THÀNH VIÊN RỘNG RÃI */}
          <TextInput
            label="Danh Sách Thành Viên (Theo Thứ Tự LỤM Từ Kỳ 1 Đến Chót)"
            value={membersInput}
            onChange={setMembersInput}
            placeholder="KM, BẢO, CƯỜNG, TRUNG, XUÂN"
            description="Nhập tên các thành viên cách nhau bằng dấu phẩy. Thứ tự từ trái sang phải tương ứng với thứ tự lụm các kỳ."
          />

          {/* HÀNG 2: 3 THÔNG SỐ TÀI CHÍNH CÂN ĐỐI 3 CỘT */}
          <Grid columns={{ minWidth: 200, repeat: 'fit' }} gap={4}>
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
              label="Tháng Bắt Đầu Khui Họ (1 - 12)"
              value={startMonthInput}
              onChange={setStartMonthInput}
              placeholder="4"
            />
          </Grid>

          <Divider />

          {/* 4 THẺ CHỈ SỐ KPI TRỰC QUAN ĐỐI XỨNG CẢ 4 CỘT */}
          <Grid columns={{ minWidth: 220, repeat: 'fit' }} gap={4}>
            <Card variant="muted">
              <VStack gap={1}>
                <HStack hAlign="between" vAlign="center">
                  <Text type="supporting" color="secondary">
                    Tiền LỤM Gốc / Kỳ
                  </Text>
                  <Badge label="Gốc" variant="info" />
                </HStack>
                <Heading level={3}>{formatMoney(matrix.basePot)}</Heading>
                <Text type="supporting" color="secondary">
                  ({matrix.totalMembers} - 1) × {formatMoney(matrix.baseAmount)}
                </Text>
              </VStack>
            </Card>

            <Card variant="muted">
              <VStack gap={1}>
                <HStack hAlign="between" vAlign="center">
                  <Text type="supporting" color="secondary">
                    Bước Nhảy Lãi (Δ)
                  </Text>
                  <Badge label="Lũy Tiến" variant="warning" />
                </HStack>
                <Heading level={3}>+{formatMoney(matrix.interestStep)}</Heading>
                <Text type="supporting" color="secondary">
                  Tăng dần theo từng tháng
                </Text>
              </VStack>
            </Card>

            <Card variant="muted">
              <VStack gap={1}>
                <HStack hAlign="between" vAlign="center">
                  <Text type="supporting" color="secondary">
                    Kỳ 1 Nhận ({firstWinner ? firstWinner.memberName : '—'})
                  </Text>
                  <Badge label="Kỳ Đầu" variant="neutral" />
                </HStack>
                <Heading level={3}>
                  {firstWinner ? formatMoney(firstWinner.wonAmount) : formatMoney(matrix.basePot)}
                </Heading>
                <Text type="supporting" color="secondary">
                  Lấy vốn sớm, đóng bù sau
                </Text>
              </VStack>
            </Card>

            <Card variant="muted">
              <VStack gap={1}>
                <HStack hAlign="between" vAlign="center">
                  <Text type="supporting" color="secondary">
                    Kỳ Cuối Nhận ({lastWinner ? lastWinner.memberName : '—'})
                  </Text>
                  <Badge label="Chót Hụi" variant="success" />
                </HStack>
                <Heading level={3}>
                  {lastWinner ? formatMoney(lastWinner.wonAmount) : '—'}
                </Heading>
                <Text type="supporting" color="secondary">
                  Lãi ròng cao nhất (+{lastWinner ? formatMoney(lastWinner.wonBonus) : ''})
                </Text>
              </VStack>
            </Card>
          </Grid>

          {/* BANNER NGUYÊN TẮC DÒNG TIỀN GỌN GÀNG */}
          <Card variant="default">
            <HStack gap={3} vAlign="center">
              <Icon icon={BanknotesIcon} size="md" />
              <VStack gap={0}>
                <Text weight="semibold">
                  Quy tắc nhận tiền tháng LỤM ({matrix.totalMembers} người chơi • Đóng {formatMoney(matrix.baseAmount)}/chân)
                </Text>
                <Text type="supporting" color="secondary">
                  Tháng người nào LỤM sẽ nhận đủ: <Text weight="semibold">{formatMoney(matrix.basePot)} (gốc)</Text> + <Text weight="semibold">Tiền lãi lũy tiến</Text> do các thành viên đã lụm trước đó đóng bù (Kỳ 1 nhận {formatMoney(matrix.basePot)}, Kỳ 2 nhận {formatMoney(matrix.basePot + matrix.interestStep)},...).
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
