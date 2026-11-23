'use client';

import React, { useMemo, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { StackItem } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Badge } from '@astryxdesign/core/Badge';
import { Grid, GridSpan } from '@astryxdesign/core/Grid';
import { TextInput } from '@astryxdesign/core/TextInput';
import { DateInput } from '@astryxdesign/core/DateInput';
import type { ISODateString } from '@astryxdesign/core/Calendar';
import { Selector } from '@astryxdesign/core/Selector';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { CheckboxList, CheckboxListItem } from '@astryxdesign/core/CheckboxList';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useToast } from '@astryxdesign/core/Toast';
import { Table, TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import { Icon } from '@astryxdesign/core/Icon';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import {
  Plus,
  Pencil,
  Trash2,
  Receipt,
  Copy,
  Check,
  RotateCcw,
  ArrowRight,
  UsersRound,
} from 'lucide-react';
import { SplitEvent, SplitExpense, SplitMode } from '@/types';
import { formatCurrency } from '@/lib/huiCalculator';
import { formatDateVi } from '@/lib/format';
import {
  computeBalances,
  computeTransfers,
  eventTotal,
  MemberBalance,
  Transfer,
} from '@/lib/splitCalculator';
import { MoneyInput } from '@/components/MoneyInput';
import { MemberOrderEditor } from '@/components/MemberOrderEditor';
import { softDeleteSplitEventFromCloud } from '@/lib/supabaseClient';

const todayIso = () => new Date().toISOString().split('T')[0];
const newId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

interface SplitTabProps {
  events: SplitEvent[];
  onUpdateEvents: (events: SplitEvent[]) => void;
}

// Tin nhắn gửi nhóm Zalo: các khoản chi và ai chuyển cho ai
function buildSplitMessage(event: SplitEvent, transfers: Transfer[]): string {
  const total = eventTotal(event);
  const lines: string[] = [];
  lines.push(`💸 CHIA TIỀN: ${event.name.toUpperCase()}`);
  lines.push(
    `${formatDateVi(event.date)} · ${event.members.length} người · tổng ${formatCurrency(total)}`
  );
  lines.push('');
  lines.push('🧾 Các khoản chi:');
  event.expenses.forEach((e) => {
    const who = e.participants.length === event.members.length ? 'cả nhóm' : e.participants.join(', ');
    lines.push(`• ${e.title}: ${formatCurrency(e.amount)} (${e.paidBy} trả, chia ${who})`);
  });
  lines.push('');
  if (transfers.length === 0) {
    lines.push('✅ Mọi người đã cân bằng, không ai cần chuyển thêm.');
  } else {
    lines.push('💰 Chuyển tiền:');
    transfers.forEach((t) => {
      const done = event.paidTransfers.includes(t.key);
      lines.push(`${done ? '✅' : '⏳'} ${t.from} → ${t.to}: ${formatCurrency(t.amount)}`);
    });
  }
  return lines.join('\n');
}

export function SplitTab({ events, onUpdateEvents }: SplitTabProps) {
  const toast = useToast();
  const isCompact = useMediaQuery('(max-width: 640px)');
  const [selectedId, setSelectedId] = useState<string>(events[0]?.id || '');

  // Dialog chuyến đi (tạo mới hoặc sửa)
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState<string>(todayIso());
  const [eventMembers, setEventMembers] = useState<string[]>([]);

  // Dialog khoản chi
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState(0);
  const [expPaidBy, setExpPaidBy] = useState('');
  const [expParticipants, setExpParticipants] = useState<string[]>([]);
  const [expMode, setExpMode] = useState<SplitMode>('EQUAL');
  const [expCustom, setExpCustom] = useState<Record<string, number>>({});

  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [isDeleteEventOpen, setIsDeleteEventOpen] = useState(false);

  // Chuyến đang xem bị xóa (hoặc dữ liệu Cloud đổi) thì rơi về chuyến đầu tiên
  const current = events.find((e) => e.id === selectedId) || events[0];

  const balances = useMemo(() => (current ? computeBalances(current) : []), [current]);
  const transfers = useMemo(() => computeTransfers(balances), [balances]);

  const commitEvent = (updated: SplitEvent) => {
    onUpdateEvents(events.map((e) => (e.id === updated.id ? updated : e)));
  };

  // ---------- Chuyến đi ----------
  const openCreateEvent = () => {
    setEditingEventId(null);
    setEventName('');
    setEventDate(todayIso());
    setEventMembers([]);
    setIsEventDialogOpen(true);
  };

  const openEditEvent = () => {
    if (!current) return;
    setEditingEventId(current.id);
    setEventName(current.name);
    setEventDate(current.date);
    setEventMembers(current.members);
    setIsEventDialogOpen(true);
  };

  const saveEvent = () => {
    const name = eventName.trim();
    if (!name) {
      toast({ body: 'Vui lòng đặt tên cho chuyến đi', type: 'error' });
      return;
    }
    if (eventMembers.length < 2) {
      toast({ body: 'Cần ít nhất 2 người để chia tiền', type: 'error' });
      return;
    }
    if (editingEventId && current) {
      commitEvent({ ...current, name, date: eventDate, members: eventMembers });
      toast({ body: 'Đã lưu thay đổi', type: 'info' });
    } else {
      const created: SplitEvent = {
        id: newId('split'),
        name,
        date: eventDate,
        members: eventMembers,
        expenses: [],
        paidTransfers: [],
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };
      onUpdateEvents([created, ...events]);
      setSelectedId(created.id);
      toast({ body: `Đã tạo "${name}"`, type: 'info' });
    }
    setIsEventDialogOpen(false);
  };

  // Không cho xóa người đã có tên trong một khoản chi
  const memberRemoveBlockReason = (name: string): string | null => {
    if (!editingEventId || !current) return null;
    const used = current.expenses.some((e) => e.paidBy === name || e.participants.includes(name));
    return used ? `${name} đã có trong khoản chi, hãy sửa các khoản đó trước` : null;
  };

  const deleteEvent = async () => {
    if (!current) return;
    const id = current.id;
    const remaining = events.filter((e) => e.id !== id);
    setSelectedId(remaining[0]?.id || '');
    onUpdateEvents(remaining);
    setIsDeleteEventOpen(false);
    await softDeleteSplitEventFromCloud(id);
  };

  // ---------- Khoản chi ----------
  const openAddExpense = () => {
    if (!current) return;
    setEditingExpenseId(null);
    setExpTitle('');
    setExpAmount(0);
    setExpPaidBy(current.members[0] || '');
    setExpParticipants(current.members);
    setExpMode('EQUAL');
    setExpCustom({});
    setIsExpenseDialogOpen(true);
  };

  const openEditExpense = (expense: SplitExpense) => {
    setEditingExpenseId(expense.id);
    setExpTitle(expense.title);
    setExpAmount(expense.amount);
    setExpPaidBy(expense.paidBy);
    setExpParticipants(expense.participants);
    setExpMode(expense.splitMode);
    setExpCustom(expense.customShares || {});
    setIsExpenseDialogOpen(true);
  };

  const customSum = expParticipants.reduce((s, n) => s + (expCustom[n] || 0), 0);
  const customLeft = expAmount - customSum;
  const equalShare =
    expParticipants.length > 0 ? Math.floor(expAmount / expParticipants.length) : 0;

  const saveExpense = () => {
    if (!current) return;
    if (expAmount <= 0) {
      toast({ body: 'Vui lòng nhập số tiền', type: 'error' });
      return;
    }
    if (!expPaidBy) {
      toast({ body: 'Vui lòng chọn người trả', type: 'error' });
      return;
    }
    if (expParticipants.length === 0) {
      toast({ body: 'Chọn ít nhất 1 người cùng chịu khoản này', type: 'error' });
      return;
    }
    if (expMode === 'CUSTOM' && customLeft !== 0) {
      toast({
        body:
          customLeft > 0
            ? `Còn ${formatCurrency(customLeft)} chưa chia cho ai`
            : `Đang chia dư ${formatCurrency(-customLeft)}`,
        type: 'error',
      });
      return;
    }

    const customShares =
      expMode === 'CUSTOM'
        ? Object.fromEntries(expParticipants.map((n) => [n, expCustom[n] || 0]))
        : undefined;
    const base = {
      title: expTitle.trim() || 'Khoản chi',
      amount: expAmount,
      paidBy: expPaidBy,
      participants: current.members.filter((m) => expParticipants.includes(m)),
      splitMode: expMode,
      customShares,
    };

    const expenses = editingExpenseId
      ? current.expenses.map((e) => (e.id === editingExpenseId ? { ...e, ...base } : e))
      : [...current.expenses, { id: newId('exp'), createdAt: new Date().toISOString(), ...base }];

    commitEvent({ ...current, expenses });
    setIsExpenseDialogOpen(false);
  };

  const deleteExpense = () => {
    if (!current || !deleteExpenseId) return;
    commitEvent({ ...current, expenses: current.expenses.filter((e) => e.id !== deleteExpenseId) });
    setDeleteExpenseId(null);
  };

  // ---------- Chuyển tiền ----------
  const toggleTransfer = (t: Transfer) => {
    if (!current) return;
    const done = current.paidTransfers.includes(t.key);
    commitEvent({
      ...current,
      paidTransfers: done
        ? current.paidTransfers.filter((k) => k !== t.key)
        : [...current.paidTransfers, t.key],
    });
  };

  const copyMessage = async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(buildSplitMessage(current, transfers));
      toast({ body: 'Đã sao chép, dán vào nhóm Zalo nhé', type: 'info' });
    } catch {
      toast({ body: 'Trình duyệt không cho sao chép, hãy thử lại', type: 'error' });
    }
  };

  // ---------- Dialogs dùng chung ----------
  const eventDialog = (
    <Dialog isOpen={isEventDialogOpen} onOpenChange={setIsEventDialogOpen} width={560} purpose="form">
      <DialogHeader
        title={editingEventId ? 'Sửa chuyến đi' : 'Chuyến đi mới'}
        subtitle="Một bữa ăn, một buổi đi chơi hay cả chuyến du lịch"
        onOpenChange={setIsEventDialogOpen}
      />
      <VStack gap={4} padding={4}>
        <Grid columns={{ minWidth: 200, repeat: 'fit' }} gap={3}>
          <TextInput
            label="Tên"
            value={eventName}
            onChange={setEventName}
            placeholder="Ví dụ: Đà Lạt cuối tuần"
            width="100%"
          />
          <DateInput
            label="Ngày"
            value={(eventDate as ISODateString) || undefined}
            onChange={(v) => v && setEventDate(v)}
            presentation="popover"
            width="100%"
          />
        </Grid>
        <MemberOrderEditor
          members={eventMembers}
          onChange={setEventMembers}
          minMembers={editingEventId ? 2 : 0}
          title="Thành viên"
          description="Nhập tên rồi nhấn Enter, nhiều tên cách nhau bằng dấu phẩy."
          isOrdered={false}
          allowDuplicates={false}
          getRemoveBlockReason={memberRemoveBlockReason}
        />
        <HStack hAlign="end" gap={2}>
          <Button label="Hủy" variant="ghost" onClick={() => setIsEventDialogOpen(false)} />
          <Button
            label={editingEventId ? 'Lưu' : 'Tạo chuyến'}
            variant="primary"
            icon={editingEventId ? undefined : <Icon icon={Plus} />}
            onClick={saveEvent}
          />
        </HStack>
      </VStack>
    </Dialog>
  );

  if (!current) {
    return (
      <VStack gap={4}>
        <Card padding={8}>
          <EmptyState
            icon={<Icon icon={Receipt} size="lg" />}
            title="Chưa có chuyến nào"
            description="Tạo một chuyến đi, ghi lại ai trả khoản nào, app tự tính ai cần chuyển cho ai bao nhiêu."
            actions={
              <Button
                label="Tạo chuyến đầu tiên"
                variant="primary"
                icon={<Icon icon={Plus} />}
                onClick={openCreateEvent}
              />
            }
          />
        </Card>
        {eventDialog}
      </VStack>
    );
  }

  const total = eventTotal(current);
  const perHead = current.members.length > 0 ? Math.round(total / current.members.length) : 0;
  const pendingTransfers = transfers.filter((t) => !current.paidTransfers.includes(t.key));
  const pendingAmount = pendingTransfers.reduce((s, t) => s + t.amount, 0);

  const eventOptions = events.map((e) => ({
    value: e.id,
    label: e.name,
    description: `${formatDateVi(e.date)} · ${e.members.length} người`,
  }));

  const kpis = [
    { label: 'Tổng chi', value: formatCurrency(total), hint: `${current.expenses.length} khoản` },
    { label: 'Bình quân', value: formatCurrency(perHead), hint: `${current.members.length} người` },
    {
      label: 'Còn phải chuyển',
      value: formatCurrency(pendingAmount),
      hint:
        transfers.length === 0
          ? 'Chưa có gì để chuyển'
          : `${transfers.length - pendingTransfers.length}/${transfers.length} lượt đã xong`,
    },
  ];

  // ---------- Bảng ----------
  const transferColumns: TableColumn<Transfer>[] = [
    {
      key: 'route',
      header: isCompact ? 'Chuyển' : 'Người chuyển → người nhận',
      width: proportional(2, { minWidth: 150 }),
      renderCell: (t) => (
        <VStack gap={0.5}>
          <HStack gap={2} vAlign="center" wrap="wrap">
            <Text weight="semibold">{t.from}</Text>
            <Icon icon={ArrowRight} size="sm" color="secondary" />
            <Text weight="semibold">{t.to}</Text>
          </HStack>
          {isCompact && (
            <Text type="supporting" hasTabularNumbers>
              {formatCurrency(t.amount)}
            </Text>
          )}
        </VStack>
      ),
    },
    ...(isCompact ? [] : [{
      key: 'amount',
      header: 'Số tiền',
      align: 'end',
      width: proportional(1, { minWidth: 100 }),
      renderCell: (t: Transfer) => (
        <Text weight="semibold" hasTabularNumbers>
          {formatCurrency(t.amount)}
        </Text>
      ),
    }] as TableColumn<Transfer>[]),
    {
      key: 'status',
      header: 'Trạng thái',
      align: 'end',
      width: pixel(156),
      renderCell: (t) =>
        current.paidTransfers.includes(t.key) ? (
          <HStack gap={1} vAlign="center" hAlign="end" wrap="nowrap">
            <Badge label="Đã chuyển" variant="green" />
            <IconButton
              label={`Hoàn tác ${t.from} chuyển cho ${t.to}`}
              tooltip="Hoàn tác"
              icon={<Icon icon={RotateCcw} />}
              size={isCompact ? 'md' : 'sm'}
              variant="ghost"
              onClick={() => toggleTransfer(t)}
            />
          </HStack>
        ) : (
          <Button
            label="Đã chuyển"
            variant="primary"
            size={isCompact ? 'md' : 'sm'}
            icon={<Icon icon={Check} />}
            onClick={() => toggleTransfer(t)}
          />
        ),
    },
  ];

  const expenseColumns: TableColumn<SplitExpense>[] = [
    {
      key: 'title',
      header: 'Khoản chi',
      width: proportional(2, { minWidth: 120 }),
      renderCell: (e) => (
        <VStack gap={0}>
          <Text weight="semibold" maxLines={1}>
            {e.title}
          </Text>
          {isCompact && (
            <Text weight="semibold" hasTabularNumbers>
              {formatCurrency(e.amount)}
            </Text>
          )}
          <Text type="supporting" color="secondary">
            {e.paidBy} trả ·{' '}
            {e.participants.length === current.members.length
              ? 'chia cả nhóm'
              : `chia ${e.participants.length} người`}
            {e.splitMode === 'CUSTOM' ? ' (tùy chỉnh)' : ''}
          </Text>
        </VStack>
      ),
    },
    ...(isCompact
      ? []
      : ([
          {
            key: 'amount',
            header: 'Số tiền',
            align: 'end',
            width: proportional(1, { minWidth: 96 }),
            renderCell: (e: SplitExpense) => (
              <Text weight="semibold" hasTabularNumbers>
                {formatCurrency(e.amount)}
              </Text>
            ),
          },
        ] as TableColumn<SplitExpense>[])),
    {
      key: 'actions',
      header: 'Sửa',
      align: 'end',
      width: pixel(isCompact ? 92 : 84),
      renderCell: (e) => (
        <HStack gap={0.5} hAlign="end" wrap="nowrap">
          <IconButton
            label={`Sửa ${e.title}`}
            icon={<Icon icon={Pencil} />}
            size={isCompact ? 'md' : 'sm'}
            variant="ghost"
            onClick={() => openEditExpense(e)}
          />
          <IconButton
            label={`Xóa ${e.title}`}
            icon={<Icon icon={Trash2} />}
            size={isCompact ? 'md' : 'sm'}
            variant="ghost"
            onClick={() => setDeleteExpenseId(e.id)}
          />
        </HStack>
      ),
    },
  ];

  const balanceColumns: TableColumn<MemberBalance>[] = [
    {
      key: 'name',
      header: 'Thành viên',
      width: proportional(1.2, { minWidth: 96 }),
      renderCell: (b) => (
        <Text weight="semibold" maxLines={1}>
          {b.name}
        </Text>
      ),
    },
    ...(isCompact
      ? []
      : [
          {
            key: 'paid',
            header: 'Đã trả',
            align: 'end' as const,
            width: pixel(130),
            renderCell: (b: MemberBalance) => (
              <Text hasTabularNumbers>{formatCurrency(b.paid)}</Text>
            ),
          },
          {
            key: 'owed',
            header: 'Phần của mình',
            align: 'end' as const,
            width: pixel(140),
            renderCell: (b: MemberBalance) => (
              <Text hasTabularNumbers>{formatCurrency(b.owed)}</Text>
            ),
          },
        ]),
    {
      key: 'net',
      header: 'Chênh lệch',
      align: 'end',
      width: proportional(1, { minWidth: 150 }),
      renderCell: (b) =>
        b.net > 0 ? (
          <Badge label={`Nhận lại ${formatCurrency(b.net)}`} variant="green" />
        ) : b.net < 0 ? (
          <Badge label={`Trả thêm ${formatCurrency(-b.net)}`} variant="orange" />
        ) : (
          <Text color="secondary">Đã đủ</Text>
        ),
    },
  ];

  return (
    <VStack gap={isCompact ? 4 : 6}>
      {/* Chọn chuyến và thao tác */}
      <Card>
        <HStack hAlign="between" vAlign="end" wrap="wrap" gap={3}>
          <StackItem size={isCompact ? 'fill' : 'static'}>
            <Selector
              label="Chuyến đi"
              value={current.id}
              options={eventOptions}
              onChange={setSelectedId}
              width={isCompact ? '100%' : 280}
            />
          </StackItem>
          <HStack gap={2} vAlign="center" wrap="nowrap">
            <Button
              label="Thêm khoản chi"
              variant="primary"
              icon={<Icon icon={Plus} />}
              onClick={openAddExpense}
            />
            <Button
              label="Chuyến mới"
              variant="secondary"
              isIconOnly={isCompact}
              icon={<Icon icon={Receipt} />}
              onClick={openCreateEvent}
            />
            <MoreMenu
              label="Thao tác khác với chuyến đi"
              variant="secondary"
              alignment="end"
              presentation="adaptive"
              items={[
                {
                  label: 'Sửa tên, ngày, thành viên',
                  icon: <Icon icon={UsersRound} />,
                  onClick: openEditEvent,
                },
                { type: 'divider' },
                {
                  label: 'Xóa chuyến đi',
                  icon: <Icon icon={Trash2} />,
                  variant: 'destructive',
                  onClick: () => setIsDeleteEventOpen(true),
                },
              ]}
            />
          </HStack>
        </HStack>
      </Card>

      {/* Chỉ số */}
      <Grid columns={isCompact ? 2 : 3} gap={isCompact ? 3 : 4}>
        {kpis.map((k, idx) => (
          <GridSpan key={k.label} columns={isCompact && idx === kpis.length - 1 ? 'full' : 1}>
          <Card>
            <VStack gap={2}>
              <Text type="supporting" color="secondary" maxLines={1}>
                {k.label}
              </Text>
              <Text size={isCompact ? 'lg' : 'xl'} weight="bold" hasTabularNumbers maxLines={1}>
                {k.value}
              </Text>
              <Text type="supporting" color="secondary">
                {k.hint}
              </Text>
            </VStack>
          </Card>
          </GridSpan>
        ))}
      </Grid>

      {/* Ai chuyển cho ai */}
      <Card>
        <VStack gap={4}>
          <HStack hAlign="between" vAlign="start" wrap="wrap" gap={3}>
            <VStack gap={1}>
              <Heading level={2}>Ai chuyển cho ai</Heading>
              <Text type="supporting" color="secondary">
                Đã gộp về ít lượt nhất và làm tròn đến 1.000 ₫. Bấm &quot;Đã chuyển&quot; khi nhận được tiền.
              </Text>
            </VStack>
            <Button
              label="Sao chép gửi Zalo"
              variant="secondary"
              icon={<Icon icon={Copy} />}
              onClick={copyMessage}
              isDisabled={current.expenses.length === 0}
            />
          </HStack>
          {transfers.length === 0 ? (
            <Text color="secondary">
              {current.expenses.length === 0
                ? 'Thêm khoản chi đầu tiên để bắt đầu tính.'
                : 'Mọi người đã cân bằng, không ai cần chuyển thêm.'}
            </Text>
          ) : (
            <Table<Transfer>
              data={transfers}
              columns={transferColumns}
              idKey="key"
              density="compact"
              dividers="rows"
              hasHover
            />
          )}
        </VStack>
      </Card>

      {/* Khoản chi */}
      <Card>
        <VStack gap={4}>
          <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
            <Heading level={2}>Khoản chi</Heading>
            <Text type="supporting" hasTabularNumbers>
              Tổng {formatCurrency(total)}
            </Text>
          </HStack>
          {current.expenses.length === 0 ? (
            <EmptyState
              isCompact
              icon={<Icon icon={Receipt} />}
              title="Chưa có khoản chi"
              description="Ghi lại từng khoản: ai trả, bao nhiêu, chia cho những ai."
              actions={
                <Button
                  label="Thêm khoản chi"
                  variant="primary"
                  icon={<Icon icon={Plus} />}
                  onClick={openAddExpense}
                />
              }
            />
          ) : (
            <Table<SplitExpense>
              data={current.expenses}
              columns={expenseColumns}
              idKey="id"
              density="compact"
              dividers="rows"
              hasHover
            />
          )}
        </VStack>
      </Card>

      {/* Cân đối từng người */}
      {current.expenses.length > 0 && (
        <Card>
          <VStack gap={4}>
            <VStack gap={1}>
              <Heading level={2}>Từng người</Heading>
              <Text type="supporting" color="secondary">
                Chênh lệch = đã trả − phần của mình.
              </Text>
            </VStack>
            <Table<MemberBalance>
              data={balances}
              columns={balanceColumns}
              idKey="name"
              density="compact"
              dividers="rows"
            />
          </VStack>
        </Card>
      )}

      {eventDialog}

      {/* DIALOG KHOẢN CHI */}
      <Dialog
        isOpen={isExpenseDialogOpen}
        onOpenChange={setIsExpenseDialogOpen}
        width={520}
        purpose="form"
      >
        <DialogHeader
          title={editingExpenseId ? 'Sửa khoản chi' : 'Thêm khoản chi'}
          subtitle={current.name}
          onOpenChange={setIsExpenseDialogOpen}
        />
        <VStack gap={4} padding={4}>
          <TextInput
            label="Nội dung"
            value={expTitle}
            onChange={setExpTitle}
            placeholder="Ví dụ: Lẩu tối, tiền phòng, xăng xe"
            width="100%"
          />
          <Grid columns={{ minWidth: 200, repeat: 'fit' }} gap={3}>
            <MoneyInput label="Số tiền" value={expAmount} onChange={setExpAmount} placeholder="500.000" />
            <Selector
              label="Người trả"
              value={expPaidBy}
              options={current.members.map((m) => ({ value: m, label: m }))}
              onChange={setExpPaidBy}
              width="100%"
            />
          </Grid>

          <SegmentedControl label="Cách chia" value={expMode} onChange={(v) => setExpMode(v as SplitMode)} layout="fill">
            <SegmentedControlItem value="EQUAL" label="Chia đều" />
            <SegmentedControlItem value="CUSTOM" label="Nhập số từng người" />
          </SegmentedControl>

          <CheckboxList
            label="Chia cho"
            description={
              expMode === 'EQUAL' && expParticipants.length > 0 && expAmount > 0
                ? `Mỗi người khoảng ${formatCurrency(equalShare)}`
                : undefined
            }
            value={expParticipants}
            onChange={setExpParticipants}
            density="compact"
          >
            {current.members.map((m) => (
              <CheckboxListItem key={m} value={m} label={m} />
            ))}
          </CheckboxList>

          {expMode === 'CUSTOM' && expParticipants.length > 0 && (
            <Grid columns={{ minWidth: 180, repeat: 'fit' }} gap={3}>
              {current.members
                .filter((m) => expParticipants.includes(m))
                .map((m) => (
                  <MoneyInput
                    key={m}
                    label={`Phần của ${m}`}
                    value={expCustom[m] || 0}
                    onChange={(v) => setExpCustom((prev) => ({ ...prev, [m]: v }))}
                  />
                ))}
            </Grid>
          )}

          {expMode === 'CUSTOM' && expAmount > 0 && (
            <Text type="supporting" color={customLeft === 0 ? 'secondary' : 'primary'} weight="semibold">
              {customLeft === 0
                ? 'Đã chia đủ'
                : customLeft > 0
                ? `Còn ${formatCurrency(customLeft)} chưa chia`
                : `Đang chia dư ${formatCurrency(-customLeft)}`}
            </Text>
          )}

          <HStack hAlign="end" gap={2}>
            <Button label="Hủy" variant="ghost" onClick={() => setIsExpenseDialogOpen(false)} />
            <Button
              label={editingExpenseId ? 'Lưu' : 'Thêm khoản chi'}
              variant="primary"
              onClick={saveExpense}
            />
          </HStack>
        </VStack>
      </Dialog>

      <AlertDialog
        isOpen={deleteExpenseId !== null}
        onOpenChange={(open) => !open && setDeleteExpenseId(null)}
        title="Xóa khoản chi?"
        description={`Xóa "${current.expenses.find((e) => e.id === deleteExpenseId)?.title ?? ''}". Số tiền mỗi người sẽ được tính lại.`}
        actionLabel="Xóa"
        cancelLabel="Giữ lại"
        actionVariant="destructive"
        width={420}
        onAction={deleteExpense}
      />

      <AlertDialog
        isOpen={isDeleteEventOpen}
        onOpenChange={setIsDeleteEventOpen}
        title={`Xóa "${current.name}"?`}
        description="Toàn bộ khoản chi và trạng thái chuyển tiền của chuyến này sẽ bị xóa."
        actionLabel="Xóa chuyến đi"
        cancelLabel="Giữ lại"
        actionVariant="destructive"
        width={440}
        onAction={deleteEvent}
      />
    </VStack>
  );
}
