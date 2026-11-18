'use client';

import React, { useState, useMemo } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Grid, GridSpan } from '@astryxdesign/core/Grid';
import { TextInput } from '@astryxdesign/core/TextInput';
import { InputGroup, InputGroupText } from '@astryxdesign/core/InputGroup';
import { Selector } from '@astryxdesign/core/Selector';
import { Token } from '@astryxdesign/core/Token';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Badge } from '@astryxdesign/core/Badge';
import { Divider } from '@astryxdesign/core/Divider';
import { Icon } from '@astryxdesign/core/Icon';
import {
  CalculatorIcon,
  AdjustmentsHorizontalIcon,
  BanknotesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { generateProgressiveMatrix, formatCurrency } from '@/lib/huiCalculator';
import { HuiMatrixTable } from '@/components/HuiMatrixTable';

// Định dạng số có dấu chấm phân cách hàng nghìn (chuẩn Việt Nam)
function formatNumberDots(val: number): string {
  if (!val && val !== 0) return '';
  return new Intl.NumberFormat('vi-VN').format(val);
}

// Danh sách lựa chọn 12 tháng
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Tháng ${i + 1}`,
}));

export function CalculatorTab() {
  // 1. State danh sách thành viên (Chip / Tag)
  const [members, setMembers] = useState<string[]>([
    'KM',
    'BẢO',
    'CƯỜNG',
    'TRUNG',
    'XUÂN',
  ]);
  const [newMemberText, setNewMemberText] = useState<string>('');
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // 2. State thông số tài chính dạng số nguyên (number)
  const [amountPerSlot, setAmountPerSlot] = useState<number>(3000000);
  const [interestStep, setInterestStep] = useState<number>(30000);
  const [startMonth, setStartMonth] = useState<number>(4);

  // Xử lý thêm thành viên mới
  const handleAddMembers = (raw: string) => {
    if (!raw.trim()) return;
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (parts.length > 0) {
      setMembers((prev) => [...prev, ...parts]);
      setNewMemberText('');
    }
  };

  // Xử lý xóa thành viên
  const handleRemoveMember = (idxToRemove: number) => {
    if (members.length <= 2) {
      alert('Dây hụi cần tối thiểu 2 thành viên để tính toán.');
      return;
    }
    setMembers((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  // Xử lý đổi thứ tự kỳ lụm bằng mũi tên
  const handleMoveMember = (fromIndex: number, direction: -1 | 1) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= members.length) return;
    setMembers((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  // Xử lý kéo thả (Drag and drop) chip thành viên
  const handleDrop = (toIndex: number) => {
    if (draggedIdx === null || draggedIdx === toIndex) return;
    setMembers((prev) => {
      const next = [...prev];
      const [moved] = next.splice(draggedIdx, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDraggedIdx(null);
  };

  // Tính toán ma trận lũy tiến theo công thức
  const matrix = useMemo(() => {
    const validMembers = members.length > 0 ? members : ['KM', 'BẢO'];
    return generateProgressiveMatrix(
      validMembers,
      startMonth,
      interestStep,
      amountPerSlot
    );
  }, [members, startMonth, interestStep, amountPerSlot]);

  const firstWinner = matrix.members[0];
  const lastWinner = matrix.members[matrix.members.length - 1];

  return (
    <VStack gap={6} width="100%" maxWidth={1120}>
      {/* 1. HEADER GIỚI THIỆU */}
      <Card>
        <HStack gap={3} vAlign="center">
          <Icon icon={CalculatorIcon} size="lg" />
          <VStack gap={0}>
            <Heading level={3}>Máy tính dự toán hụi lũy tiến bậc thang</Heading>
            <Text type="supporting" color="secondary">
              Mô phỏng chính xác số tiền nhận được tháng lụm (gốc + lãi), các kỳ đóng bù sau lụm và tổng kết lãi/lỗ ròng
            </Text>
          </VStack>
        </HStack>
      </Card>

      {/* 2. FORM THIẾT LẬP THÔNG SỐ CÂN ĐỐI */}
      <Card padding={5}>
        <VStack gap={5}>
          {/* TIÊU ĐỀ KHU VỰC THIẾT LẬP */}
          <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
            <HStack gap={2} vAlign="center">
              <Icon icon={AdjustmentsHorizontalIcon} size="md" />
              <Heading level={4}>Thiết lập thông số dây hụi</Heading>
            </HStack>
            <Badge
              label={`Tổng cộng: ${matrix.totalMembers} thành viên (${matrix.totalMembers} kỳ)`}
              variant="info"
            />
          </HStack>

          {/* KHU VỰC NHẬP DANH SÁCH THÀNH VIÊN DẠNG TAG / CHIP */}
          <VStack gap={3}>
            <VStack gap={1}>
              <Text weight="semibold">
                Danh sách thành viên (theo thứ tự lụm từ kỳ 1 đến chót)
              </Text>
              <Text type="supporting" color="secondary">
                Gõ tên rồi nhấn Enter hoặc dấu phẩy để thêm. Kéo thả chip hoặc bấm mũi tên ‹ › để sắp xếp lại thứ tự kỳ lụm.
              </Text>
            </VStack>

            <Card variant="muted" padding={4}>
              <VStack gap={4}>
                {/* HÀNG CÁC CHIP THÀNH VIÊN TRỰC QUAN */}
                <HStack wrap="wrap" gap={2} vAlign="center">
                  {members.map((name, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === members.length - 1;
                    const tokenColor = isFirst
                      ? 'yellow'
                      : isLast
                      ? 'green'
                      : 'default';

                    return (
                      <HStack
                        key={`${name}-${idx}`}
                        gap={1}
                        vAlign="center"
                        draggable
                        onDragStart={() => setDraggedIdx(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(idx)}
                      >
                        <Token
                          label={`${idx + 1}. ${name}`}
                          color={tokenColor}
                          size="md"
                          onRemove={() => handleRemoveMember(idx)}
                        />
                        <HStack gap={0} vAlign="center">
                          <IconButton
                            label={`Di chuyển ${name} sang trái (lên kỳ trước)`}
                            icon={<Icon icon={ChevronLeftIcon} size="xsm" />}
                            size="sm"
                            variant="ghost"
                            isDisabled={isFirst}
                            onClick={() => handleMoveMember(idx, -1)}
                          />
                          <IconButton
                            label={`Di chuyển ${name} sang phải (xuống kỳ sau)`}
                            icon={<Icon icon={ChevronRightIcon} size="xsm" />}
                            size="sm"
                            variant="ghost"
                            isDisabled={isLast}
                            onClick={() => handleMoveMember(idx, 1)}
                          />
                        </HStack>
                      </HStack>
                    );
                  })}
                </HStack>

                {/* Ô NHẬP TÊN NHANH */}
                <HStack gap={2} vAlign="center">
                  <TextInput
                    label="Thêm thành viên mới"
                    isLabelHidden
                    value={newMemberText}
                    onChange={setNewMemberText}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        handleAddMembers(newMemberText);
                      }
                    }}
                    placeholder="Nhập tên thành viên (ví dụ: TUẤN, LINH...) rồi nhấn Enter hoặc dấu phẩy..."
                  />
                  <Button
                    label="Thêm thành viên"
                    variant="secondary"
                    icon={<Icon icon={PlusIcon} size="sm" />}
                    onClick={() => handleAddMembers(newMemberText)}
                    isDisabled={!newMemberText.trim()}
                  />
                </HStack>
              </VStack>
            </Card>
          </VStack>

          {/* HÀNG 3 THÔNG SỐ TÀI CHÍNH: TỶ LỆ 2 - 2 - 1 */}
          <Grid columns={5} gap={4}>
            {/* TIỀN ĐÓNG MỖI CHÂN (2 CỘT) */}
            <GridSpan columns={2}>
              <InputGroup label="Tiền đóng hụi mỗi chân">
                <TextInput
                  label="Tiền đóng hụi mỗi chân"
                  isLabelHidden
                  value={formatNumberDots(amountPerSlot)}
                  onChange={(val) => {
                    const clean = val.replace(/\D/g, '');
                    setAmountPerSlot(clean ? parseInt(clean, 10) : 0);
                  }}
                  placeholder="3.000.000"
                  inputMode="numeric"
                />
                <InputGroupText>VNĐ</InputGroupText>
              </InputGroup>
            </GridSpan>

            {/* BƯỚC NHẢY LÃI LŨY TIẾN (2 CỘT) */}
            <GridSpan columns={2}>
              <InputGroup label="Mức tăng lãi mỗi kỳ (bước nhảy)">
                <TextInput
                  label="Mức tăng lãi mỗi kỳ (bước nhảy)"
                  isLabelHidden
                  value={formatNumberDots(interestStep)}
                  onChange={(val) => {
                    const clean = val.replace(/\D/g, '');
                    setInterestStep(clean ? parseInt(clean, 10) : 0);
                  }}
                  placeholder="30.000"
                  inputMode="numeric"
                />
                <InputGroupText>VNĐ</InputGroupText>
              </InputGroup>
            </GridSpan>

            {/* THÁNG BẮT ĐẦU KHUI HỤI (1 CỘT) */}
            <GridSpan columns={1}>
              <Selector
                label="Tháng bắt đầu khui hụi"
                value={String(startMonth)}
                onChange={(val) => setStartMonth(parseInt(val, 10))}
                options={MONTH_OPTIONS}
              />
            </GridSpan>
          </Grid>

          <Divider />

          {/* 3. KHU VỰC 4 THẺ TÓM TẮT (SUMMARY CARDS) PHÂN CẤP RÕ RÀNG */}
          <Grid columns={{ minWidth: 220, max: 4, repeat: 'fit' }} gap={4}>
            {/* THẺ 1: TIỀN LỤM GỐC */}
            <Card variant="muted">
              <VStack gap={1.5}>
                <HStack hAlign="between" vAlign="center">
                  <Text type="supporting" color="secondary" size="sm">
                    Tiền lụm gốc / kỳ
                  </Text>
                  <Badge label="Gốc cơ bản" variant="info" />
                </HStack>
                <Heading level={2}>
                  {formatCurrency(matrix.basePot)}
                </Heading>
                <Text type="supporting" color="secondary">
                  ({matrix.totalMembers} - 1) × {formatCurrency(matrix.baseAmount)}
                </Text>
              </VStack>
            </Card>

            {/* THẺ 2: MỨC TĂNG LÃI */}
            <Card variant="muted">
              <VStack gap={1.5}>
                <HStack hAlign="between" vAlign="center">
                  <Text type="supporting" color="secondary" size="sm">
                    Mức tăng lãi mỗi kỳ
                  </Text>
                  <Badge label="Lũy tiến" variant="warning" />
                </HStack>
                <Heading level={2}>
                  +{formatCurrency(matrix.interestStep)}
                </Heading>
                <Text type="supporting" color="secondary">
                  Tăng đều đặn theo từng tháng
                </Text>
              </VStack>
            </Card>

            {/* THẺ 3: KỲ 1 NHẬN */}
            <Card variant="muted">
              <VStack gap={1.5}>
                <HStack hAlign="between" vAlign="center">
                  <Text type="supporting" color="secondary" size="sm">
                    Kỳ 1 nhận ({firstWinner ? firstWinner.memberName : '—'})
                  </Text>
                  <Badge label="Kỳ đầu" variant="neutral" />
                </HStack>
                <Heading level={2}>
                  {firstWinner
                    ? formatCurrency(firstWinner.wonAmount)
                    : formatCurrency(matrix.basePot)}
                </Heading>
                <Text type="supporting" color="secondary">
                  Lấy vốn sớm, đóng bù sau
                </Text>
              </VStack>
            </Card>

            {/* THẺ 4: KỲ CUỐI NHẬN */}
            <Card variant="muted">
              <VStack gap={1.5}>
                <HStack hAlign="between" vAlign="center">
                  <Text type="supporting" color="secondary" size="sm">
                    Kỳ cuối nhận ({lastWinner ? lastWinner.memberName : '—'})
                  </Text>
                  <Badge label="Chót hụi" variant="success" />
                </HStack>
                <Heading level={2}>
                  {lastWinner ? formatCurrency(lastWinner.wonAmount) : '—'}
                </Heading>
                <Text type="supporting" color="secondary">
                  Lãi ròng cao nhất (+{lastWinner ? formatCurrency(lastWinner.wonBonus) : ''})
                </Text>
              </VStack>
            </Card>
          </Grid>

          {/* BANNER GIẢI THÍCH QUY TẮC NHẬN TIỀN */}
          <Card variant="default">
            <HStack gap={3} vAlign="center">
              <Icon icon={BanknotesIcon} size="md" />
              <VStack gap={0.5}>
                <Text weight="semibold">
                  Quy tắc nhận tiền tháng lụm ({matrix.totalMembers} người chơi • Đóng {formatCurrency(matrix.baseAmount)}/chân)
                </Text>
                <Text type="supporting" color="secondary">
                  Tháng người nào lụm sẽ nhận đủ: <Text weight="semibold">{formatCurrency(matrix.basePot)} (gốc)</Text> + <Text weight="semibold">tiền lãi lũy tiến</Text> do các thành viên đã lụm trước đó đóng bù (Kỳ 1 nhận {formatCurrency(matrix.basePot)}, Kỳ 2 nhận {formatCurrency(matrix.basePot + matrix.interestStep)},...).
                </Text>
              </VStack>
            </HStack>
          </Card>
        </VStack>
      </Card>

      {/* 4. HIỂN THỊ MA TRẬN BẢNG HỤI TRỰC QUAN */}
      <HuiMatrixTable
        matrix={matrix}
        title="Ma trận kết quả dự toán dây hụi"
        subtitle={`Dây ${matrix.totalMembers} thành viên từ ${matrix.months[0]} đến ${matrix.months[matrix.months.length - 1]}`}
      />
    </VStack>
  );
}
