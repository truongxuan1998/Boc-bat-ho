'use client';

import React, { useState, useMemo, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { StackItem } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Grid } from '@astryxdesign/core/Grid';
import { Divider } from '@astryxdesign/core/Divider';
import { TextInput } from '@astryxdesign/core/TextInput';
import { DateInput } from '@astryxdesign/core/DateInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { useToast } from '@astryxdesign/core/Toast';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Table, TableColumn, proportional, pixel } from '@astryxdesign/core/Table';
import { Avatar } from '@astryxdesign/core/Avatar';
import { FileInput } from '@astryxdesign/core/FileInput';
import { Icon } from '@astryxdesign/core/Icon';
import { InputGroup, InputGroupText } from '@astryxdesign/core/InputGroup';
import { Token } from '@astryxdesign/core/Token';
import { IconButton } from '@astryxdesign/core/IconButton';
import {
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  CalendarPlus,
  RotateCcw,
} from 'lucide-react';
import {
  SparklesIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  QrCodeIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { HuiGroup, HuiPeriodPayment, HuiSlot, HuiPeriod } from '@/types';
import {
  calculateNewHuiPeriod,
  calculateSlotStatistics,
  generateProgressiveMatrix,
  formatCurrency,
  SlotStatistic,
} from '@/lib/huiCalculator';
import { HuiMatrixTable } from '@/components/HuiMatrixTable';
import { sanitizeAndValidateImage } from '@/lib/imageValidator';
import {
  uploadQrCodeToStorage,
  softDeleteHuiGroupFromCloud,
} from '@/lib/supabaseClient';

// Định dạng số có dấu chấm phân cách hàng nghìn (chuẩn Việt Nam)
function formatNumberDots(val: number): string {
  if (!val && val !== 0) return '';
  return new Intl.NumberFormat('vi-VN').format(val);
}

// Chuyển đổi định dạng ngày YYYY-MM-DD sang chuẩn Việt Nam DD/MM/YYYY
function formatDateVi(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Danh sách lựa chọn 12 tháng
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Tháng ${i + 1}`,
}));

interface HuiTabProps {
  huiGroups: HuiGroup[];
  onUpdateHuiGroups: (groups: HuiGroup[]) => void;
}

export function HuiTab({ huiGroups, onUpdateHuiGroups }: HuiTabProps) {
  const toast = useToast();
  const [selectedHuiId, setSelectedHuiId] = useState<string>(
    huiGroups[0]?.id || ''
  );

  // State Modal Xác nhận thu đủ & bàn giao hụi
  const [isPayoutConfirmOpen, setIsPayoutConfirmOpen] = useState(false);
  const [pendingPayoutIndex, setPendingPayoutIndex] = useState<number | null>(null);
  const [unpaidSummary, setUnpaidSummary] = useState<{
    count: number;
    names: string;
  }>({ count: 0, names: '' });

  // State Modal Xác nhận hoàn tác kỳ
  const [isRevertConfirmOpen, setIsRevertConfirmOpen] = useState(false);

  // State Modal Xác nhận xóa mã QR
  const [isRemoveQrConfirmOpen, setIsRemoveQrConfirmOpen] = useState(false);

  // State File Input và QR Modal
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isQrUploadMode, setIsQrUploadMode] = useState(false);
  const [selectedQrUrl, setSelectedQrUrl] = useState<string>('');
  const [selectedQrName, setSelectedQrName] = useState<string>('');
  const [targetUploadSlotId, setTargetUploadSlotId] = useState<string>('');
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [qrUploadError, setQrUploadError] = useState<string>('');

  // State Khui Hụi Dialog
  const [isKhuiDialogOpen, setIsKhuiDialogOpen] = useState(false);
  const [winnerSlotId, setWinnerSlotId] = useState<string>('');
  const [bidAmountStr, setBidAmountStr] = useState<string>('0');
  const [khuiDateStr, setKhuiDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const currentMonthNumber = new Date().getMonth() + 1;

  // State Tạo Dây Hụi Mới Dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newHuiName, setNewHuiName] = useState(`Dây hụi lũy tiến tháng ${currentMonthNumber}`);

  // State Xóa Dây Hụi Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingHui, setIsDeletingHui] = useState(false);
  const [newHuiAmount, setNewHuiAmount] = useState<number>(3000000);
  const [newHuiMembers, setNewHuiMembers] = useState<string[]>([]);
  const [newMemberInput, setNewMemberInput] = useState<string>('');
  const [draggedMemberIdx, setDraggedMemberIdx] = useState<number | null>(null);
  const [newHuiStep, setNewHuiStep] = useState<number>(30000);
  const [newHuiStartMonth, setNewHuiStartMonth] = useState<number>(currentMonthNumber);
  const [newHuiCycle, setNewHuiCycle] = useState<'MONTHLY' | 'WEEKLY' | 'DAILY'>('MONTHLY');

  const currentHui =
    huiGroups.find((h) => h.id === selectedHuiId) || huiGroups[0];

  // Mở modal tạo dây hụi hoặc xem QR nếu URL có query param
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('modal') === 'create') {
        setIsCreateDialogOpen(true);
      }
      if (searchParams.get('qr') === 'true') {
        const slotWithQr = currentHui?.slots.find((s) => s.qrCodeUrl);
        if (slotWithQr) {
          setSelectedQrUrl(slotWithQr.qrCodeUrl!);
          setSelectedQrName(slotWithQr.memberName);
          setTargetUploadSlotId(slotWithQr.id);
          setIsQrUploadMode(false);
          setIsQrModalOpen(true);
        }
      }
    }
  }, [currentHui]);

  // Tự động chọn dây hụi đầu tiên khi danh sách tải xong
  useEffect(() => {
    if (
      huiGroups.length > 0 &&
      (!selectedHuiId || !huiGroups.some((h) => h.id === selectedHuiId))
    ) {
      setSelectedHuiId(huiGroups[0].id);
    }
  }, [huiGroups, selectedHuiId]);

  // Tính ma trận bảng hụi của dây đang xem
  const huiMatrix = useMemo(() => {
    if (!currentHui) return null;
    const names = currentHui.slots.map((s) => s.memberName);
    const step = currentHui.interestStep !== undefined ? currentHui.interestStep : 30000;
    return generateProgressiveMatrix(
      names,
      currentHui.startMonth || 4,
      step,
      currentHui.amountPerSlot
    );
  }, [currentHui]);

  // Thêm thành viên vào danh sách tạo dây hụi
  const handleAddCreateMembers = (raw: string) => {
    if (!raw.trim()) return;
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (parts.length > 0) {
      setNewHuiMembers((prev) => [...prev, ...parts]);
      setNewMemberInput('');
    }
  };

  // Xóa thành viên khỏi danh sách tạo dây hụi
  const handleRemoveCreateMember = (idx: number) => {
    if (newHuiMembers.length <= 2) {
      toast({ body: 'Dây hụi cần tối thiểu 2 thành viên.', type: 'error' });
      return;
    }
    setNewHuiMembers((prev) => prev.filter((_, i) => i !== idx));
  };

  // Đổi thứ tự thành viên bằng nút mũi tên
  const handleMoveCreateMember = (fromIndex: number, direction: -1 | 1) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= newHuiMembers.length) return;
    setNewHuiMembers((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  // Kéo thả chip thành viên
  const handleDropCreateMember = (toIndex: number) => {
    if (draggedMemberIdx === null || draggedMemberIdx === toIndex) return;
    setNewHuiMembers((prev) => {
      const next = [...prev];
      const [moved] = next.splice(draggedMemberIdx, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDraggedMemberIdx(null);
  };

  // Tính toán tóm tắt trước khi tạo (Live summary)
  const createSummary = useMemo(() => {
    const totalSlots = newHuiMembers.length;
    const basePot = Math.max(0, (totalSlots - 1) * newHuiAmount);
    const lastWonBonus =
      totalSlots > 0 ? (((totalSlots - 1) * totalSlots) / 2) * newHuiStep : 0;
    const lastTotalReceived = basePot + lastWonBonus;

    return {
      totalSlots,
      basePot,
      lastWonBonus,
      lastTotalReceived,
    };
  }, [newHuiMembers.length, newHuiAmount, newHuiStep]);

  // Tạo dây hụi mới
  const handleCreateHuiGroup = () => {
    if (!newHuiName.trim()) {
      toast({ body: 'Vui lòng nhập tên dây hụi', type: 'error' });
      return;
    }
    if (newHuiMembers.length < 2) {
      toast({ body: 'Vui lòng nhập ít nhất 2 thành viên cho dây hụi', type: 'error' });
      return;
    }
    const names = newHuiMembers;
    const amount = newHuiAmount || 3000000;
    const step = newHuiStep !== undefined ? newHuiStep : 30000;
    const startMonth = newHuiStartMonth || currentMonthNumber;

    const newId = 'hui_' + Date.now();
    const slots = names.map((name, i) => ({
      id: `slot_${newId}_${i + 1}`,
      huiId: newId,
      slotNumber: i + 1,
      memberName: name,
      isDead: false,
    }));

    const newGroup: HuiGroup = {
      id: newId,
      name: newHuiName,
      amountPerSlot: amount,
      totalSlots: names.length,
      cycle: newHuiCycle,
      commissionPerPeriod: 0,
      interestStep: step,
      startMonth,
      startDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      slots,
      periods: [],
    };

    onUpdateHuiGroups([...huiGroups, newGroup]);
    setSelectedHuiId(newId);
    setIsCreateDialogOpen(false);
  };

  // Lưu mã QR nhận tiền
  const handleSaveQrCode = (base64: string) => {
    if (!currentHui) return;
    const targetSlot = targetUploadSlotId || (latestPeriod ? latestPeriod.winnerSlotId : '');

    const updatedSlots = currentHui.slots.map((s) => {
      if (s.id === targetSlot) {
        return { ...s, qrCodeUrl: base64 };
      }
      return s;
    });

    const updatedPeriods = (currentHui.periods || []).map((p) => {
      if (p.winnerSlotId === targetSlot) {
        return { ...p, winnerQrCode: base64 };
      }
      return p;
    });

    const updatedHui: HuiGroup = {
      ...currentHui,
      slots: updatedSlots,
      periods: updatedPeriods,
    };

    const newHuiGroups = huiGroups.map((h) =>
      h.id === currentHui.id ? updatedHui : h
    );
    onUpdateHuiGroups(newHuiGroups);

    setSelectedQrUrl(base64);
    setIsQrUploadMode(false);
  };

  // Xóa mã QR cũ của chân hụi
  const handleRemoveQrCode = () => {
    if (!currentHui) return;
    setIsRemoveQrConfirmOpen(true);
  };

  const applyRemoveQrCode = () => {
    if (!currentHui) return;
    const targetSlot =
      targetUploadSlotId || (latestPeriod ? latestPeriod.winnerSlotId : '');

    const updatedSlots = currentHui.slots.map((s) => {
      if (s.id === targetSlot) {
        const { qrCodeUrl, ...rest } = s;
        return rest as HuiSlot;
      }
      return s;
    });

    const updatedPeriods = (currentHui.periods || []).map((p) => {
      if (p.winnerSlotId === targetSlot) {
        const { winnerQrCode, ...rest } = p;
        return rest as HuiPeriod;
      }
      return p;
    });

    const updatedHui: HuiGroup = {
      ...currentHui,
      slots: updatedSlots,
      periods: updatedPeriods,
    };

    const newHuiGroups = huiGroups.map((h) =>
      h.id === currentHui.id ? updatedHui : h
    );
    onUpdateHuiGroups(newHuiGroups);

    setSelectedQrUrl('');
    setIsQrUploadMode(true);
    setIsRemoveQrConfirmOpen(false);

    toast({
      body: `Đã xóa mã QR của ${selectedQrName}`,
      type: 'info',
    });
  };

  // Dialog tạo dây hụi mới đồng bộ chuẩn design system
  const renderCreateDialog = () => (
    <Dialog
      isOpen={isCreateDialogOpen}
      onOpenChange={setIsCreateDialogOpen}
      width={640}
      purpose="form"
    >
      <DialogHeader
        title="Tạo dây hụi mới"
        subtitle="Khởi tạo dây hụi xoay vòng theo mô hình lũy tiến bậc thang"
        onOpenChange={setIsCreateDialogOpen}
      />
      <VStack gap={4} padding={4}>
        {/* HÀNG 1 (FULL WIDTH): TÊN DÂY HỤI */}
        <TextInput
          label="Tên dây hụi"
          value={newHuiName}
          onChange={setNewHuiName}
          placeholder="Ví dụ: Dây hụi lũy tiến tháng 4"
          width="100%"
        />

        {/* HÀNG 2 (2 CỘT BẰNG NHAU - NHÓM TIỀN TỆ): TIỀN ĐÓNG VÀ MỨC TĂNG LÃI */}
        <Grid columns={2} gap={3}>
          <InputGroup label="Tiền đóng hụi mỗi chân">
            <TextInput
              label="Tiền đóng hụi mỗi chân"
              isLabelHidden
              value={formatNumberDots(newHuiAmount)}
              onChange={(val) => {
                const clean = val.replace(/\D/g, '');
                setNewHuiAmount(clean ? parseInt(clean, 10) : 0);
              }}
              placeholder="5.000.000"
              inputMode="numeric"
            />
            <InputGroupText>VNĐ</InputGroupText>
          </InputGroup>

          <InputGroup label="Mức tăng lãi mỗi kỳ">
            <TextInput
              label="Mức tăng lãi mỗi kỳ"
              isLabelHidden
              value={formatNumberDots(newHuiStep)}
              onChange={(val) => {
                const clean = val.replace(/\D/g, '');
                setNewHuiStep(clean ? parseInt(clean, 10) : 0);
              }}
              placeholder="30.000"
              inputMode="numeric"
            />
            <InputGroupText>VNĐ</InputGroupText>
          </InputGroup>
        </Grid>

        {/* HÀNG 3 (FULL WIDTH): DANH SÁCH THÀNH VIÊN VỚI BADGE VÀ CHIP INPUT */}
        <VStack gap={2}>
          <HStack hAlign="between" vAlign="center" wrap="wrap" gap={2}>
            <Text weight="semibold">
              Danh sách thành viên (theo thứ tự lụm từ kỳ 1 đến chót)
            </Text>
            <Badge
              label={`${newHuiMembers.length} thành viên · ${newHuiMembers.length} kỳ`}
              variant="blue"
            />
          </HStack>

          <Card variant="muted" padding={3}>
            <VStack gap={3}>
              {/* VÙNG CHIP THÀNH VIÊN CUỘN GỌN GÀNG TỐI ĐA 2-3 DÒNG */}
              <VStack gap={2} height={120} isScrollable>
                <HStack wrap="wrap" gap={2} vAlign="center">
                  {newHuiMembers.length === 0 ? (
                    <Text color="secondary" type="supporting">
                      Chưa có thành viên nào. Hãy nhập tên ở ô bên dưới rồi nhấn Enter để thêm các chân hụi.
                    </Text>
                  ) : (
                    newHuiMembers.map((name, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === newHuiMembers.length - 1;
                    const tokenColor = isFirst
                      ? 'yellow'
                      : isLast
                      ? 'green'
                      : 'default';

                    return (
                      <HStack
                        key={`${name}-${idx}`}
                        vAlign="center"
                        draggable
                        onDragStart={() => setDraggedMemberIdx(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDropCreateMember(idx)}
                      >
                        <Token
                          icon={<Icon icon={GripVertical} size="xsm" color="secondary" />}
                          label={`${idx + 1}. ${name}`}
                          color={tokenColor}
                          size="md"
                          endContent={
                            (!isFirst || !isLast) ? (
                              <HStack gap={0.5} vAlign="center">
                                {!isFirst && (
                                  <IconButton
                                    label={`Chuyển ${name} lên kỳ trước`}
                                    icon={<Icon icon={ChevronLeft} size="xsm" />}
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveCreateMember(idx, -1);
                                    }}
                                  />
                                )}
                                {!isLast && (
                                  <IconButton
                                    label={`Chuyển ${name} xuống kỳ sau`}
                                    icon={<Icon icon={ChevronRight} size="xsm" />}
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveCreateMember(idx, 1);
                                    }}
                                  />
                                )}
                              </HStack>
                            ) : undefined
                          }
                          onRemove={() => handleRemoveCreateMember(idx)}
                        />
                      </HStack>
                    );
                  })
                )}
                </HStack>
              </VStack>

              {/* Ô NHẬP THÊM THÀNH VIÊN */}
              <HStack gap={2} vAlign="center" width="100%">
                <StackItem size="fill">
                  <TextInput
                    label="Thêm thành viên"
                    isLabelHidden
                    value={newMemberInput}
                    onChange={setNewMemberInput}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        handleAddCreateMembers(newMemberInput);
                      }
                    }}
                    placeholder="Nhập tên thành viên (ví dụ: TUẤN, LINH...) rồi nhấn Enter..."
                  />
                </StackItem>
                <StackItem size="static">
                  <Button
                    label="Thêm"
                    variant="secondary"
                    icon={<Icon icon={Plus} size="sm" />}
                    onClick={() => handleAddCreateMembers(newMemberInput)}
                    isDisabled={!newMemberInput.trim()}
                  />
                </StackItem>
              </HStack>
            </VStack>
          </Card>
        </VStack>

        {/* HÀNG 4 (2 CỘT BẰNG NHAU - NHÓM THỜI GIAN): THÁNG BẮT ĐẦU VÀ CHU KỲ */}
        <Grid columns={2} gap={3}>
          <Selector
            label="Tháng bắt đầu khui hụi"
            value={String(newHuiStartMonth)}
            options={MONTH_OPTIONS}
            onChange={(val) => setNewHuiStartMonth(parseInt(val, 10))}
            width="100%"
          />
          <Selector
            label="Chu kỳ mở"
            value={newHuiCycle}
            options={[
              { value: 'MONTHLY', label: 'Hàng tháng (30 ngày)' },
              { value: 'WEEKLY', label: 'Hàng tuần (7 ngày)' },
              { value: 'DAILY', label: 'Hàng ngày' },
            ]}
            onChange={(v) => setNewHuiCycle(v as 'MONTHLY' | 'WEEKLY' | 'DAILY')}
            width="100%"
          />
        </Grid>

        {/* KHUNG XEM TRƯỚC NHANH (LIVE SUMMARY BOX) */}
        <Card variant="muted" padding={3}>
          <Grid columns={3} gap={3}>
            <VStack gap={0.5}>
              <Text type="supporting" color="secondary" size="sm">
                Số kỳ khui
              </Text>
              <Text weight="bold" hasTabularNumbers>
                {createSummary.totalSlots} kỳ
              </Text>
              <Text type="supporting" color="secondary" size="sm">
                {createSummary.totalSlots} người chơi
              </Text>
            </VStack>

            <VStack gap={0.5}>
              <Text type="supporting" color="secondary" size="sm">
                Tiền lụm gốc / kỳ
              </Text>
              <Text weight="bold" color="primary" hasTabularNumbers>
                {formatCurrency(createSummary.basePot)}
              </Text>
              <Text type="supporting" color="secondary" size="sm">
                ({createSummary.totalSlots} - 1) × {formatCurrency(newHuiAmount)}
              </Text>
            </VStack>

            <VStack gap={0.5}>
              <Text type="supporting" color="secondary" size="sm">
                Kỳ chót nhận được
              </Text>
              <Text weight="bold" color="primary" hasTabularNumbers>
                {formatCurrency(createSummary.lastTotalReceived)}
              </Text>
              <Text type="supporting" color="secondary" size="sm">
                Gốc + {formatCurrency(createSummary.lastWonBonus)} lãi
              </Text>
            </VStack>
          </Grid>
        </Card>

        <Divider />

        {/* FOOTER MODAL */}
        <HStack hAlign="end" gap={3}>
          <Button
            label="Hủy"
            variant="secondary"
            size="md"
            onClick={() => setIsCreateDialogOpen(false)}
          />
          <Button
            label="Tạo dây hụi"
            variant="primary"
            size="md"
            icon={<Icon icon={Plus} size="sm" />}
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
              label="Tạo dây hụi đầu tiên"
              variant="primary"
              size="md"
              icon={<Icon icon={Plus} size="sm" />}
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
      toast({ body: 'Vui lòng chọn chân hụi hốt kỳ này!', type: 'error' });
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

      toast({
        body: `🎉 Khui thành công kỳ ${newPeriod.periodNumber} cho chân ${newPeriod.winnerName}!`,
        type: 'info',
      });

      // Bắn pháo hoa ăn mừng!
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Lỗi không xác định';
      toast({ body: 'Lỗi: ' + errorMsg, type: 'error' });
    }
  };

  // Toggle trạng thái đóng tiền của 1 chân trong kỳ mới nhất
  const handleTogglePayment = (periodIndex: number, slotId: string) => {
    if (!currentHui?.periods?.[periodIndex]) return;

    const updatedPeriods = currentHui.periods.map((period, idx) => {
      if (idx !== periodIndex) return period;

      const newPayments = period.payments.map((p) => {
        if (p.slotId === slotId) {
          const nextPaid = !p.isPaid;
          return {
            ...p,
            isPaid: nextPaid,
            paidAt: nextPaid ? new Date().toISOString().split('T')[0] : undefined,
          };
        }
        return p;
      });

      const allPaid = newPayments.every((p) => p.isPaid);

      return {
        ...period,
        payments: newPayments,
        // Nếu tất cả các chân đều đã đóng tiền, tự động cập nhật kỳ thành đã gom đủ
        isCompleted: allPaid ? true : period.isCompleted,
      };
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

  // Toggle trạng thái đã bàn giao tiền cho người nhận hụi ở kỳ mới nhất
  const handleToggleWinnerPayout = (periodIndex: number) => {
    if (!currentHui?.periods?.[periodIndex]) return;
    const targetPeriod = currentHui.periods[periodIndex];
    if (!targetPeriod) return;

    // Nếu đang là Đã bàn giao -> bấm để hủy hoàn tất
    if (targetPeriod.isCompleted) {
      applyPayoutUpdate(periodIndex, false, false);
      return;
    }

    // Nếu chuyển sang Đã bàn giao nhưng còn người chưa đóng tiền
    const unpaidMembers = (targetPeriod.payments || []).filter((p) => !p.isPaid);
    if (unpaidMembers.length > 0) {
      setPendingPayoutIndex(periodIndex);
      setUnpaidSummary({
        count: unpaidMembers.length,
        names: unpaidMembers.map((p) => p.memberName).join(', '),
      });
      setIsPayoutConfirmOpen(true);
      return;
    }

    // Đã thu đủ tiền từ trước
    applyPayoutUpdate(periodIndex, true, false);
  };

  const applyPayoutUpdate = (
    periodIndex: number,
    isCompleted: boolean,
    markAllPaid: boolean
  ) => {
    const updatedPeriods = currentHui.periods.map((period, idx) => {
      if (idx !== periodIndex) return period;
      return {
        ...period,
        isCompleted,
        payments: markAllPaid
          ? period.payments.map((p) => ({
              ...p,
              isPaid: true,
              paidAt: p.paidAt || new Date().toISOString().split('T')[0],
            }))
          : period.payments,
      };
    });

    const updatedHui: HuiGroup = {
      ...currentHui,
      periods: updatedPeriods,
    };

    const newHuiGroups = huiGroups.map((h) =>
      h.id === currentHui.id ? updatedHui : h
    );
    onUpdateHuiGroups(newHuiGroups);

    toast({
      body: isCompleted
        ? '✓ Đã bàn giao tiền thành công cho người nhận!'
        : 'Đã hoàn tác trạng thái bàn giao tiền',
      type: 'info',
    });
  };

  // Hoàn tác kỳ khui gần nhất (đưa chân hụi trở lại chân sống)
  const handleRevertLastPeriod = () => {
    if (!currentHui.periods || currentHui.periods.length === 0) return;
    setIsRevertConfirmOpen(true);
  };

  const applyRevertLastPeriod = () => {
    if (!currentHui.periods || currentHui.periods.length === 0) return;
    const lastPeriod = currentHui.periods[currentHui.periods.length - 1];

    const updatedPeriods = currentHui.periods.slice(0, -1);
    const updatedSlots = currentHui.slots.map((s) => {
      if (s.id === lastPeriod.winnerSlotId) {
        return {
          ...s,
          isDead: false,
          wonPeriod: undefined,
          bidAmount: undefined,
        };
      }
      return s;
    });

    const updatedHui: HuiGroup = {
      ...currentHui,
      slots: updatedSlots,
      periods: updatedPeriods,
      status: 'ACTIVE',
    };

    const newHuiGroups = huiGroups.map((h) =>
      h.id === currentHui.id ? updatedHui : h
    );
    onUpdateHuiGroups(newHuiGroups);
    setIsRevertConfirmOpen(false);

    toast({
      body: `Đã hoàn tác kỳ ${lastPeriod.periodNumber}. Chân ${lastPeriod.winnerName} trở lại chân sống.`,
      type: 'info',
    });
  };

  // Xóa dây hụi hiện tại (Soft delete lên Cloud và gỡ khỏi danh sách)
  const handleDeleteCurrentHui = async () => {
    if (!currentHui) return;
    setIsDeletingHui(true);
    const idToDelete = currentHui.id;
    const remainingGroups = huiGroups.filter((h) => h.id !== idToDelete);

    if (remainingGroups.length > 0) {
      setSelectedHuiId(remainingGroups[0].id);
    } else {
      setSelectedHuiId('');
    }

    setIsDeleteDialogOpen(false);
    setIsDeletingHui(false);

    // Cập nhật state danh sách mới cho app
    onUpdateHuiGroups(remainingGroups);

    // Đồng bộ xóa mềm lên Supabase
    await softDeleteHuiGroupFromCloud(idToDelete);
  };

  // Thay đổi tháng bắt đầu của dây hụi hiện tại
  const handleChangeStartMonth = (newMonth: number) => {
    if (!currentHui) return;
    const updatedHui: HuiGroup = {
      ...currentHui,
      startMonth: newMonth,
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
      header: 'Thành viên',
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
      header: 'Tình trạng & thao tác',
      renderCell: (s: SlotStatistic) => (
        <HStack gap={2} vAlign="center" wrap="wrap">
          {s.isDead ? (
            <Badge label={`Đã nhận kỳ ${s.wonPeriod || ''}`} variant="neutral" />
          ) : (
            <Badge label="Chưa nhận" variant="green" />
          )}
          {!s.isDead && (
            <Button
              label="Chọn nhận hụi"
              variant="secondary"
              size="sm"
              icon={<Icon icon={Plus} size="sm" />}
              onClick={() => {
                setWinnerSlotId(s.slotId);
                setIsKhuiDialogOpen(true);
              }}
            />
          )}
        </HStack>
      ),
      width: pixel(240),
    },
    {
      key: 'totalPaid',
      header: 'Tổng đã đóng',
      align: 'end',
      renderCell: (s: SlotStatistic) => (
        <Text hasTabularNumbers>{formatCurrency(s.totalPaid)}</Text>
      ),
      width: proportional(1.5),
    },
    {
      key: 'totalReceived',
      header: 'Đã nhận (hốt)',
      align: 'end',
      renderCell: (s: SlotStatistic) =>
        s.totalReceived > 0 ? (
          <Text weight="semibold" hasTabularNumbers>{formatCurrency(s.totalReceived)}</Text>
        ) : (
          <Text color="secondary">—</Text>
        ),
      width: proportional(1.5),
    },
    {
      key: 'netProfit',
      header: 'Lãi / lỗ ròng',
      align: 'end',
      renderCell: (s: SlotStatistic) => {
        if (!s.isDead) {
          return <Text color="secondary">Chưa hốt</Text>;
        }
        if (s.netProfit > 0) {
          return (
            <Text
              weight="semibold"
              hasTabularNumbers
              style={{ color: 'var(--color-text-success, #059669)' }}
            >
              +{formatCurrency(s.netProfit)}
            </Text>
          );
        }
        if (s.netProfit < 0) {
          return (
            <Text
              weight="semibold"
              hasTabularNumbers
              style={{ color: 'var(--color-text-error, #e11d48)' }}
            >
              {formatCurrency(s.netProfit)}
            </Text>
          );
        }
        return (
          <Text weight="semibold" hasTabularNumbers color="secondary">
            0 ₫
          </Text>
        );
      },
      width: proportional(1.5),
    },
    {
      key: 'qrCode',
      header: 'Mã QR',
      renderCell: (s: SlotStatistic) => {
        const slot = currentHui.slots.find((slotItem) => slotItem.id === s.slotId);
        const hasQr = !!slot?.qrCodeUrl;
        return (
          <HStack gap={1} vAlign="center">
            {hasQr ? (
              <Button
                label="Xem QR"
                variant="primary"
                size="sm"
                icon={<Icon icon={QrCodeIcon} size="sm" />}
                onClick={() => {
                  setSelectedQrUrl(slot!.qrCodeUrl!);
                  setSelectedQrName(s.memberName);
                  setTargetUploadSlotId(s.slotId);
                  setIsQrUploadMode(false);
                  setIsQrModalOpen(true);
                }}
              />
            ) : (
              <Button
                label="Tải QR"
                variant="ghost"
                size="sm"
                icon={<Icon icon={ArrowUpTrayIcon} size="sm" />}
                onClick={() => {
                  setSelectedQrUrl('');
                  setSelectedQrName(s.memberName);
                  setTargetUploadSlotId(s.slotId);
                  setIsQrUploadMode(true);
                  setIsQrModalOpen(true);
                }}
              />
            )}
          </HStack>
        );
      },
      width: pixel(130),
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
      header: 'Thành viên',
      renderCell: (p: HuiPeriodPayment) => p.memberName,
      width: proportional(2),
    },
    {
      key: 'amountToPay',
      header: 'Số tiền phải đóng',
      align: 'end',
      renderCell: (p: HuiPeriodPayment) => (
        <Text weight="semibold" hasTabularNumbers>{formatCurrency(p.amountToPay)}</Text>
      ),
      width: proportional(1.5),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      renderCell: (p: HuiPeriodPayment) =>
        p.isPaid ? (
          <Badge label="Đã đóng" variant="green" />
        ) : (
          <Badge label="Chưa đóng" variant="yellow" />
        ),
      width: pixel(120),
    },
    {
      key: 'action',
      header: 'Điểm danh',
      renderCell: (p: HuiPeriodPayment) => (
        <Button
          label={p.isPaid ? 'Hoàn tác' : 'Đã thu'}
          variant={p.isPaid ? 'ghost' : 'primary'}
          size="sm"
          icon={
            <Icon
              icon={p.isPaid ? RotateCcw : CheckIcon}
              size="sm"
            />
          }
          onClick={() =>
            handleTogglePayment(currentHui.periods.length - 1, p.slotId)
          }
        />
      ),
      width: pixel(140),
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
        <HStack hAlign="between" vAlign="end" wrap="wrap" gap={4}>
          <HStack gap={3} vAlign="end" wrap="wrap">
            <Selector
              label="Chọn dây hụi"
              value={selectedHuiId}
              options={huiOptions}
              onChange={setSelectedHuiId}
              width={280}
            />
            <Selector
              label="Bắt đầu từ"
              value={String(currentHui.startMonth || 4)}
              options={MONTH_OPTIONS}
              onChange={(val) => handleChangeStartMonth(parseInt(val, 10))}
              width={140}
            />
          </HStack>

          <HStack gap={2} vAlign="end" wrap="wrap">
            {livingSlots.length > 0 ? (
              <Button
                label="Khui hụi kỳ mới"
                variant="primary"
                size="md"
                icon={<Icon icon={CalendarPlus} size="sm" />}
                onClick={() => {
                  setWinnerSlotId(livingSlots[0]?.id || '');
                  setIsKhuiDialogOpen(true);
                }}
              />
            ) : (
              <Badge label="Dây đã mãn hạn" variant="neutral" />
            )}
            <Button
              label="Thêm dây mới"
              variant="secondary"
              size="md"
              icon={<Icon icon={Plus} size="sm" />}
              onClick={() => setIsCreateDialogOpen(true)}
            />
            <Divider orientation="vertical" />
            <Button
              label="Xóa dây hụi"
              variant="destructive"
              size="md"
              icon={<Icon icon={Trash2} size="sm" />}
              onClick={() => setIsDeleteDialogOpen(true)}
            />
          </HStack>
        </HStack>
      </Card>

      {/* Thông tin chi tiết Dây Hụi (4 thẻ KPI) */}
      <Grid columns={{ minWidth: 220, repeat: 'fit' }} gap={4}>
        <Card>
          <VStack gap={1}>
            <Text type="supporting" color="secondary">
              Tiền góp mỗi chân
            </Text>
            <Heading level={4}>{formatCurrency(currentHui.amountPerSlot)}</Heading>
            <Text type="supporting">Mỗi kỳ / 1 chân</Text>
          </VStack>
        </Card>
        <Card>
          <VStack gap={1}>
            <Text type="supporting" color="secondary">
              Số chân / kỳ
            </Text>
            <Heading level={4}>{currentHui.totalSlots} chân</Heading>
            <Text type="supporting">
              Chu kỳ: {currentHui.cycle === 'MONTHLY' ? 'Hàng tháng' : currentHui.cycle === 'WEEKLY' ? 'Hàng tuần' : 'Hàng ngày'}
            </Text>
          </VStack>
        </Card>
        <Card>
          <VStack gap={2}>
            <VStack gap={1}>
              <Text type="supporting" color="secondary">
                Số kỳ đã khui
              </Text>
              <Heading level={4}>{currentHui.periods?.length || 0} / {currentHui.totalSlots} kỳ</Heading>
            </VStack>
            <ProgressBar
              label="Tiến độ khui hụi"
              isLabelHidden
              value={currentHui.periods?.length || 0}
              max={currentHui.totalSlots || 1}
              variant={currentHui.periods?.length === currentHui.totalSlots ? 'success' : 'accent'}
            />
            <Text type="supporting">
              Đạt {Math.round(((currentHui.periods?.length || 0) / (currentHui.totalSlots || 1)) * 100)}% chặng đường
            </Text>
          </VStack>
        </Card>
        <Card>
          <VStack gap={1}>
            <Text type="supporting" color="secondary">
              Chân chưa hốt (sống)
            </Text>
            <Heading level={4}>{livingSlots.length} chân</Heading>
            <Text type="supporting">Cơ hội hốt các kỳ tiếp</Text>
          </VStack>
        </Card>
      </Grid>

      {/* Bảng Ma Trận Lũy Tiến Bậc Thang chuẩn theo mô hình Excel */}
      {huiMatrix && (
        <HuiMatrixTable
          matrix={huiMatrix}
          title={`Bảng ma trận đóng hụi lũy tiến - ${currentHui.name}`}
          subtitle={`Bắt đầu từ tháng ${currentHui.startMonth || 4}`}
        />
      )}

      {/* Bảng Điểm Danh Đóng Tiền Kỳ Mới Nhất (nếu có kỳ đã khui) */}
      {latestPeriod && (() => {
        const winnerSlot = currentHui.slots.find((s) => s.id === latestPeriod.winnerSlotId);
        const winnerQr = latestPeriod.winnerQrCode || winnerSlot?.qrCodeUrl;

        return (
          <Card>
            <VStack gap={4}>
              <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
                <VStack gap={1}>
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    <Heading level={4}>
                      Điểm danh thu tiền kỳ {latestPeriod.periodNumber} ({formatDateVi(latestPeriod.openDate)})
                    </Heading>
                    <Badge
                      label={`Người nhận (LỤM): ${latestPeriod.winnerName}`}
                      variant="blue"
                    />
                    {latestPeriod.isCompleted ? (
                      <Badge label="Đã nhận đủ tiền" variant="green" />
                    ) : (
                      <Badge label="Chờ gom tiền bàn giao" variant="orange" />
                    )}
                  </HStack>
                  <Text type="supporting" color="secondary">
                    Thực lĩnh kỳ này:{' '}
                    <Text weight="semibold" hasTabularNumbers>
                      {formatCurrency(latestPeriod.actualReceived)}
                    </Text>
                  </Text>
                </VStack>

                <HStack gap={2} vAlign="center" wrap="wrap">
                  <Button
                    label={
                      latestPeriod.isCompleted
                        ? 'Đã bàn giao tiền hụi'
                        : 'Xác nhận đã giao tiền'
                    }
                    variant={latestPeriod.isCompleted ? 'secondary' : 'primary'}
                    size="md"
                    icon={<Icon icon={CheckIcon} size="sm" />}
                    onClick={() =>
                      handleToggleWinnerPayout(currentHui.periods.length - 1)
                    }
                  />
                  <Button
                    label="Hoàn tác kỳ"
                    variant="ghost"
                    size="md"
                    onClick={handleRevertLastPeriod}
                  />
                  {winnerQr ? (
                    <>
                      <Button
                        label="Quét mã QR"
                        variant="secondary"
                        size="md"
                        icon={<Icon icon={QrCodeIcon} size="sm" />}
                        onClick={() => {
                          setSelectedQrUrl(winnerQr);
                          setSelectedQrName(latestPeriod.winnerName);
                          setTargetUploadSlotId(latestPeriod.winnerSlotId);
                          setIsQrUploadMode(false);
                          setIsQrModalOpen(true);
                        }}
                      />
                      <Button
                        label="Đổi QR"
                        variant="ghost"
                        size="md"
                        icon={<Icon icon={ArrowUpTrayIcon} size="sm" />}
                        onClick={() => {
                          setSelectedQrUrl(winnerQr);
                          setSelectedQrName(latestPeriod.winnerName);
                          setTargetUploadSlotId(latestPeriod.winnerSlotId);
                          setIsQrUploadMode(true);
                          setIsQrModalOpen(true);
                        }}
                      />
                    </>
                  ) : (
                    <Button
                      label="Tải lên mã QR"
                      variant="secondary"
                      size="md"
                      icon={<Icon icon={ArrowUpTrayIcon} size="sm" />}
                      onClick={() => {
                        setSelectedQrUrl('');
                        setSelectedQrName(latestPeriod.winnerName);
                        setTargetUploadSlotId(latestPeriod.winnerSlotId);
                        setIsQrUploadMode(true);
                        setIsQrModalOpen(true);
                      }}
                    />
                  )}
                </HStack>
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
        );
      })()}

      {/* Bảng Danh Sách Chân Hụi & Thống Kê Lãi/Lỗ Từng Thành Viên */}
      <Card>
        <VStack gap={4}>
          <HStack hAlign="between" vAlign="center">
            <VStack gap={1}>
              <Heading level={4}>Danh sách chân hụi & lãi / lỗ từng người</Heading>
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
        width={500}
        purpose="form"
      >
        <DialogHeader
          title="Khui hụi kỳ mới (Ghi nhận người nhận hụi)"
          subtitle={`Dây: ${currentHui.name} · Kỳ ${
            (currentHui.periods?.length || 0) + 1
          } / ${currentHui.totalSlots}`}
          onOpenChange={setIsKhuiDialogOpen}
        />
        <VStack gap={4} padding={4}>
          <Selector
            label="Chọn thành viên nhận hụi kỳ này"
            value={winnerSlotId}
            options={winnerOptions}
            onChange={setWinnerSlotId}
            width="100%"
          />

          <DateInput
            label="Ngày khui hụi"
            value={(khuiDateStr as any) || undefined}
            onChange={(val) => {
              if (val) setKhuiDateStr(val);
            }}
            placeholder="Chọn ngày khui hụi"
            description="Bấm vào để chọn ngày, tháng, năm từ lịch"
            presentation="popover"
            width="100%"
          />

          <TextInput
            label="Mức thăm / tiền kêu hụi (nếu đấu giá)"
            value={bidAmountStr}
            onChange={setBidAmountStr}
            description="Để mức thăm là 0 VNĐ nếu chơi hụi lũy tiến theo thứ tự cố định"
          />

          <Divider />

          <HStack hAlign="end" gap={3}>
            <Button
              label="Hủy"
              variant="secondary"
              size="md"
              onClick={() => setIsKhuiDialogOpen(false)}
            />
            <Button
              label="Xác nhận nhận hụi"
              variant="primary"
              size="md"
              icon={<Icon icon={CheckIcon} size="sm" />}
              onClick={handleConfirmKhuiHui}
            />
          </HStack>
        </VStack>
      </Dialog>

      {/* DIALOG TẠO DÂY HỤI MỚI */}
      {renderCreateDialog()}

      {/* DIALOG XEM & TẢI LÊN MÃ QR NHẬN TIỀN */}
      <Dialog
        isOpen={isQrModalOpen}
        onOpenChange={setIsQrModalOpen}
        width={440}
        purpose="form"
      >
        <DialogHeader
          title={`Mã QR Nhận Tiền - ${selectedQrName}`}
          subtitle="Quét mã ngân hàng hoặc MoMo để chuyển tiền vào tài khoản người nhận hụi"
          onOpenChange={setIsQrModalOpen}
        />
        <VStack gap={4} padding={4} hAlign="center">
          {isQrUploadMode ? (
            <VStack gap={3} width="100%">
              {qrUploadError && (
                <Card variant="muted">
                  <HStack gap={2} vAlign="center">
                    <Icon icon={ExclamationTriangleIcon} size="sm" color="error" />
                    <Text type="supporting" color="primary">
                      {qrUploadError}
                    </Text>
                  </HStack>
                </Card>
              )}
              <FileInput
                label={`Tải lên hình ảnh mã QR của ${selectedQrName}`}
                description="Chỉ chấp nhận file ảnh thật (JPG, PNG, WEBP tối đa 5MB). File sẽ được kiểm tra chữ ký nhị phân và khử trùng tự động."
                mode="dropzone"
                accept="image/png,image/jpeg,image/webp"
                value={null}
                isDisabled={isUploadingQr}
                onChange={async (file) => {
                  const selectedFile = Array.isArray(file) ? file[0] : file;
                  if (!selectedFile) return;

                  setQrUploadError('');
                  setIsUploadingQr(true);

                  try {
                    // 1. Xác thực nhị phân & Khử khuẩn bằng Canvas (chống đổi đuôi file bậy bạ)
                    const validation = await sanitizeAndValidateImage(selectedFile);
                    if (!validation.success || !validation.blob) {
                      setQrUploadError(validation.error || 'Tệp không phải là hình ảnh hợp lệ.');
                      setIsUploadingQr(false);
                      return;
                    }

                    // 2. Tải ảnh sạch lên Supabase Storage bucket 'qr-codes'
                    const targetSlot = targetUploadSlotId || (latestPeriod ? latestPeriod.winnerSlotId : 'winner');
                    const cleanFileName = `${currentHui?.id || 'hui'}/${targetSlot}_${Date.now()}.webp`;

                    const storagePublicUrl = await uploadQrCodeToStorage(validation.blob, cleanFileName);

                    if (storagePublicUrl) {
                      // Lưu link công khai từ Supabase Storage
                      handleSaveQrCode(storagePublicUrl);
                    } else {
                      // Fallback: nếu chưa tạo bucket Storage hoặc offline, lưu base64 đã qua khử trùng
                      const reader = new FileReader();
                      reader.onload = () => {
                        const cleanBase64 = reader.result as string;
                        handleSaveQrCode(cleanBase64);
                      };
                      reader.readAsDataURL(validation.blob);
                    }
                  } catch (e) {
                    console.warn('Lỗi tải mã QR:', e);
                    setQrUploadError('Đã có lỗi xảy ra khi xác thực và tải ảnh lên.');
                  } finally {
                    setIsUploadingQr(false);
                  }
                }}
              />
              {isUploadingQr && (
                <Text type="supporting" color="secondary">
                  Đang kiểm tra chữ ký nhị phân và tải lên Storage...
                </Text>
              )}
              {selectedQrUrl && (
                <HStack hAlign="between" width="100%">
                  <Button
                    label="Xóa mã QR hiện tại"
                    variant="destructive"
                    size="sm"
                    icon={<Icon icon={Trash2} size="sm" />}
                    onClick={handleRemoveQrCode}
                  />
                  <Button
                    label="Quay lại xem QR hiện tại"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setQrUploadError('');
                      setIsQrUploadMode(false);
                    }}
                  />
                </HStack>
              )}
            </VStack>
          ) : (
            <VStack gap={3} hAlign="center">
              {selectedQrUrl ? (
                <Card variant="muted">
                  <VStack padding={3} hAlign="center" vAlign="center">
                    <Avatar
                      src={selectedQrUrl}
                      size={180}
                      shape="rounded"
                      name={selectedQrName}
                      alt={`Mã QR ${selectedQrName}`}
                      tooltip={false}
                    />
                  </VStack>
                </Card>
              ) : (
                <Text color="secondary">Chưa có mã QR nào</Text>
              )}
              <Text type="supporting" color="secondary">
                Vui lòng kiểm tra đúng tên người nhận {selectedQrName} trước khi bấm xác nhận chuyển tiền.
              </Text>
              <HStack gap={2} wrap="wrap" hAlign="center">
                <Button
                  label="Đổi sang ảnh QR khác"
                  variant="secondary"
                  size="sm"
                  icon={<Icon icon={ArrowUpTrayIcon} size="sm" />}
                  onClick={() => setIsQrUploadMode(true)}
                />
              </HStack>
            </VStack>
          )}

          <Divider />

          <HStack gap={2} hAlign="between" width="100%">
            {selectedQrUrl && !isQrUploadMode ? (
              <Button
                label="Xóa mã QR"
                variant="destructive"
                size="md"
                icon={<Icon icon={Trash2} size="sm" />}
                onClick={handleRemoveQrCode}
              />
            ) : (
              <HStack />
            )}
            <Button
              label="Đóng"
              variant="secondary"
              size="md"
              onClick={() => {
                setIsQrModalOpen(false);
                setQrUploadError('');
              }}
            />
          </HStack>
        </VStack>
      </Dialog>

      {/* DIALOG XÁC NHẬN XÓA DÂY HỤI */}
      <Dialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        width={480}
        purpose="required"
      >
        <DialogHeader
          title="Xác nhận xóa dây hụi"
          subtitle={`Dây: ${currentHui?.name || ''}`}
          onOpenChange={setIsDeleteDialogOpen}
        />
        <VStack gap={4} padding={4}>
          <Text color="secondary">
            Bạn có chắc chắn muốn xóa dây hụi <Text weight="bold">&quot;{currentHui?.name}&quot;</Text>?
          </Text>
          <Text type="supporting" color="secondary">
            Hành động này sẽ xóa dây hụi cùng toàn bộ các kỳ đã khui và lịch sử đóng tiền khỏi màn hình, đồng thời đồng bộ xóa trên cơ sở dữ liệu Supabase.
          </Text>

          <Divider />

          <HStack hAlign="end" gap={2}>
            <Button
              label="Hủy"
              variant="secondary"
              size="md"
              onClick={() => setIsDeleteDialogOpen(false)}
            />
            <Button
              label="Xác nhận xóa"
              variant="destructive"
              size="md"
              isLoading={isDeletingHui}
              icon={<Icon icon={Trash2} size="sm" />}
              onClick={handleDeleteCurrentHui}
            />
          </HStack>
        </VStack>
      </Dialog>

      {/* ALERT DIALOG: XÁC NHẬN BÀN GIAO TIỀN KÈM TỰ ĐỘNG THU TIỀN */}
      <AlertDialog
        isOpen={isPayoutConfirmOpen}
        onOpenChange={setIsPayoutConfirmOpen}
        title="Xác nhận thu đủ & bàn giao hụi"
        description={`Hiện tại vẫn còn ${unpaidSummary.count} chân chưa đóng tiền (${unpaidSummary.names}). Bạn có muốn tự động xác nhận ĐÃ THU ĐỦ TIỀN từ tất cả thành viên và bàn giao đủ tiền cho người nhận không?`}
        actionLabel="Thu đủ tiền & Bàn giao"
        cancelLabel="Hủy bỏ"
        actionVariant="primary"
        width={480}
        onAction={() => {
          if (pendingPayoutIndex !== null) {
            applyPayoutUpdate(pendingPayoutIndex, true, true);
          }
          setIsPayoutConfirmOpen(false);
        }}
      />

      {/* ALERT DIALOG: HOÀN TÁC KỲ KHUI GẦN NHẤT */}
      <AlertDialog
        isOpen={isRevertConfirmOpen}
        onOpenChange={setIsRevertConfirmOpen}
        title="Hoàn tác kỳ khui gần nhất?"
        description="Bạn có chắc chắn muốn hoàn tác kỳ khui này không? Chân hụi vừa nhận sẽ trở lại trạng thái chân sống và bảng ma trận đóng hụi sẽ được tính toán lại."
        actionLabel="Hoàn tác kỳ này"
        cancelLabel="Giữ nguyên"
        actionVariant="destructive"
        width={460}
        onAction={applyRevertLastPeriod}
      />

      {/* ALERT DIALOG: XÓA MÃ QR NHẬN TIỀN */}
      <AlertDialog
        isOpen={isRemoveQrConfirmOpen}
        onOpenChange={setIsRemoveQrConfirmOpen}
        title="Xóa mã QR chuyển khoản?"
        description={`Bạn có chắc chắn muốn xóa ảnh mã QR của ${selectedQrName}? Sau khi xóa, bạn có thể tải lên mã QR mới bất kỳ lúc nào.`}
        actionLabel="Xác nhận xóa QR"
        cancelLabel="Hủy"
        actionVariant="destructive"
        width={440}
        onAction={applyRemoveQrCode}
      />
    </VStack>
  );
}
