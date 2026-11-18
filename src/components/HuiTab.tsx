'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Grid } from '@astryxdesign/core/Grid';
import { Divider } from '@astryxdesign/core/Divider';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Table, TableColumn, proportional, pixel } from '@astryxdesign/core/Table';
import { Icon } from '@astryxdesign/core/Icon';
import {
  SparklesIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  UserGroupIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { HuiGroup, HuiPeriodPayment } from '@/types';
import {
  calculateNewHuiPeriod,
  calculateSlotStatistics,
  formatCurrency,
  SlotStatistic,
} from '@/lib/huiCalculator';

interface HuiTabProps {
  huiGroups: HuiGroup[];
  onUpdateHuiGroups: (groups: HuiGroup[]) => void;
}

export function HuiTab({ huiGroups, onUpdateHuiGroups }: HuiTabProps) {
  const [selectedHuiId, setSelectedHuiId] = useState<string>(
    huiGroups[0]?.id || ''
  );

  // State Khui Hụi Dialog
  const [isKhuiDialogOpen, setIsKhuiDialogOpen] = useState(false);
  const [winnerSlotId, setWinnerSlotId] = useState<string>('');
  const [bidAmountStr, setBidAmountStr] = useState<string>('300000');
  const [khuiDateStr, setKhuiDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // State Tạo Dây Hụi Mới Dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newHuiName, setNewHuiName] = useState('');
  const [newHuiAmount, setNewHuiAmount] = useState('2000000');
  const [newHuiSlotsCount, setNewHuiSlotsCount] = useState('10');
  const [newHuiCommission, setNewHuiCommission] = useState('300000');
  const [newHuiCycle, setNewHuiCycle] = useState<'MONTHLY' | 'WEEKLY' | 'DAILY'>('MONTHLY');

  const currentHui =
    huiGroups.find((h) => h.id === selectedHuiId) || huiGroups[0];

  // Tạo dây hụi mới
  const handleCreateHuiGroup = () => {
    if (!newHuiName.trim()) {
      alert('Vui lòng nhập tên dây hụi');
      return;
    }
    const amount = parseInt(newHuiAmount.replace(/\D/g, ''), 10) || 2000000;
    const slotsCount = parseInt(newHuiSlotsCount, 10) || 10;
    const commission = parseInt(newHuiCommission.replace(/\D/g, ''), 10) || 200000;

    const newId = 'hui_' + Date.now();
    const slots = [];
    for (let i = 1; i <= slotsCount; i++) {
      slots.push({
        id: `slot_${newId}_${i}`,
        huiId: newId,
        slotNumber: i,
        memberName: i === 1 ? 'Chủ Hụi (Chân 1)' : `Hụi viên chân ${i}`,
        isDead: false,
      });
    }

    const newGroup: HuiGroup = {
      id: newId,
      name: newHuiName,
      amountPerSlot: amount,
      totalSlots: slotsCount,
      cycle: newHuiCycle,
      commissionPerPeriod: commission,
      startDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      slots,
      periods: [],
    };

    onUpdateHuiGroups([...huiGroups, newGroup]);
    setSelectedHuiId(newId);
    setIsCreateDialogOpen(false);
    setNewHuiName('');
  };

  // Dialog tạo dây hụi tái sử dụng
  const renderCreateDialog = () => (
    <Dialog
      isOpen={isCreateDialogOpen}
      onOpenChange={setIsCreateDialogOpen}
      width={500}
      purpose="form"
    >
      <DialogHeader
        title="Tạo Dây Hụi Mới"
        subtitle="Khởi tạo dây hụi xoay vòng cho nhóm chơi"
        onOpenChange={setIsCreateDialogOpen}
      />
      <VStack gap={4} padding={4}>
        <TextInput
          label="Tên Dây Hụi"
          value={newHuiName}
          onChange={setNewHuiName}
          placeholder="Vd: Dây 5 Triệu Tháng - Bạn Thân"
        />

        <TextInput
          label="Tiền Góp Mỗi Chân (VNĐ)"
          value={newHuiAmount}
          onChange={setNewHuiAmount}
          placeholder="2000000"
        />

        <TextInput
          label="Tổng Số Chân (Kỳ)"
          value={newHuiSlotsCount}
          onChange={setNewHuiSlotsCount}
          placeholder="10"
        />

        <TextInput
          label="Tiền Xâu Chủ Hụi / Kỳ (VNĐ)"
          value={newHuiCommission}
          onChange={setNewHuiCommission}
          placeholder="300000"
        />

        <Selector
          label="Chu Kỳ Mở"
          value={newHuiCycle}
          options={[
            { value: 'MONTHLY', label: 'Hàng Tháng (30 ngày)' },
            { value: 'WEEKLY', label: 'Hàng Tuần (7 ngày)' },
            { value: 'DAILY', label: 'Hàng Ngày' },
          ]}
          onChange={(v) => setNewHuiCycle(v as 'MONTHLY' | 'WEEKLY' | 'DAILY')}
          width="100%"
        />

        <Divider />

        <HStack hAlign="end" gap={2}>
          <Button
            label="Hủy"
            variant="ghost"
            size="md"
            onClick={() => setIsCreateDialogOpen(false)}
          />
          <Button
            label="Tạo Dây Hụi"
            variant="primary"
            size="md"
            icon={<Icon icon={PlusIcon} size="sm" />}
            onClick={handleCreateHuiGroup}
          />
        </HStack>
      </VStack>
    </Dialog>
  );

  if (!currentHui) {
    return (
      <VStack gap={4}>
        <Card>
          <VStack gap={4} hAlign="center" padding={6}>
            <Heading level={4}>Chưa có dây hụi nào</Heading>
            <Text type="supporting" color="secondary">
              Nhấn nút bên dưới để tạo dây hụi đầu tiên cho nhóm chơi của bạn
            </Text>
            <Button
              label="Tạo Dây Hụi Đầu Tiên"
              variant="primary"
              size="md"
              icon={<Icon icon={PlusIcon} size="sm" />}
              onClick={() => setIsCreateDialogOpen(true)}
            />
          </VStack>
        </Card>
        {renderCreateDialog()}
      </VStack>
    );
  }

  // Chân còn sống có thể hốt kỳ tới
  const livingSlots = currentHui.slots.filter((s) => !s.isDead);
  const slotStats = calculateSlotStatistics(currentHui);
  const latestPeriod = currentHui.periods?.[currentHui.periods.length - 1];

  // Xử lý Khui Hụi
  const handleConfirmKhuiHui = () => {
    if (!winnerSlotId) {
      alert('Vui lòng chọn chân hụi hốt kỳ này!');
      return;
    }
    const bidAmount = parseInt(bidAmountStr.replace(/\D/g, ''), 10) || 0;
    try {
      const newPeriod = calculateNewHuiPeriod(
        currentHui,
        winnerSlotId,
        bidAmount,
        khuiDateStr
      );

      // Cập nhật slot thành chân chết
      const updatedSlots = currentHui.slots.map((s) => {
        if (s.id === winnerSlotId) {
          return {
            ...s,
            isDead: true,
            wonPeriod: newPeriod.periodNumber,
            bidAmount: bidAmount,
          };
        }
        return s;
      });

      const updatedPeriods = [...(currentHui.periods || []), newPeriod];
      const isCompleted = updatedSlots.every((s) => s.isDead);

      const updatedHui: HuiGroup = {
        ...currentHui,
        slots: updatedSlots,
        periods: updatedPeriods,
        status: isCompleted ? 'COMPLETED' : 'ACTIVE',
      };

      const newHuiGroups = huiGroups.map((h) =>
        h.id === currentHui.id ? updatedHui : h
      );
      onUpdateHuiGroups(newHuiGroups);
      setIsKhuiDialogOpen(false);

      // Bắn pháo hoa ăn mừng!
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Lỗi không xác định';
      alert('Lỗi: ' + errorMsg);
    }
  };

  // Toggle trạng thái đóng tiền của 1 chân trong kỳ mới nhất
  const handleTogglePayment = (periodIndex: number, slotId: string) => {
    const updatedPeriods = [...currentHui.periods];
    const targetPeriod = updatedPeriods[periodIndex];
    if (!targetPeriod) return;

    targetPeriod.payments = targetPeriod.payments.map((p) => {
      if (p.slotId === slotId) {
        return {
          ...p,
          isPaid: !p.isPaid,
          paidAt: !p.isPaid ? new Date().toISOString().split('T')[0] : undefined,
        };
      }
      return p;
    });

    const updatedHui: HuiGroup = {
      ...currentHui,
      periods: updatedPeriods,
    };
    const newHuiGroups = huiGroups.map((h) =>
      h.id === currentHui.id ? updatedHui : h
    );
    onUpdateHuiGroups(newHuiGroups);
  };

  // Cấu hình cột Table thống kê chân hụi
  const slotColumns: TableColumn<SlotStatistic>[] = [
    {
      key: 'slotNumber',
      header: 'Chân',
      renderCell: (s: SlotStatistic) => `#${s.slotNumber}`,
      width: pixel(70),
    },
    {
      key: 'memberName',
      header: 'Thành Viên',
      renderCell: (s: SlotStatistic) => (
        <VStack gap={0}>
          <Text weight="semibold">{s.memberName}</Text>
          <Text type="supporting" color="secondary">
            {s.isDead ? `Đã hốt kỳ ${s.wonPeriod}` : 'Chân sống (chưa hốt)'}
          </Text>
        </VStack>
      ),
      width: proportional(2),
    },
    {
      key: 'status',
      header: 'Tình Trạng',
      renderCell: (s: SlotStatistic) =>
        s.isDead ? (
          <Badge label="Chân Chết" variant="neutral" />
        ) : (
          <Badge label="Chân Sống" variant="success" />
        ),
      width: pixel(120),
    },
    {
      key: 'totalPaid',
      header: 'Tổng Đã Đóng',
      renderCell: (s: SlotStatistic) => formatCurrency(s.totalPaid),
      width: proportional(1.5),
    },
    {
      key: 'totalReceived',
      header: 'Đã Nhận (Hốt)',
      renderCell: (s: SlotStatistic) =>
        s.totalReceived > 0 ? (
          <Text weight="semibold">{formatCurrency(s.totalReceived)}</Text>
        ) : (
          <Text color="secondary">-</Text>
        ),
      width: proportional(1.5),
    },
    {
      key: 'netProfit',
      header: 'Lãi / Lỗ Ròng',
      renderCell: (s: SlotStatistic) => {
        if (!s.isDead) {
          return <Text color="secondary">Chưa hốt</Text>;
        }
        const isProfit = s.netProfit >= 0;
        return (
          <Text
            weight="semibold"
            color={isProfit ? 'primary' : 'secondary'}
          >
            {isProfit ? '+' : ''}
            {formatCurrency(s.netProfit)}
          </Text>
        );
      },
      width: proportional(1.5),
    },
  ];

  // Cấu hình cột Table thu tiền kỳ mới nhất
  const paymentColumns: TableColumn<HuiPeriodPayment>[] = [
    {
      key: 'slotNumber',
      header: 'Chân',
      renderCell: (p: HuiPeriodPayment) => `#${p.slotNumber}`,
      width: pixel(70),
    },
    {
      key: 'memberName',
      header: 'Thành Viên',
      renderCell: (p: HuiPeriodPayment) => p.memberName,
      width: proportional(2),
    },
    {
      key: 'amountToPay',
      header: 'Số Tiền Phải Đóng',
      renderCell: (p: HuiPeriodPayment) => (
        <Text weight="semibold">{formatCurrency(p.amountToPay)}</Text>
      ),
      width: proportional(1.5),
    },
    {
      key: 'status',
      header: 'Trạng Thái',
      renderCell: (p: HuiPeriodPayment) =>
        p.isPaid ? (
          <Badge label="Đã đóng" variant="success" />
        ) : (
          <Badge label="Chưa đóng" variant="warning" />
        ),
      width: pixel(120),
    },
    {
      key: 'action',
      header: 'Điểm Danh',
      renderCell: (p: HuiPeriodPayment) => (
        <Button
          label={p.isPaid ? 'Hủy' : 'Đã Thu'}
          variant={p.isPaid ? 'ghost' : 'primary'}
          size="sm"
          icon={
            <Icon
              icon={p.isPaid ? XMarkIcon : CheckIcon}
              size="sm"
            />
          }
          onClick={() =>
            handleTogglePayment(currentHui.periods.length - 1, p.slotId)
          }
        />
      ),
      width: pixel(110),
    },
  ];

  const huiOptions = huiGroups.map((h) => ({
    value: h.id,
    label: `${h.name} (${formatCurrency(h.amountPerSlot)})`,
  }));

  const winnerOptions = livingSlots.map((s) => ({
    value: s.id,
    label: `Chân #${s.slotNumber} - ${s.memberName}`,
  }));

  return (
    <VStack gap={6}>
      {/* Thanh chọn dây hụi & Các nút hành động */}
      <Card>
        <HStack hAlign="between" vAlign="center" wrap="wrap" gap={4}>
          <HStack gap={4} vAlign="center" wrap="wrap">
            <Selector
              label="Chọn Dây Hụi"
              value={selectedHuiId}
              options={huiOptions}
              onChange={setSelectedHuiId}
              width={340}
            />
            <VStack gap={0}>
              <Text type="supporting" color="secondary">
                Tiến độ dây hụi
              </Text>
              <Text weight="semibold">
                Đã khui {currentHui.periods?.length || 0} / {currentHui.totalSlots} kỳ
              </Text>
            </VStack>
          </HStack>

          <HStack gap={2} vAlign="center">
            {livingSlots.length > 0 ? (
              <Button
                label="🎉 Khui Hụi Kỳ Mới"
                variant="primary"
                size="md"
                icon={<Icon icon={SparklesIcon} size="sm" />}
                onClick={() => {
                  setWinnerSlotId(livingSlots[0]?.id || '');
                  setIsKhuiDialogOpen(true);
                }}
              />
            ) : (
              <Badge label="Dây Đã Mãn Hạn" variant="neutral" />
            )}
            <Button
              label="Thêm Dây Mới"
              variant="secondary"
              size="md"
              icon={<Icon icon={PlusIcon} size="sm" />}
              onClick={() => setIsCreateDialogOpen(true)}
            />
          </HStack>
        </HStack>
      </Card>

      {/* Thông tin chi tiết Dây Hụi */}
      <Grid columns={{ minWidth: 220, repeat: 'fit' }} gap={4}>
        <Card>
          <VStack gap={1}>
            <Text type="supporting" color="secondary">
              Tiền Góp Mỗi Chân
            </Text>
            <Heading level={4}>{formatCurrency(currentHui.amountPerSlot)}</Heading>
            <Text type="supporting">Mỗi kỳ / 1 chân</Text>
          </VStack>
        </Card>
        <Card>
          <VStack gap={1}>
            <Text type="supporting" color="secondary">
              Số Chân / Kỳ
            </Text>
            <Heading level={4}>{currentHui.totalSlots} Chân</Heading>
            <Text type="supporting">
              Chu kỳ: {currentHui.cycle === 'MONTHLY' ? 'Hàng Tháng' : currentHui.cycle === 'WEEKLY' ? 'Hàng Tuần' : 'Hàng Ngày'}
            </Text>
          </VStack>
        </Card>
        <Card>
          <VStack gap={1}>
            <Text type="supporting" color="secondary">
              Tiền Xâu Chủ Hụi
            </Text>
            <Heading level={4}>{formatCurrency(currentHui.commissionPerPeriod)}</Heading>
            <Text type="supporting">Hoa hồng thu mỗi kỳ</Text>
          </VStack>
        </Card>
        <Card>
          <VStack gap={1}>
            <Text type="supporting" color="secondary">
              Chân Chưa Hốt (Sống)
            </Text>
            <Heading level={4}>{livingSlots.length} Chân</Heading>
            <Text type="supporting">Cơ hội hốt các kỳ tiếp</Text>
          </VStack>
        </Card>
      </Grid>

      {/* Bảng Điểm Danh Đóng Tiền Kỳ Mới Nhất (nếu có kỳ đã khui) */}
      {latestPeriod && (
        <Card>
          <VStack gap={4}>
            <HStack hAlign="between" vAlign="center" wrap="wrap">
              <VStack gap={1}>
                <HStack gap={2} vAlign="center">
                  <Heading level={4}>
                    Điểm Danh Thu Tiền Kỳ {latestPeriod.periodNumber} ({latestPeriod.openDate})
                  </Heading>
                  <Badge label={`Hốt: ${latestPeriod.winnerName}`} variant="info" />
                </HStack>
                <Text type="supporting" color="secondary">
                  Mức thăm kêu:{' '}
                  <Text weight="semibold">
                    {formatCurrency(latestPeriod.bidAmount)}
                  </Text>{' '}
                  | Thực lĩnh người hốt:{' '}
                  <Text weight="semibold">
                    {formatCurrency(latestPeriod.actualReceived)}
                  </Text>{' '}
                  (Đã trừ xâu {formatCurrency(latestPeriod.commissionFee)})
                </Text>
              </VStack>
            </HStack>

            <Table<HuiPeriodPayment>
              data={latestPeriod.payments}
              columns={paymentColumns}
              idKey="slotId"
              density="compact"
              dividers="rows"
              hasHover
            />
          </VStack>
        </Card>
      )}

      {/* Bảng Danh Sách Chân Hụi & Thống Kê Lãi/Lỗ Từng Thành Viên */}
      <Card>
        <VStack gap={4}>
          <HStack hAlign="between" vAlign="center">
            <VStack gap={1}>
              <Heading level={4}>Danh Sách Chân Hụi & Lãi / Lỗ Từng Người</Heading>
              <Text type="supporting" color="secondary">
                Theo dõi tổng tiền đã nộp, tổng tiền đã nhận và tỉ suất lợi nhuận thực tế
              </Text>
            </VStack>
          </HStack>

          <Table<SlotStatistic>
            data={slotStats}
            columns={slotColumns}
            idKey="slotId"
            density="compact"
            dividers="rows"
            hasHover
          />
        </VStack>
      </Card>

      {/* DIALOG KHUI HỤI KỲ MỚI */}
      <Dialog
        isOpen={isKhuiDialogOpen}
        onOpenChange={setIsKhuiDialogOpen}
        width={480}
        purpose="form"
      >
        <DialogHeader
          title="🎉 Khui Hụi Kỳ Tiếp Theo"
          subtitle={`Dây: ${currentHui.name} - Kỳ ${
            (currentHui.periods?.length || 0) + 1
          }`}
          onOpenChange={setIsKhuiDialogOpen}
        />
        <VStack gap={4} padding={4}>
          <Selector
            label="Chọn Chân Hụi Hốt Kỳ Này"
            value={winnerSlotId}
            options={winnerOptions}
            onChange={setWinnerSlotId}
            width="100%"
          />

          <TextInput
            label="Mức Thăm / Tiền Kêu Hụi (VNĐ)"
            value={bidAmountStr}
            onChange={setBidAmountStr}
            description="Số tiền trả lãi của người hốt kỳ này để cạnh tranh"
          />

          <TextInput
            label="Ngày Khui Hụi"
            value={khuiDateStr}
            onChange={setKhuiDateStr}
            type="text"
            description="Định dạng YYYY-MM-DD"
          />

          <Divider />

          <HStack hAlign="end" gap={2}>
            <Button
              label="Hủy Bỏ"
              variant="ghost"
              size="md"
              onClick={() => setIsKhuiDialogOpen(false)}
            />
            <Button
              label="Xác Nhận Khui Hụi"
              variant="primary"
              size="md"
              icon={<Icon icon={SparklesIcon} size="sm" />}
              onClick={handleConfirmKhuiHui}
            />
          </HStack>
        </VStack>
      </Dialog>

      {/* DIALOG TẠO DÂY HỤI MỚI */}
      {renderCreateDialog()}
    </VStack>
  );
}
