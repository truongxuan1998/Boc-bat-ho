'use client';

import React, { useState, useMemo, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { StackItem } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Grid } from '@astryxdesign/core/Grid';
import { Divider } from '@astryxdesign/core/Divider';
import { TextInput } from '@astryxdesign/core/TextInput';
import { DateInput } from '@astryxdesign/core/DateInput';
import type { ISODateString } from '@astryxdesign/core/Calendar';
import { Selector } from '@astryxdesign/core/Selector';
import { DialogHeader } from '@astryxdesign/core/Dialog';
import { FormDialog } from '@/components/FormDialog';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useToast } from '@astryxdesign/core/Toast';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Table, TableColumn, pixel, proportional, useTableStickyColumns } from '@astryxdesign/core/Table';
import { Avatar } from '@astryxdesign/core/Avatar';
import { FileInput } from '@astryxdesign/core/FileInput';
import { Icon } from '@astryxdesign/core/Icon';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import {
  Plus,
  Trash2,
  CalendarPlus,
  RotateCcw,
  CalendarCog,
  Users,
} from 'lucide-react';
import {
  CheckIcon,
  QrCodeIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { HuiGroup, HuiPeriodPayment, HuiSlot, HuiPeriod } from '@/types';
import {
  calculateNewHuiPeriod,
  calculateSlotStatistics,
  generateProgressiveMatrix,
  formatCurrency,
  SlotStatistic,
} from '@/lib/huiCalculator';
import { formatDateVi, MONTH_OPTIONS } from '@/lib/format';
import { HuiMatrixTable, ProfitBadge } from '@/components/HuiMatrixTable';
import { MoneyInput } from '@/components/MoneyInput';
import { MemberOrderEditor } from '@/components/MemberOrderEditor';
import { sanitizeAndValidateImage } from '@/lib/imageValidator';
import {
  uploadQrCodeToStorage,
  softDeleteHuiGroupFromCloud,
} from '@/lib/supabaseClient';

const CYCLE_LABELS: Record<HuiGroup['cycle'], string> = {
  MONTHLY: 'Hàng tháng',
  BIWEEKLY: '2 tuần/lần',
  WEEKLY: 'Hàng tuần',
  DAILY: 'Hàng ngày',
};

const todayIso = () => new Date().toISOString().split('T')[0];

// Lãi/lỗ cả dây của một chân đã lụm ở kỳ k trong dây n kỳ (mô hình lũy tiến):
// nhận thêm (k-1)k/2 bậc lãi, sau đó đóng bù (n-k)(n-k+1)/2 bậc.
function projectedNetProfit(k: number, n: number, step: number): number {
  const bonus = ((k - 1) * k) / 2;
  const paidBack = ((n - k) * (n - k + 1)) / 2;
  return (bonus - paidBack) * step;
}

function signedCurrency(v: number): string {
  if (v > 0) return `+${formatCurrency(v)}`;
  if (v < 0) return `−${formatCurrency(Math.abs(v))}`;
  return formatCurrency(0);
}

interface HuiTabProps {
  huiGroups: HuiGroup[];
  onUpdateHuiGroups: (groups: HuiGroup[]) => void;
}

export function HuiTab({ huiGroups, onUpdateHuiGroups }: HuiTabProps) {
  const toast = useToast();
  const isCompact = useMediaQuery('(max-width: 640px)');
  // Điện thoại: nút và ô chọn cỡ lớn cho dễ bấm
  const ctl = isCompact ? 'lg' : 'md';
  const rowCtl = isCompact ? 'lg' : 'sm';
  const [selectedHuiId, setSelectedHuiId] = useState<string>(huiGroups[0]?.id || '');

  // Kỳ đang xem trong bảng điểm danh (null = kỳ mới nhất)
  const [viewPeriodIdx, setViewPeriodIdx] = useState<number | null>(null);

  // Xác nhận bàn giao khi còn người chưa đóng
  const [isPayoutConfirmOpen, setIsPayoutConfirmOpen] = useState(false);
  const [pendingPayoutIndex, setPendingPayoutIndex] = useState<number | null>(null);
  const [unpaidSummary, setUnpaidSummary] = useState({ count: 0, names: '' });

  const [isRevertConfirmOpen, setIsRevertConfirmOpen] = useState(false);
  const [isRemoveQrConfirmOpen, setIsRemoveQrConfirmOpen] = useState(false);

  // QR
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isQrUploadMode, setIsQrUploadMode] = useState(false);
  const [selectedQrUrl, setSelectedQrUrl] = useState<string>('');
  const [selectedQrName, setSelectedQrName] = useState<string>('');
  const [targetUploadSlotId, setTargetUploadSlotId] = useState<string>('');
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [qrUploadError, setQrUploadError] = useState<string>('');

  // Khui hụi
  const [isKhuiDialogOpen, setIsKhuiDialogOpen] = useState(false);
  const [winnerSlotId, setWinnerSlotId] = useState<string>('');
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [khuiDateStr, setKhuiDateStr] = useState<string>(todayIso());

  // Đổi tháng bắt đầu
  const [isStartMonthDialogOpen, setIsStartMonthDialogOpen] = useState(false);
  const [pendingStartMonth, setPendingStartMonth] = useState<number>(1);

  // Tạo dây hụi mới
  const currentMonthNumber = new Date().getMonth() + 1;
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newHuiName, setNewHuiName] = useState(`Dây hụi tháng ${currentMonthNumber}`);
  const [newHuiAmount, setNewHuiAmount] = useState<number>(3000000);
  const [newHuiMembers, setNewHuiMembers] = useState<string[]>([]);
  const [newHuiStep, setNewHuiStep] = useState<number>(30000);
  const [newHuiStartMonth, setNewHuiStartMonth] = useState<number>(currentMonthNumber);
  const [newHuiCycle, setNewHuiCycle] = useState<HuiGroup['cycle']>('MONTHLY');

  // Xóa dây hụi
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingHui, setIsDeletingHui] = useState(false);

  const currentHui = huiGroups.find((h) => h.id === selectedHuiId) || huiGroups[0];

  // Mở modal tạo dây hụi hoặc xem QR nếu URL có query param
  useEffect(() => {
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
  }, [currentHui]);

  // Tự chọn dây đầu tiên khi danh sách tải xong hoặc dây đang xem bị xóa
  useEffect(() => {
    if (huiGroups.length > 0 && (!selectedHuiId || !huiGroups.some((h) => h.id === selectedHuiId))) {
      setSelectedHuiId(huiGroups[0].id);
    }
  }, [huiGroups, selectedHuiId]);

  const huiMatrix = useMemo(() => {
    if (!currentHui) return null;
    return generateProgressiveMatrix(
      currentHui.slots.map((s) => s.memberName),
      currentHui.startMonth || 4,
      currentHui.interestStep ?? 30000,
      currentHui.amountPerSlot
    );
  }, [currentHui]);

  const slotStickyPlugin = useTableStickyColumns<SlotStatistic>({
    startKeys: ['memberName'],
  });

  const createSummary = useMemo(() => {
    const totalSlots = newHuiMembers.length;
    const basePot = Math.max(0, (totalSlots - 1) * newHuiAmount);
    const lastWonBonus = totalSlots > 0 ? (((totalSlots - 1) * totalSlots) / 2) * newHuiStep : 0;
    return { totalSlots, basePot, lastWonBonus, lastTotalReceived: basePot + lastWonBonus };
  }, [newHuiMembers.length, newHuiAmount, newHuiStep]);

  // Ghi một dây hụi đã cập nhật vào danh sách
  const commitHui = (updatedHui: HuiGroup) => {
    onUpdateHuiGroups(huiGroups.map((h) => (h.id === updatedHui.id ? updatedHui : h)));
  };

  const handleCreateHuiGroup = () => {
    if (!newHuiName.trim()) {
      toast({ body: 'Vui lòng nhập tên dây hụi', type: 'error' });
      return;
    }
    if (newHuiMembers.length < 2) {
      toast({ body: 'Dây hụi cần ít nhất 2 thành viên', type: 'error' });
      return;
    }
    if (newHuiAmount <= 0) {
      toast({ body: 'Vui lòng nhập tiền góp mỗi chân', type: 'error' });
      return;
    }

    const newId = 'hui_' + Date.now();
    const newGroup: HuiGroup = {
      id: newId,
      name: newHuiName.trim(),
      amountPerSlot: newHuiAmount,
      totalSlots: newHuiMembers.length,
      cycle: newHuiCycle,
      commissionPerPeriod: 0,
      interestStep: newHuiStep,
      startMonth: newHuiStartMonth || currentMonthNumber,
      startDate: todayIso(),
      status: 'ACTIVE',
      slots: newHuiMembers.map((name, i) => ({
        id: `slot_${newId}_${i + 1}`,
        huiId: newId,
        slotNumber: i + 1,
        memberName: name,
        isDead: false,
      })),
      periods: [],
    };

    onUpdateHuiGroups([...huiGroups, newGroup]);
    setSelectedHuiId(newId);
    setIsCreateDialogOpen(false);
    setNewHuiMembers([]);
    toast({ body: `Đã tạo dây "${newGroup.name}"`, type: 'info' });
  };

  const renderCreateDialog = () => (
    <FormDialog isOpen={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} width={640} purpose="form"
      header={
        <DialogHeader
          title="Tạo dây hụi mới"
          subtitle="Hụi lũy tiến: mỗi kỳ sau người lụm nhận thêm một bậc lãi"
          onOpenChange={setIsCreateDialogOpen}
        />
      }
      footer={
        <HStack hAlign="end" gap={2}>
          <Button label="Hủy" variant="ghost" onClick={() => setIsCreateDialogOpen(false)} />
          <Button label="Tạo dây hụi" variant="primary" icon={<Icon icon={Plus} />} onClick={handleCreateHuiGroup} />
        </HStack>
      }
    >
      <TextInput
        label="Tên dây hụi"
        value={newHuiName}
        onChange={setNewHuiName}
        placeholder="Ví dụ: Dây 3 triệu nhóm bạn thân"
        width="100%"
      />

      <Grid columns={{ minWidth: 200, repeat: 'fit' }} gap={3}>
        <MoneyInput label="Tiền góp mỗi chân" value={newHuiAmount} onChange={setNewHuiAmount} placeholder="3.000.000" />
        <MoneyInput label="Lãi tăng mỗi kỳ" value={newHuiStep} onChange={setNewHuiStep} placeholder="30.000" />
      </Grid>

      <MemberOrderEditor members={newHuiMembers} onChange={setNewHuiMembers} minMembers={0} />

      <Grid columns={{ minWidth: 200, repeat: 'fit' }} gap={3}>
        <Selector
          label="Tháng bắt đầu"
          value={String(newHuiStartMonth)}
          options={MONTH_OPTIONS}
          onChange={(val) => setNewHuiStartMonth(parseInt(val, 10))}
          width="100%"
        />
        <Selector
          label="Chu kỳ khui"
          value={newHuiCycle}
          options={[
            { value: 'MONTHLY', label: 'Hàng tháng' },
            { value: 'WEEKLY', label: 'Hàng tuần' },
            { value: 'DAILY', label: 'Hàng ngày' },
          ]}
          onChange={(v) => setNewHuiCycle(v as HuiGroup['cycle'])}
          width="100%"
        />
      </Grid>

      <Card variant="muted" padding={3}>
        <Grid columns={{ minWidth: 150, repeat: 'fit' }} gap={3}>
          <VStack gap={0.5}>
            <Text type="supporting" color="secondary">Số kỳ</Text>
            <Text weight="bold" hasTabularNumbers>{createSummary.totalSlots} kỳ</Text>
          </VStack>
          <VStack gap={0.5}>
            <Text type="supporting" color="secondary">Lụm gốc mỗi kỳ</Text>
            <Text weight="bold" hasTabularNumbers>{formatCurrency(createSummary.basePot)}</Text>
          </VStack>
          <VStack gap={0.5}>
            <Text type="supporting" color="secondary">Kỳ chót nhận</Text>
            <Text weight="bold" hasTabularNumbers>{formatCurrency(createSummary.lastTotalReceived)}</Text>
          </VStack>
        </Grid>
      </Card>

    </FormDialog>
  );

  if (!currentHui) {
    return (
      <VStack gap={4}>
        <Card padding={8}>
          <EmptyState
            icon={<Icon icon={Users} size="lg" />}
            title="Chưa có dây hụi nào"
            description="Tạo dây hụi đầu tiên: nhập số tiền góp, mức lãi tăng mỗi kỳ và thứ tự lụm của các thành viên."
            actions={
              <Button
                label="Tạo dây hụi đầu tiên"
                variant="primary"
                icon={<Icon icon={Plus} />}
                onClick={() => setIsCreateDialogOpen(true)}
              />
            }
          />
        </Card>
        {renderCreateDialog()}
      </VStack>
    );
  }

  const periods = currentHui.periods || [];
  const livingSlots = currentHui.slots.filter((s) => !s.isDead);
  const slotStats = calculateSlotStatistics(currentHui);
  const latestIdx = periods.length - 1;
  const activeIdx = viewPeriodIdx !== null && viewPeriodIdx <= latestIdx ? viewPeriodIdx : latestIdx;
  const activePeriod: HuiPeriod | undefined = periods[activeIdx];
  const isViewingLatest = activeIdx === latestIdx;
  const latestPeriod = periods[latestIdx];
  const step = currentHui.interestStep ?? 0;
  const isProgressive = step > 0;

  // Xem trước số tiền người lụm sẽ nhận trong dialog khui
  const khuiPreview = (() => {
    if (!winnerSlotId) return null;
    try {
      return calculateNewHuiPeriod(currentHui, winnerSlotId, bidAmount, khuiDateStr);
    } catch {
      return null;
    }
  })();

  const openKhuiDialog = (slotId?: string) => {
    setWinnerSlotId(slotId || livingSlots[0]?.id || '');
    setBidAmount(0);
    setKhuiDateStr(todayIso());
    setIsKhuiDialogOpen(true);
  };

  const handleConfirmKhuiHui = () => {
    if (!winnerSlotId) {
      toast({ body: 'Vui lòng chọn người lụm kỳ này', type: 'error' });
      return;
    }
    try {
      const newPeriod = calculateNewHuiPeriod(currentHui, winnerSlotId, bidAmount, khuiDateStr);
      const updatedSlots = currentHui.slots.map((s) =>
        s.id === winnerSlotId
          ? { ...s, isDead: true, wonPeriod: newPeriod.periodNumber, bidAmount }
          : s
      );
      const updatedPeriods = [...periods, newPeriod];
      commitHui({
        ...currentHui,
        slots: updatedSlots,
        periods: updatedPeriods,
        status: updatedSlots.every((s) => s.isDead) ? 'COMPLETED' : 'ACTIVE',
      });
      setViewPeriodIdx(null);
      setIsKhuiDialogOpen(false);
      toast({ body: `Đã khui kỳ ${newPeriod.periodNumber}: ${newPeriod.winnerName} lụm`, type: 'info' });
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    } catch (e: unknown) {
      toast({ body: 'Lỗi: ' + (e instanceof Error ? e.message : 'không xác định'), type: 'error' });
    }
  };

  const handleTogglePayment = (periodIndex: number, slotId: string) => {
    if (!periods[periodIndex]) return;
    commitHui({
      ...currentHui,
      periods: periods.map((period, idx) => {
        if (idx !== periodIndex) return period;
        const payments = period.payments.map((p) =>
          p.slotId === slotId
            ? { ...p, isPaid: !p.isPaid, paidAt: !p.isPaid ? todayIso() : undefined }
            : p
        );
        // Thu đủ tất cả thì tự chuyển kỳ sang hoàn tất (giữ hành vi cũ)
        const allPaid = payments.every((p) => p.isPaid);
        return { ...period, payments, isCompleted: allPaid ? true : period.isCompleted };
      }),
    });
  };

  const applyPayoutUpdate = (periodIndex: number, isCompleted: boolean, markAllPaid: boolean) => {
    commitHui({
      ...currentHui,
      periods: periods.map((period, idx) =>
        idx !== periodIndex
          ? period
          : {
              ...period,
              isCompleted,
              payments: markAllPaid
                ? period.payments.map((p) => ({ ...p, isPaid: true, paidAt: p.paidAt || todayIso() }))
                : period.payments,
            }
      ),
    });
    toast({
      body: isCompleted ? 'Đã ghi nhận giao tiền cho người lụm' : 'Đã hủy trạng thái giao tiền',
      type: 'info',
    });
  };

  const handleToggleWinnerPayout = (periodIndex: number) => {
    const target = periods[periodIndex];
    if (!target) return;
    if (target.isCompleted) {
      applyPayoutUpdate(periodIndex, false, false);
      return;
    }
    const unpaid = target.payments.filter((p) => !p.isPaid);
    if (unpaid.length > 0) {
      setPendingPayoutIndex(periodIndex);
      setUnpaidSummary({ count: unpaid.length, names: unpaid.map((p) => p.memberName).join(', ') });
      setIsPayoutConfirmOpen(true);
      return;
    }
    applyPayoutUpdate(periodIndex, true, false);
  };

  const applyRevertLastPeriod = () => {
    if (!latestPeriod) return;
    commitHui({
      ...currentHui,
      periods: periods.slice(0, -1),
      slots: currentHui.slots.map((s) =>
        s.id === latestPeriod.winnerSlotId
          ? { ...s, isDead: false, wonPeriod: undefined, bidAmount: undefined }
          : s
      ),
      status: 'ACTIVE',
    });
    setViewPeriodIdx(null);
    setIsRevertConfirmOpen(false);
    toast({
      body: `Đã hoàn tác kỳ ${latestPeriod.periodNumber}. ${latestPeriod.winnerName} trở lại chân sống.`,
      type: 'info',
    });
  };

  const handleDeleteCurrentHui = async () => {
    setIsDeletingHui(true);
    const idToDelete = currentHui.id;
    const remaining = huiGroups.filter((h) => h.id !== idToDelete);
    try {
      await softDeleteHuiGroupFromCloud(idToDelete);
    } finally {
      setSelectedHuiId(remaining[0]?.id || '');
      onUpdateHuiGroups(remaining);
      setIsDeletingHui(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const applyStartMonth = () => {
    commitHui({ ...currentHui, startMonth: pendingStartMonth });
    setIsStartMonthDialogOpen(false);
    toast({ body: `Đã đổi tháng bắt đầu sang tháng ${pendingStartMonth}`, type: 'info' });
  };

  // QR
  const openQr = (slotId: string, memberName: string, url: string | undefined, upload: boolean) => {
    setSelectedQrUrl(url || '');
    setSelectedQrName(memberName);
    setTargetUploadSlotId(slotId);
    setQrUploadError('');
    setIsQrUploadMode(upload || !url);
    setIsQrModalOpen(true);
  };

  const updateQrForSlot = (slotId: string, url: string | undefined) => {
    commitHui({
      ...currentHui,
      slots: currentHui.slots.map((s) => {
        if (s.id !== slotId) return s;
        const next: HuiSlot = { ...s, qrCodeUrl: url };
        if (!url) delete next.qrCodeUrl;
        return next;
      }),
      periods: periods.map((p) => {
        if (p.winnerSlotId !== slotId) return p;
        const next: HuiPeriod = { ...p, winnerQrCode: url };
        if (!url) delete next.winnerQrCode;
        return next;
      }),
    });
  };

  const handleSaveQrCode = (url: string) => {
    updateQrForSlot(targetUploadSlotId, url);
    setSelectedQrUrl(url);
    setIsQrUploadMode(false);
  };

  const applyRemoveQrCode = () => {
    updateQrForSlot(targetUploadSlotId, undefined);
    setSelectedQrUrl('');
    setIsQrUploadMode(true);
    setIsRemoveQrConfirmOpen(false);
    toast({ body: `Đã xóa mã QR của ${selectedQrName}`, type: 'info' });
  };

  const handleQrFile = async (file: File | File[] | null) => {
    const selectedFile = Array.isArray(file) ? file[0] : file;
    if (!selectedFile) return;
    setQrUploadError('');
    setIsUploadingQr(true);
    try {
      // 1. Kiểm tra chữ ký nhị phân và vẽ lại ảnh qua canvas
      const validation = await sanitizeAndValidateImage(selectedFile);
      if (!validation.success || !validation.blob) {
        setQrUploadError(validation.error || 'Tệp không phải là hình ảnh hợp lệ.');
        return;
      }
      // 2. Tải lên Supabase Storage; nếu không được thì lưu base64 đã làm sạch
      const fileName = `${currentHui.id}/${targetUploadSlotId}_${Date.now()}.webp`;
      const publicUrl = await uploadQrCodeToStorage(validation.blob, fileName);
      if (publicUrl) {
        handleSaveQrCode(publicUrl);
      } else {
        const reader = new FileReader();
        reader.onload = () => handleSaveQrCode(reader.result as string);
        reader.readAsDataURL(validation.blob);
      }
    } catch (e) {
      console.warn('Lỗi tải mã QR:', e);
      setQrUploadError('Có lỗi khi kiểm tra và tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setIsUploadingQr(false);
    }
  };

  // Bảng điểm danh
  const paymentColumns: TableColumn<HuiPeriodPayment>[] = [
    {
      key: 'memberName',
      header: 'Thành viên',
      width: proportional(1.4, { minWidth: 104 }),
      renderCell: (p) => (
        <VStack gap={0}>
          <Text weight="semibold" maxLines={1}>{p.memberName}</Text>
          {isCompact && (
            <Text weight="semibold" hasTabularNumbers>{formatCurrency(p.amountToPay)}</Text>
          )}
          <Text type="supporting" color="secondary">Chân #{p.slotNumber}</Text>
        </VStack>
      ),
    },
    ...(isCompact ? [] : [{
      key: 'amountToPay',
      header: 'Phải đóng',
      align: 'end',
      width: proportional(1, { minWidth: 100 }),
      renderCell: (p: HuiPeriodPayment) => (
        <Text weight="semibold" hasTabularNumbers>{formatCurrency(p.amountToPay)}</Text>
      ),
    }] as TableColumn<HuiPeriodPayment>[]),
    {
      key: 'status',
      header: 'Trạng thái',
      align: 'end',
      width: pixel(isCompact ? 156 : 132),
      renderCell: (p) =>
        p.isPaid ? (
          <HStack gap={1} vAlign="center" hAlign="end" wrap="nowrap">
            <Badge label="Đã đóng" variant="green" />
            <IconButton
              label={`Hoàn tác đã đóng của ${p.memberName}`}
              tooltip="Hoàn tác"
              icon={<Icon icon={RotateCcw} />}
              size={rowCtl}
              variant="ghost"
              onClick={() => handleTogglePayment(activeIdx, p.slotId)}
            />
          </HStack>
        ) : (
          <Button
            label="Đã thu"
            variant="primary"
            size={rowCtl}
            icon={<Icon icon={CheckIcon} />}
            onClick={() => handleTogglePayment(activeIdx, p.slotId)}
          />
        ),
    },
  ];

  // Bảng thành viên
  const n = currentHui.totalSlots;
  const slotColumns: TableColumn<SlotStatistic>[] = [
    {
      key: 'memberName',
      header: 'Thành viên',
      width: pixel(136),
      renderCell: (s) => (
        <VStack gap={0}>
          <Text weight="semibold" maxLines={1}>#{s.slotNumber} {s.memberName}</Text>
          <Text type="supporting" color="secondary">
            {s.isDead ? `Đã lụm kỳ ${s.wonPeriod}` : 'Chân sống'}
          </Text>
        </VStack>
      ),
    },
    {
      key: 'status',
      header: 'Tình trạng',
      width: pixel(140),
      renderCell: (s) =>
        s.isDead ? (
          <Badge label={`Lụm kỳ ${s.wonPeriod ?? ''}`} variant="neutral" />
        ) : (
          <Button
            label="Cho lụm"
            variant="secondary"
            size={rowCtl}
            icon={<Icon icon={CalendarPlus} />}
            onClick={() => openKhuiDialog(s.slotId)}
          />
        ),
    },
    {
      key: 'totalPaid',
      header: 'Đã đóng',
      align: 'end',
      width: pixel(120),
      renderCell: (s) => <Text hasTabularNumbers>{formatCurrency(s.totalPaid)}</Text>,
    },
    {
      key: 'totalReceived',
      header: 'Đã nhận',
      align: 'end',
      width: pixel(120),
      renderCell: (s) =>
        s.totalReceived > 0 ? (
          <Text weight="semibold" hasTabularNumbers>{formatCurrency(s.totalReceived)}</Text>
        ) : (
          <Text color="secondary">—</Text>
        ),
    },
    {
      key: 'netProfit',
      header: 'Dòng tiền hiện tại',
      align: 'end',
      width: pixel(160),
      renderCell: (s) => (
        <Text weight="semibold" hasTabularNumbers color={s.netProfit < 0 ? 'secondary' : 'primary'}>
          {signedCurrency(s.netProfit)}
        </Text>
      ),
    },
    {
      key: 'projected',
      header: 'Lãi/lỗ cả dây',
      align: 'end',
      width: pixel(136),
      renderCell: (s) =>
        s.isDead && s.wonPeriod && isProgressive ? (
          <ProfitBadge value={projectedNetProfit(s.wonPeriod, n, step)} />
        ) : (
          <Text color="secondary">{s.isDead ? '—' : 'Chưa lụm'}</Text>
        ),
    },
    {
      key: 'qrCode',
      header: 'Mã QR',
      width: pixel(124),
      renderCell: (s) => {
        const slot = currentHui.slots.find((x) => x.id === s.slotId);
        const url = slot?.qrCodeUrl;
        return url ? (
          <Button
            label="Xem QR"
            variant="secondary"
            size={rowCtl}
            icon={<Icon icon={QrCodeIcon} />}
            onClick={() => openQr(s.slotId, s.memberName, url, false)}
          />
        ) : (
          <Button
            label="Tải QR"
            variant="ghost"
            size={rowCtl}
            icon={<Icon icon={ArrowUpTrayIcon} />}
            onClick={() => openQr(s.slotId, s.memberName, undefined, true)}
          />
        );
      },
    },
  ];

  const huiOptions = huiGroups.map((h) => ({
    value: h.id,
    label: h.name,
    description: `${formatCurrency(h.amountPerSlot)}/chân · ${h.totalSlots} chân`,
  }));
  const winnerOptions = livingSlots.map((s) => ({
    value: s.id,
    label: `#${s.slotNumber} ${s.memberName}`,
  }));
  const periodOptions = periods.map((p, idx) => ({
    value: String(idx),
    label: `Kỳ ${p.periodNumber} · ${p.winnerName}`,
    description: formatDateVi(p.openDate),
  }));

  const paidCount = activePeriod?.payments.filter((p) => p.isPaid).length ?? 0;
  const totalCount = activePeriod?.payments.length ?? 0;
  const paidAmount = activePeriod?.payments.filter((p) => p.isPaid).reduce((s, p) => s + p.amountToPay, 0) ?? 0;
  const activeWinnerSlot = activePeriod
    ? currentHui.slots.find((s) => s.id === activePeriod.winnerSlotId)
    : undefined;
  const activeWinnerQr = activePeriod?.winnerQrCode || activeWinnerSlot?.qrCodeUrl;

  const kpis = [
    { label: 'Tiền góp mỗi chân', value: formatCurrency(currentHui.amountPerSlot), hint: `Lãi tăng ${formatCurrency(step)}/kỳ` },
    { label: 'Số chân', value: `${n} chân`, hint: `${CYCLE_LABELS[currentHui.cycle]} · từ tháng ${currentHui.startMonth || 4}` },
    { label: 'Đã khui', value: `${periods.length}/${n} kỳ`, progress: true },
    { label: 'Chân sống', value: `${livingSlots.length} chân`, hint: livingSlots.length > 0 ? 'Chưa lụm' : 'Dây đã mãn' },
  ];

  return (
    <VStack gap={isCompact ? 4 : 6}>
      {/* Thanh chọn dây hụi và thao tác */}
      <Card>
        <HStack hAlign="between" vAlign="end" wrap="wrap" gap={3}>
          <StackItem size={isCompact ? 'fill' : 'static'}>
            <Selector
              label="Dây hụi"
              size={ctl}
              value={currentHui.id}
              options={huiOptions}
              onChange={(id) => {
                setSelectedHuiId(id);
                setViewPeriodIdx(null);
              }}
              width={isCompact ? '100%' : 280}
            />
          </StackItem>

          <HStack gap={2} vAlign="center" wrap="nowrap">
            {livingSlots.length > 0 ? (
              <Button
                label="Khui kỳ mới"
                size={ctl}
                variant="primary"
                icon={<Icon icon={CalendarPlus} />}
                onClick={() => openKhuiDialog()}
              />
            ) : (
              <Badge label="Dây đã mãn" variant="neutral" />
            )}
            <Button
              label="Thêm dây"
              size={ctl}
              variant="secondary"
              isIconOnly={isCompact}
              icon={<Icon icon={Plus} />}
              onClick={() => setIsCreateDialogOpen(true)}
            />
            <MoreMenu
              label="Thao tác khác với dây hụi"
              size={ctl}
              variant="secondary"
              alignment="end"
              presentation="adaptive"
              items={[
                {
                  label: 'Đổi tháng bắt đầu',
                  icon: <Icon icon={CalendarCog} />,
                  onClick: () => {
                    setPendingStartMonth(currentHui.startMonth || 4);
                    setIsStartMonthDialogOpen(true);
                  },
                },
                { type: 'divider' },
                {
                  label: 'Xóa dây hụi',
                  icon: <Icon icon={Trash2} />,
                  variant: 'destructive',
                  onClick: () => setIsDeleteDialogOpen(true),
                },
              ]}
            />
          </HStack>
        </HStack>
      </Card>

      {/* 4 chỉ số của dây */}
      <Grid columns={{ minWidth: isCompact ? 150 : 200, repeat: 'fit' }} gap={isCompact ? 3 : 4}>
        {kpis.map((k) => (
          <Card key={k.label}>
            <VStack gap={2}>
              <Text type="supporting" color="secondary" maxLines={1}>{k.label}</Text>
              <Text size={isCompact ? 'lg' : 'xl'} weight="bold" hasTabularNumbers maxLines={1}>
                {k.value}
              </Text>
              {k.progress ? (
                <ProgressBar
                  label="Tiến độ khui hụi"
                  isLabelHidden
                  value={periods.length}
                  max={n || 1}
                  variant={periods.length === n ? 'success' : 'accent'}
                />
              ) : (
                <Text type="supporting" color="secondary">{k.hint}</Text>
              )}
            </VStack>
          </Card>
        ))}
      </Grid>

      {/* Điểm danh thu tiền */}
      {activePeriod && (
        <Card>
          <VStack gap={4}>
            <HStack hAlign="between" vAlign="start" wrap="wrap" gap={3}>
              <VStack gap={1.5}>
                <HStack gap={2} vAlign="center" wrap="wrap">
                  <Heading level={2}>Điểm danh kỳ {activePeriod.periodNumber}</Heading>
                  {activePeriod.isCompleted ? (
                    <Badge label="Đã giao tiền" variant="green" />
                  ) : (
                    <Badge label="Chờ giao tiền" variant="orange" />
                  )}
                </HStack>
                <Text type="supporting" color="secondary">
                  {formatDateVi(activePeriod.openDate)} · {activePeriod.winnerName} lụm{' '}
                  <Text type="supporting" weight="semibold" hasTabularNumbers>
                    {formatCurrency(activePeriod.actualReceived)}
                  </Text>
                </Text>
              </VStack>

              {periods.length > 1 && (
                <Selector
                  label="Xem kỳ"
                  size={ctl}
                  isLabelHidden
                  value={String(activeIdx)}
                  options={periodOptions}
                  onChange={(v) => setViewPeriodIdx(parseInt(v, 10))}
                  width={isCompact ? '100%' : 220}
                />
              )}
            </HStack>

            <VStack gap={1.5}>
              <HStack hAlign="between" vAlign="center" gap={2}>
                <Text type="supporting">
                  Đã thu {paidCount}/{totalCount} người
                </Text>
                <Text type="supporting" hasTabularNumbers>
                  {formatCurrency(paidAmount)} / {formatCurrency(activePeriod.totalCollected)}
                </Text>
              </HStack>
              <ProgressBar
                label="Tiến độ thu tiền"
                isLabelHidden
                value={paidCount}
                max={totalCount || 1}
                variant={paidCount === totalCount ? 'success' : 'accent'}
              />
            </VStack>

            <Table<HuiPeriodPayment>
              data={activePeriod.payments}
              columns={paymentColumns}
              idKey="slotId"
              density="compact"
              dividers="rows"
              hasHover
            />

            <HStack gap={2} vAlign="center" wrap="wrap" hAlign="end">
              {isViewingLatest && (
                <Button
                  label="Hoàn tác kỳ này"
                  size={ctl}
                  variant="ghost"
                  icon={<Icon icon={RotateCcw} />}
                  onClick={() => setIsRevertConfirmOpen(true)}
                />
              )}
              <Button
                label={activeWinnerQr ? `QR của ${activePeriod.winnerName}` : 'Tải QR người lụm'}
                size={ctl}
                variant="secondary"
                icon={<Icon icon={activeWinnerQr ? QrCodeIcon : ArrowUpTrayIcon} />}
                onClick={() =>
                  openQr(activePeriod.winnerSlotId, activePeriod.winnerName, activeWinnerQr, false)
                }
              />
              <Button
                label={activePeriod.isCompleted ? 'Hủy đã giao tiền' : 'Xác nhận đã giao tiền'}
                size={ctl}
                variant={activePeriod.isCompleted ? 'secondary' : 'primary'}
                icon={<Icon icon={CheckIcon} />}
                onClick={() => handleToggleWinnerPayout(activeIdx)}
              />
            </HStack>
          </VStack>
        </Card>
      )}

      {/* Ma trận lũy tiến */}
      {huiMatrix && (
        <HuiMatrixTable
          matrix={huiMatrix}
          title="Ma trận đóng hụi"
          subtitle={`Dự kiến theo thứ tự lụm, bắt đầu tháng ${currentHui.startMonth || 4}`}
        />
      )}

      {/* Danh sách thành viên */}
      <Card>
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={2}>Thành viên</Heading>
            <Text type="supporting" color="secondary">
              Dòng tiền hiện tại = đã nhận − đã đóng tính đến hôm nay. Lãi/lỗ cả dây là kết quả cuối cùng khi dây mãn.
            </Text>
          </VStack>
          <Table<SlotStatistic>
            data={slotStats}
            columns={slotColumns}
            idKey="slotId"
            density="compact"
            dividers="rows"
            hasHover
            plugins={{ sticky: slotStickyPlugin }}
          />
        </VStack>
      </Card>

      {/* DIALOG KHUI KỲ MỚI */}
      <FormDialog isOpen={isKhuiDialogOpen} onOpenChange={setIsKhuiDialogOpen} width={480} purpose="form"
        header={
          <DialogHeader
            title={`Khui kỳ ${periods.length + 1}/${n}`}
            subtitle={currentHui.name}
            onOpenChange={setIsKhuiDialogOpen}
          />
        }
        footer={
          <HStack hAlign="end" gap={2}>
            <Button label="Hủy" variant="ghost" onClick={() => setIsKhuiDialogOpen(false)} />
            <Button
              label="Xác nhận khui"
              variant="primary"
              icon={<Icon icon={CheckIcon} />}
              onClick={handleConfirmKhuiHui}
            />
          </HStack>
        }
      >
        <Selector
          label="Người lụm kỳ này"
          value={winnerSlotId}
          options={winnerOptions}
          onChange={setWinnerSlotId}
          width="100%"
        />
        <DateInput
          label="Ngày khui"
          value={(khuiDateStr as ISODateString) || undefined}
          onChange={(val) => {
            if (val) setKhuiDateStr(val);
          }}
          presentation="popover"
          width="100%"
        />
        {!isProgressive && (
          <MoneyInput
            label="Mức thăm (tiền kêu)"
            value={bidAmount}
            onChange={setBidAmount}
            description="Chân sống được trừ số này vào tiền đóng kỳ này"
          />
        )}

        {khuiPreview && (
          <Card variant="muted" padding={3}>
            <HStack hAlign="between" vAlign="center" gap={3} wrap="wrap">
              <VStack gap={0.5}>
                <Text type="supporting" color="secondary">Người lụm nhận</Text>
                <Text size="xl" weight="bold" hasTabularNumbers>
                  {formatCurrency(khuiPreview.actualReceived)}
                </Text>
              </VStack>
              <Text type="supporting" color="secondary">
                Từ {khuiPreview.payments.length} người đóng
              </Text>
            </HStack>
          </Card>
        )}

      </FormDialog>

      {renderCreateDialog()}

      {/* DIALOG ĐỔI THÁNG BẮT ĐẦU */}
      <FormDialog isOpen={isStartMonthDialogOpen} onOpenChange={setIsStartMonthDialogOpen} width={420} purpose="form"
        header={
          <DialogHeader
            title="Đổi tháng bắt đầu"
            subtitle={currentHui.name}
            onOpenChange={setIsStartMonthDialogOpen}
          />
        }
        footer={
          <HStack hAlign="end" gap={2}>
            <Button label="Hủy" variant="ghost" onClick={() => setIsStartMonthDialogOpen(false)} />
            <Button label="Lưu" variant="primary" onClick={applyStartMonth} />
          </HStack>
        }
      >
        <Selector
          label="Tháng bắt đầu"
          value={String(pendingStartMonth)}
          options={MONTH_OPTIONS}
          onChange={(v) => setPendingStartMonth(parseInt(v, 10))}
          width="100%"
        />
        <Text type="supporting" color="secondary">
          Chỉ đổi nhãn tháng trong ma trận. Các kỳ đã khui và tiền đã đóng giữ nguyên.
        </Text>
      </FormDialog>

      {/* DIALOG MÃ QR */}
      <FormDialog isOpen={isQrModalOpen} onOpenChange={setIsQrModalOpen} width={440} purpose="form"
        header={
          <DialogHeader
            title={`Mã QR của ${selectedQrName}`}
            subtitle="Quét bằng app ngân hàng hoặc MoMo để chuyển tiền"
            onOpenChange={setIsQrModalOpen}
          />
        }
        footer={
          <HStack gap={2} hAlign="between" width="100%" wrap="wrap">
            {selectedQrUrl ? (
              <Button
                label="Xóa QR"
                variant="ghost"
                icon={<Icon icon={Trash2} />}
                onClick={() => setIsRemoveQrConfirmOpen(true)}
              />
            ) : (
              <HStack />
            )}
            <HStack gap={2}>
              {selectedQrUrl && (
                <Button
                  label={isQrUploadMode ? 'Xem QR hiện tại' : 'Đổi ảnh khác'}
                  variant="secondary"
                  icon={isQrUploadMode ? undefined : <Icon icon={ArrowUpTrayIcon} />}
                  onClick={() => {
                    setQrUploadError('');
                    setIsQrUploadMode(!isQrUploadMode);
                  }}
                />
              )}
              <Button label="Đóng" variant="primary" onClick={() => setIsQrModalOpen(false)} />
            </HStack>
          </HStack>
        }
      >
        {isQrUploadMode ? (
          <VStack gap={3} width="100%">
            {qrUploadError && <Banner status="error" title={qrUploadError} />}
            <FileInput
              label={`Ảnh mã QR của ${selectedQrName}`}
              description="JPG, PNG hoặc WEBP, tối đa 5MB. Ảnh được kiểm tra và làm sạch trước khi lưu."
              mode="dropzone"
              accept="image/png,image/jpeg,image/webp"
              value={null}
              isDisabled={isUploadingQr}
              onChange={handleQrFile}
            />
            {isUploadingQr && (
              <Text type="supporting" color="secondary">Đang kiểm tra và tải ảnh lên…</Text>
            )}
          </VStack>
        ) : (
          <VStack gap={3} hAlign="center">
            <Avatar
              src={selectedQrUrl}
              size={180}
              shape="rounded"
              name={selectedQrName}
              alt={`Mã QR ${selectedQrName}`}
              tooltip={false}
            />
            <Text type="supporting" color="secondary">
              Kiểm tra đúng tên người nhận {selectedQrName} trước khi chuyển tiền.
            </Text>
          </VStack>
        )}

        <Divider />

      </FormDialog>

      {/* XÁC NHẬN XÓA DÂY */}
      <AlertDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={(open) => !isDeletingHui && setIsDeleteDialogOpen(open)}
        title={`Xóa dây "${currentHui.name}"?`}
        description="Toàn bộ các kỳ đã khui và lịch sử đóng tiền của dây này sẽ bị xóa khỏi ứng dụng và Supabase."
        actionLabel={isDeletingHui ? 'Đang xóa…' : 'Xóa dây hụi'}
        cancelLabel="Giữ lại"
        actionVariant="destructive"
        width={460}
        onAction={handleDeleteCurrentHui}
      />

      <AlertDialog
        isOpen={isPayoutConfirmOpen}
        onOpenChange={setIsPayoutConfirmOpen}
        title="Còn người chưa đóng tiền"
        description={`${unpaidSummary.count} người chưa đóng (${unpaidSummary.names}). Đánh dấu tất cả đã đóng và xác nhận đã giao tiền cho người lụm?`}
        actionLabel="Đánh dấu đã thu & giao tiền"
        cancelLabel="Để sau"
        actionVariant="primary"
        width={480}
        onAction={() => {
          if (pendingPayoutIndex !== null) applyPayoutUpdate(pendingPayoutIndex, true, true);
          setIsPayoutConfirmOpen(false);
        }}
      />

      <AlertDialog
        isOpen={isRevertConfirmOpen}
        onOpenChange={setIsRevertConfirmOpen}
        title={`Hoàn tác kỳ ${latestPeriod?.periodNumber ?? ''}?`}
        description={`${latestPeriod?.winnerName ?? ''} sẽ trở lại chân sống và bảng điểm danh của kỳ này bị xóa.`}
        actionLabel="Hoàn tác kỳ này"
        cancelLabel="Giữ nguyên"
        actionVariant="destructive"
        width={460}
        onAction={applyRevertLastPeriod}
      />

      <AlertDialog
        isOpen={isRemoveQrConfirmOpen}
        onOpenChange={setIsRemoveQrConfirmOpen}
        title="Xóa mã QR?"
        description={`Xóa ảnh mã QR của ${selectedQrName}. Bạn có thể tải ảnh mới bất kỳ lúc nào.`}
        actionLabel="Xóa QR"
        cancelLabel="Hủy"
        actionVariant="destructive"
        width={440}
        onAction={applyRemoveQrCode}
      />
    </VStack>
  );
}
