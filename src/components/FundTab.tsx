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
import { Banner } from '@astryxdesign/core/Banner';
import { Grid } from '@astryxdesign/core/Grid';
import { TextInput } from '@astryxdesign/core/TextInput';
import { DateInput } from '@astryxdesign/core/DateInput';
import type { ISODateString } from '@astryxdesign/core/Calendar';
import { Selector } from '@astryxdesign/core/Selector';
import { CheckboxList, CheckboxListItem } from '@astryxdesign/core/CheckboxList';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { useToast } from '@astryxdesign/core/Toast';
import { Table, TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import { Icon } from '@astryxdesign/core/Icon';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import {
  Plus,
  Pencil,
  Trash2,
  PiggyBank,
  HandCoins,
  Copy,
  Check,
  RotateCcw,
  UsersRound,
  Wallet,
} from 'lucide-react';
import { FundExpense, FundRound, GroupFund } from '@/types';
import { formatCurrency } from '@/lib/huiCalculator';
import { formatDateVi } from '@/lib/format';
import { memberContributions, MemberContribution, roundCollected, summarizeFund } from '@/lib/fundCalculator';
import { MoneyInput } from '@/components/MoneyInput';
import { MemberOrderEditor } from '@/components/MemberOrderEditor';
import { softDeleteGroupFundFromCloud } from '@/lib/supabaseClient';

const todayIso = () => new Date().toISOString().split('T')[0];
const newId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const defaultRoundTitle = () => {
  const d = new Date();
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
};

interface FundTabProps {
  funds: GroupFund[];
  onUpdateFunds: (funds: GroupFund[]) => void;
}

interface RoundRow extends Record<string, unknown> {
  name: string;
  paidAt?: string;
}

// Tin nhắn nhắc đóng quỹ gửi nhóm Zalo
function buildFundMessage(fund: GroupFund, round: FundRound | undefined): string {
  const s = summarizeFund(fund);
  const lines: string[] = [];
  lines.push(`💰 ${fund.name.toUpperCase()}`);
  lines.push(`Số dư: ${formatCurrency(s.balance)} (đã thu ${formatCurrency(s.collected)}, đã chi ${formatCurrency(s.spent)})`);

  if (round) {
    const paid = round.participants.filter((m) => round.paid[m]);
    const unpaid = round.participants.filter((m) => !round.paid[m]);
    lines.push('');
    lines.push(`📌 Đợt ${round.title}: ${formatCurrency(round.amountPerMember)}/người`);
    lines.push(`✅ Đã góp (${paid.length}): ${paid.join(', ') || 'chưa có ai'}`);
    if (unpaid.length > 0) {
      lines.push(`⏳ Chưa góp (${unpaid.length}): ${unpaid.join(', ')}`);
      lines.push(
        fund.treasurer
          ? `Mọi người chuyển cho thủ quỹ ${fund.treasurer} giúp mình nhé!`
          : 'Mọi người chuyển khoản giúp mình nhé!'
      );
    } else {
      lines.push('Cả nhóm đã góp đủ, cảm ơn mọi người!');
    }
  }

  const recent = [...fund.expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  if (recent.length > 0) {
    lines.push('');
    lines.push('🧾 Chi gần đây:');
    recent.forEach((e) => lines.push(`• ${e.title}: ${formatCurrency(e.amount)} (${formatDateVi(e.date)})`));
  }
  return lines.join('\n');
}

export function FundTab({ funds, onUpdateFunds }: FundTabProps) {
  const toast = useToast();
  const isCompact = useMediaQuery('(max-width: 640px)');
  // Điện thoại: nút và ô chọn cỡ lớn cho dễ bấm
  const ctl = isCompact ? 'lg' : 'md';
  const rowCtl = isCompact ? 'lg' : 'sm';
  const [selectedId, setSelectedId] = useState<string>(funds[0]?.id || '');
  const [viewRoundIdx, setViewRoundIdx] = useState<number | null>(null);

  // Dialog quỹ
  const [isFundDialogOpen, setIsFundDialogOpen] = useState(false);
  const [editingFundId, setEditingFundId] = useState<string | null>(null);
  const [fundName, setFundName] = useState('');
  const [fundMembers, setFundMembers] = useState<string[]>([]);
  const [fundTreasurer, setFundTreasurer] = useState('');

  // Dialog đợt thu
  const [isRoundDialogOpen, setIsRoundDialogOpen] = useState(false);
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [roundTitle, setRoundTitle] = useState('');
  const [roundAmount, setRoundAmount] = useState(0);
  const [roundDate, setRoundDate] = useState(todayIso());
  const [roundParticipants, setRoundParticipants] = useState<string[]>([]);

  // Dialog khoản chi
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState(0);
  const [expDate, setExpDate] = useState(todayIso());
  const [expSpentBy, setExpSpentBy] = useState('');

  const [deleteRoundId, setDeleteRoundId] = useState<string | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [isDeleteFundOpen, setIsDeleteFundOpen] = useState(false);

  // Quỹ đang xem bị xóa (hoặc dữ liệu Cloud đổi) thì rơi về quỹ đầu tiên
  const current = funds.find((f) => f.id === selectedId) || funds[0];
  const summary = useMemo(() => (current ? summarizeFund(current) : null), [current]);
  const contributions = useMemo(() => (current ? memberContributions(current) : []), [current]);

  const commitFund = (updated: GroupFund) => {
    onUpdateFunds(funds.map((f) => (f.id === updated.id ? updated : f)));
  };

  // ---------- Quỹ ----------
  const openCreateFund = () => {
    setEditingFundId(null);
    setFundName('');
    setFundMembers([]);
    setFundTreasurer('');
    setIsFundDialogOpen(true);
  };

  const openEditFund = () => {
    if (!current) return;
    setEditingFundId(current.id);
    setFundName(current.name);
    setFundMembers(current.members);
    setFundTreasurer(current.treasurer || '');
    setIsFundDialogOpen(true);
  };

  const saveFund = () => {
    const name = fundName.trim();
    if (!name) {
      toast({ body: 'Vui lòng đặt tên quỹ', type: 'error' });
      return;
    }
    if (fundMembers.length < 2) {
      toast({ body: 'Quỹ cần ít nhất 2 thành viên', type: 'error' });
      return;
    }
    const treasurer = fundMembers.includes(fundTreasurer) ? fundTreasurer : undefined;
    if (editingFundId && current) {
      commitFund({ ...current, name, members: fundMembers, treasurer });
      toast({ body: 'Đã lưu thay đổi', type: 'info' });
    } else {
      const created: GroupFund = {
        id: newId('fund'),
        name,
        members: fundMembers,
        treasurer,
        rounds: [],
        expenses: [],
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };
      onUpdateFunds([created, ...funds]);
      setSelectedId(created.id);
      setViewRoundIdx(null);
      toast({ body: `Đã tạo "${name}"`, type: 'info' });
    }
    setIsFundDialogOpen(false);
  };

  const deleteFund = async () => {
    if (!current) return;
    const id = current.id;
    const remaining = funds.filter((f) => f.id !== id);
    setSelectedId(remaining[0]?.id || '');
    setViewRoundIdx(null);
    onUpdateFunds(remaining);
    setIsDeleteFundOpen(false);
    await softDeleteGroupFundFromCloud(id);
  };

  // ---------- Đợt thu ----------
  const openCreateRound = () => {
    if (!current) return;
    const last = current.rounds[current.rounds.length - 1];
    setEditingRoundId(null);
    setRoundTitle(defaultRoundTitle());
    setRoundAmount(last?.amountPerMember || 200000);
    setRoundDate(todayIso());
    setRoundParticipants(current.members);
    setIsRoundDialogOpen(true);
  };

  const openEditRound = (round: FundRound) => {
    setEditingRoundId(round.id);
    setRoundTitle(round.title);
    setRoundAmount(round.amountPerMember);
    setRoundDate(round.date);
    setRoundParticipants(round.participants);
    setIsRoundDialogOpen(true);
  };

  const saveRound = () => {
    if (!current) return;
    if (roundAmount <= 0) {
      toast({ body: 'Vui lòng nhập số tiền mỗi người góp', type: 'error' });
      return;
    }
    if (roundParticipants.length === 0) {
      toast({ body: 'Chọn ít nhất 1 người góp đợt này', type: 'error' });
      return;
    }
    const title = roundTitle.trim() || defaultRoundTitle();
    // Giữ thứ tự theo danh sách thành viên, người cũ không còn trong quỹ vẫn giữ nếu đã chọn
    const participants = [
      ...current.members.filter((m) => roundParticipants.includes(m)),
      ...roundParticipants.filter((m) => !current.members.includes(m)),
    ];

    if (editingRoundId) {
      commitFund({
        ...current,
        rounds: current.rounds.map((r) =>
          r.id === editingRoundId
            ? {
                ...r,
                title,
                amountPerMember: roundAmount,
                date: roundDate,
                participants,
                paid: Object.fromEntries(Object.entries(r.paid).filter(([m]) => participants.includes(m))),
              }
            : r
        ),
      });
    } else {
      commitFund({
        ...current,
        rounds: [
          ...current.rounds,
          {
            id: newId('round'),
            title,
            amountPerMember: roundAmount,
            date: roundDate,
            participants,
            paid: {},
            createdAt: new Date().toISOString(),
          },
        ],
      });
      setViewRoundIdx(null);
      toast({ body: `Đã mở đợt thu ${title}`, type: 'info' });
    }
    setIsRoundDialogOpen(false);
  };

  const deleteRound = () => {
    if (!current || !deleteRoundId) return;
    commitFund({ ...current, rounds: current.rounds.filter((r) => r.id !== deleteRoundId) });
    setViewRoundIdx(null);
    setDeleteRoundId(null);
  };

  const togglePaid = (roundId: string, name: string) => {
    if (!current) return;
    commitFund({
      ...current,
      rounds: current.rounds.map((r) => {
        if (r.id !== roundId) return r;
        const paid = { ...r.paid };
        if (paid[name]) delete paid[name];
        else paid[name] = todayIso();
        return { ...r, paid };
      }),
    });
  };

  // ---------- Khoản chi ----------
  const openAddExpense = () => {
    if (!current) return;
    setEditingExpenseId(null);
    setExpTitle('');
    setExpAmount(0);
    setExpDate(todayIso());
    setExpSpentBy(current.treasurer || '');
    setIsExpenseDialogOpen(true);
  };

  const openEditExpense = (e: FundExpense) => {
    setEditingExpenseId(e.id);
    setExpTitle(e.title);
    setExpAmount(e.amount);
    setExpDate(e.date);
    setExpSpentBy(e.spentBy || '');
    setIsExpenseDialogOpen(true);
  };

  const saveExpense = () => {
    if (!current) return;
    if (expAmount <= 0) {
      toast({ body: 'Vui lòng nhập số tiền', type: 'error' });
      return;
    }
    const base = {
      title: expTitle.trim() || 'Chi từ quỹ',
      amount: expAmount,
      date: expDate,
      spentBy: expSpentBy || undefined,
    };
    const expenses = editingExpenseId
      ? current.expenses.map((e) => (e.id === editingExpenseId ? { ...e, ...base } : e))
      : [...current.expenses, { id: newId('fexp'), createdAt: new Date().toISOString(), ...base }];
    commitFund({ ...current, expenses });
    setIsExpenseDialogOpen(false);
  };

  const deleteExpense = () => {
    if (!current || !deleteExpenseId) return;
    commitFund({ ...current, expenses: current.expenses.filter((e) => e.id !== deleteExpenseId) });
    setDeleteExpenseId(null);
  };

  const copyMessage = async (round: FundRound | undefined) => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(buildFundMessage(current, round));
      toast({ body: 'Đã sao chép, dán vào nhóm Zalo nhé', type: 'info' });
    } catch {
      toast({ body: 'Trình duyệt không cho sao chép, hãy thử lại', type: 'error' });
    }
  };

  // ---------- Dialog quỹ (dùng cả khi chưa có quỹ nào) ----------
  const fundDialog = (
    <Dialog isOpen={isFundDialogOpen} onOpenChange={setIsFundDialogOpen} width={560} purpose="form">
      <DialogHeader
        title={editingFundId ? 'Sửa quỹ' : 'Quỹ mới'}
        subtitle="Quỹ hội bạn, quỹ lớp, quỹ phòng: góp định kỳ và chi chung"
        onOpenChange={setIsFundDialogOpen}
      />
      <VStack gap={4} padding={4}>
        <TextInput
          label="Tên quỹ"
          value={fundName}
          onChange={setFundName}
          placeholder="Ví dụ: Quỹ hội bạn thân"
          width="100%"
        />
        <MemberOrderEditor
          members={fundMembers}
          onChange={setFundMembers}
          minMembers={editingFundId ? 2 : 0}
          title="Thành viên"
          description="Nhập tên rồi nhấn Enter, nhiều tên cách nhau bằng dấu phẩy."
          isOrdered={false}
          allowDuplicates={false}
        />
        <Selector
          label="Thủ quỹ"
          value={fundMembers.includes(fundTreasurer) ? fundTreasurer : ''}
          options={[
            { value: '', label: 'Chưa chọn' },
            ...fundMembers.map((m) => ({ value: m, label: m })),
          ]}
          onChange={setFundTreasurer}
          width="100%"
        />
        <HStack hAlign="end" gap={2}>
          <Button label="Hủy" variant="ghost" onClick={() => setIsFundDialogOpen(false)} />
          <Button
            label={editingFundId ? 'Lưu' : 'Tạo quỹ'}
            variant="primary"
            icon={editingFundId ? undefined : <Icon icon={Plus} />}
            onClick={saveFund}
          />
        </HStack>
      </VStack>
    </Dialog>
  );

  if (!current || !summary) {
    return (
      <VStack gap={4}>
        <Card padding={8}>
          <EmptyState
            icon={<Icon icon={PiggyBank} size="lg" />}
            title="Chưa có quỹ nào"
            description="Tạo quỹ cho nhóm, mở đợt thu hằng tháng, đánh dấu ai đã góp và ghi lại từng khoản chi từ quỹ."
            actions={
              <Button label="Tạo quỹ đầu tiên" size={ctl} variant="primary" icon={<Icon icon={Plus} />} onClick={openCreateFund} />
            }
          />
        </Card>
        {fundDialog}
      </VStack>
    );
  }

  const rounds = current.rounds;
  const latestIdx = rounds.length - 1;
  const activeIdx = viewRoundIdx !== null && viewRoundIdx <= latestIdx ? viewRoundIdx : latestIdx;
  const activeRound: FundRound | undefined = rounds[activeIdx];
  const unpaidCount = rounds.reduce(
    (n, r) => n + r.participants.filter((m) => !r.paid[m]).length,
    0
  );

  const kpis = [
    {
      label: 'Số dư quỹ',
      value: formatCurrency(summary.balance),
      hint: current.treasurer ? `Thủ quỹ: ${current.treasurer}` : 'Chưa chọn thủ quỹ',
    },
    { label: 'Đã thu', value: formatCurrency(summary.collected), hint: `${rounds.length} đợt thu` },
    { label: 'Đã chi', value: formatCurrency(summary.spent), hint: `${current.expenses.length} khoản` },
    {
      label: 'Còn thiếu',
      value: formatCurrency(summary.outstanding),
      hint: unpaidCount > 0 ? `${unpaidCount} lượt chưa góp` : 'Mọi người đã góp đủ',
    },
  ];

  // ---------- Bảng ----------
  const roundRows: RoundRow[] = activeRound
    ? activeRound.participants.map((name) => ({ name, paidAt: activeRound.paid[name] }))
    : [];
  const roundPaidCount = roundRows.filter((r) => r.paidAt).length;

  const roundColumns: TableColumn<RoundRow>[] = [
    {
      key: 'name',
      header: 'Thành viên',
      width: proportional(1.4, { minWidth: 110 }),
      renderCell: (r) => (
        <VStack gap={0}>
          <Text weight="semibold" maxLines={1}>
            {r.name}
          </Text>
          <Text type="supporting" color="secondary">
            {r.paidAt ? `Góp ngày ${formatDateVi(r.paidAt)}` : `Phải góp ${formatCurrency(activeRound?.amountPerMember ?? 0)}`}
          </Text>
        </VStack>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      align: 'end',
      width: pixel(isCompact ? 152 : 148),
      renderCell: (r) =>
        r.paidAt ? (
          <HStack gap={1} vAlign="center" hAlign="end" wrap="nowrap">
            <Badge label="Đã góp" variant="green" />
            <IconButton
              label={`Hoàn tác ${r.name} đã góp`}
              tooltip="Hoàn tác"
              icon={<Icon icon={RotateCcw} />}
              size={rowCtl}
              variant="ghost"
              onClick={() => activeRound && togglePaid(activeRound.id, r.name)}
            />
          </HStack>
        ) : (
          <Button
            label="Đã góp"
            variant="primary"
            size={rowCtl}
            icon={<Icon icon={Check} />}
            onClick={() => activeRound && togglePaid(activeRound.id, r.name)}
          />
        ),
    },
  ];

  const sortedExpenses = [...current.expenses].sort((a, b) => b.date.localeCompare(a.date));
  const expenseColumns: TableColumn<FundExpense>[] = [
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
            {formatDateVi(e.date)}
            {e.spentBy ? ` · ${e.spentBy} chi` : ''}
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
            renderCell: (e: FundExpense) => (
              <Text weight="semibold" hasTabularNumbers>
                {formatCurrency(e.amount)}
              </Text>
            ),
          },
        ] as TableColumn<FundExpense>[])),
    {
      key: 'actions',
      header: 'Sửa',
      align: 'end',
      width: pixel(isCompact ? 100 : 84),
      renderCell: (e) => (
        <HStack gap={0.5} hAlign="end" wrap="nowrap">
          <IconButton
            label={`Sửa ${e.title}`}
            icon={<Icon icon={Pencil} />}
            size={rowCtl}
            variant="ghost"
            onClick={() => openEditExpense(e)}
          />
          <IconButton
            label={`Xóa ${e.title}`}
            icon={<Icon icon={Trash2} />}
            size={rowCtl}
            variant="ghost"
            onClick={() => setDeleteExpenseId(e.id)}
          />
        </HStack>
      ),
    },
  ];

  const memberColumns: TableColumn<MemberContribution>[] = [
    {
      key: 'name',
      header: 'Thành viên',
      width: proportional(1.4, { minWidth: 110 }),
      renderCell: (m) => (
        <VStack gap={0}>
          <HStack gap={1.5} vAlign="center" wrap="wrap">
            <Text weight="semibold">{m.name}</Text>
            {m.name === current.treasurer && <Badge label="Thủ quỹ" variant="blue" />}
            {!current.members.includes(m.name) && <Badge label="Đã rời" variant="neutral" />}
          </HStack>
          {m.unpaidRounds.length > 0 && (
            <Text type="supporting" color="secondary">
              Chưa góp: {m.unpaidRounds.join(', ')}
            </Text>
          )}
        </VStack>
      ),
    },
    ...(isCompact
      ? []
      : ([
          {
            key: 'contributed',
            header: 'Đã góp',
            align: 'end',
            width: pixel(130),
            renderCell: (m: MemberContribution) => (
              <Text hasTabularNumbers>{formatCurrency(m.contributed)}</Text>
            ),
          },
        ] as TableColumn<MemberContribution>[])),
    {
      key: 'owing',
      header: 'Còn thiếu',
      align: 'end',
      width: proportional(1, { minWidth: 120 }),
      renderCell: (m) =>
        m.owing > 0 ? (
          <Badge label={`Thiếu ${formatCurrency(m.owing)}`} variant="orange" />
        ) : (
          <Text color="secondary">Đủ</Text>
        ),
    },
  ];

  const fundOptions = funds.map((f) => ({
    value: f.id,
    label: f.name,
    description: `${f.members.length} thành viên · số dư ${formatCurrency(summarizeFund(f).balance)}`,
  }));
  const roundOptions = rounds.map((r, idx) => ({
    value: String(idx),
    label: r.title,
    description: `${formatCurrency(r.amountPerMember)}/người · ${formatDateVi(r.date)}`,
  }));

  return (
    <VStack gap={isCompact ? 4 : 6}>
      {/* Chọn quỹ và thao tác */}
      <Card>
        <HStack hAlign="between" vAlign="end" wrap="wrap" gap={3}>
          <StackItem size={isCompact ? 'fill' : 'static'}>
            <Selector
              label="Quỹ" size={ctl}
              value={current.id}
              options={fundOptions}
              onChange={(id) => {
                setSelectedId(id);
                setViewRoundIdx(null);
              }}
              width={isCompact ? '100%' : 280}
            />
          </StackItem>
          <HStack gap={2} vAlign="center" wrap="nowrap">
            <Button label="Mở đợt thu" size={ctl} variant="primary" icon={<Icon icon={HandCoins} />} onClick={openCreateRound} />
            <Button
              label="Ghi khoản chi" size={ctl}
              variant="secondary"
              isIconOnly={isCompact}
              icon={<Icon icon={Wallet} />}
              onClick={openAddExpense}
            />
            <MoreMenu
              label="Thao tác khác với quỹ" size={ctl}
              variant="secondary"
              alignment="end"
              presentation="adaptive"
              items={[
                { label: 'Quỹ mới', icon: <Icon icon={Plus} />, onClick: openCreateFund },
                { label: 'Sửa tên, thành viên, thủ quỹ', icon: <Icon icon={UsersRound} />, onClick: openEditFund },
                { type: 'divider' },
                {
                  label: 'Xóa quỹ',
                  icon: <Icon icon={Trash2} />,
                  variant: 'destructive',
                  onClick: () => setIsDeleteFundOpen(true),
                },
              ]}
            />
          </HStack>
        </HStack>
      </Card>

      {summary.balance < 0 && (
        <Banner
          status="warning"
          title={`Quỹ đang âm ${formatCurrency(-summary.balance)}`}
          description="Số đã chi nhiều hơn số đã thu. Hãy mở đợt thu mới hoặc kiểm tra lại các khoản chi."
        />
      )}

      {/* Chỉ số */}
      <Grid columns={{ minWidth: isCompact ? 150 : 200, repeat: 'fit' }} gap={isCompact ? 3 : 4}>
        {kpis.map((k) => (
          <Card key={k.label}>
            <VStack gap={2}>
              <Text type="supporting" color="secondary" maxLines={1}>
                {k.label}
              </Text>
              <Text size={isCompact ? 'lg' : 'xl'} weight="bold" hasTabularNumbers maxLines={1}>
                {k.value}
              </Text>
              <Text type="supporting" color="secondary" maxLines={1}>
                {k.hint}
              </Text>
            </VStack>
          </Card>
        ))}
      </Grid>

      {/* Đợt thu */}
      <Card>
        {activeRound ? (
          <VStack gap={4}>
            <HStack hAlign="between" vAlign="start" wrap="wrap" gap={3}>
              <VStack gap={1.5}>
                <HStack gap={2} vAlign="center" wrap="wrap">
                  <Heading level={2}>Đợt thu {activeRound.title}</Heading>
                  {roundPaidCount === roundRows.length ? (
                    <Badge label="Đã góp đủ" variant="green" />
                  ) : (
                    <Badge label={`Còn ${roundRows.length - roundPaidCount} người`} variant="orange" />
                  )}
                </HStack>
                <Text type="supporting" color="secondary">
                  {formatCurrency(activeRound.amountPerMember)}/người · mở ngày {formatDateVi(activeRound.date)}
                </Text>
              </VStack>
              <HStack gap={2} vAlign="center" wrap="wrap">
                {rounds.length > 1 && (
                  <Selector
                    label="Xem đợt" size={ctl}
                    isLabelHidden
                    value={String(activeIdx)}
                    options={roundOptions}
                    onChange={(v) => setViewRoundIdx(parseInt(v, 10))}
                    width={isCompact ? 200 : 200}
                  />
                )}
                <MoreMenu
                  label="Thao tác với đợt thu" size={ctl}
                  alignment="end"
                  presentation="adaptive"
                  items={[
                    { label: 'Sửa đợt thu', icon: <Icon icon={Pencil} />, onClick: () => openEditRound(activeRound) },
                    { type: 'divider' },
                    {
                      label: 'Xóa đợt thu',
                      icon: <Icon icon={Trash2} />,
                      variant: 'destructive',
                      onClick: () => setDeleteRoundId(activeRound.id),
                    },
                  ]}
                />
              </HStack>
            </HStack>

            <VStack gap={1.5}>
              <HStack hAlign="between" vAlign="center" gap={2}>
                <Text type="supporting">
                  Đã góp {roundPaidCount}/{roundRows.length} người
                </Text>
                <Text type="supporting" hasTabularNumbers>
                  {formatCurrency(roundCollected(activeRound))} /{' '}
                  {formatCurrency(activeRound.amountPerMember * activeRound.participants.length)}
                </Text>
              </HStack>
              <ProgressBar
                label="Tiến độ góp quỹ"
                isLabelHidden
                value={roundPaidCount}
                max={roundRows.length || 1}
                variant={roundPaidCount === roundRows.length ? 'success' : 'accent'}
              />
            </VStack>

            <Table<RoundRow>
              data={roundRows}
              columns={roundColumns}
              idKey="name"
              density="compact"
              dividers="rows"
              hasHover
            />

            <HStack hAlign="end">
              <Button
                label="Sao chép nhắc đóng quỹ" size={ctl}
                variant="secondary"
                icon={<Icon icon={Copy} />}
                onClick={() => copyMessage(activeRound)}
              />
            </HStack>
          </VStack>
        ) : (
          <EmptyState
            isCompact
            icon={<Icon icon={HandCoins} />}
            title="Chưa có đợt thu"
            description="Mở đợt thu đầu tiên, ví dụ mỗi người góp 200.000 ₫ cho tháng này."
            actions={
              <Button label="Mở đợt thu" size={ctl} variant="primary" icon={<Icon icon={Plus} />} onClick={openCreateRound} />
            }
          />
        )}
      </Card>

      {/* Khoản chi */}
      <Card>
        <VStack gap={4}>
          <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
            <Heading level={2}>Chi từ quỹ</Heading>
            <Text type="supporting" hasTabularNumbers>
              Tổng {formatCurrency(summary.spent)}
            </Text>
          </HStack>
          {sortedExpenses.length === 0 ? (
            <Text color="secondary">Chưa chi khoản nào. Bấm &quot;Ghi khoản chi&quot; mỗi khi dùng tiền quỹ.</Text>
          ) : (
            <Table<FundExpense>
              data={sortedExpenses}
              columns={expenseColumns}
              idKey="id"
              density="compact"
              dividers="rows"
              hasHover
            />
          )}
        </VStack>
      </Card>

      {/* Từng thành viên */}
      {rounds.length > 0 && (
        <Card>
          <VStack gap={4}>
            <Heading level={2}>Từng thành viên</Heading>
            <Table<MemberContribution>
              data={contributions}
              columns={memberColumns}
              idKey="name"
              density="compact"
              dividers="rows"
            />
          </VStack>
        </Card>
      )}

      {fundDialog}

      {/* DIALOG ĐỢT THU */}
      <Dialog isOpen={isRoundDialogOpen} onOpenChange={setIsRoundDialogOpen} width={520} purpose="form">
        <DialogHeader
          title={editingRoundId ? 'Sửa đợt thu' : 'Mở đợt thu'}
          subtitle={current.name}
          onOpenChange={setIsRoundDialogOpen}
        />
        <VStack gap={4} padding={4}>
          <Grid columns={{ minWidth: 200, repeat: 'fit' }} gap={3}>
            <TextInput
              label="Tên đợt"
              value={roundTitle}
              onChange={setRoundTitle}
              placeholder="Ví dụ: Tháng 12/2026"
              width="100%"
            />
            <DateInput
              label="Ngày mở"
              value={(roundDate as ISODateString) || undefined}
              onChange={(v) => v && setRoundDate(v)}
              presentation="popover"
              width="100%"
            />
          </Grid>
          <MoneyInput label="Mỗi người góp" value={roundAmount} onChange={setRoundAmount} placeholder="200.000" />
          <CheckboxList
            label="Ai góp đợt này"
            description={
              roundAmount > 0 && roundParticipants.length > 0
                ? `Tổng thu dự kiến ${formatCurrency(roundAmount * roundParticipants.length)}`
                : undefined
            }
            value={roundParticipants}
            onChange={setRoundParticipants}
            density="compact"
          >
            {current.members.map((m) => (
              <CheckboxListItem key={m} value={m} label={m} />
            ))}
          </CheckboxList>
          <HStack hAlign="end" gap={2}>
            <Button label="Hủy" variant="ghost" onClick={() => setIsRoundDialogOpen(false)} />
            <Button label={editingRoundId ? 'Lưu' : 'Mở đợt thu'} variant="primary" onClick={saveRound} />
          </HStack>
        </VStack>
      </Dialog>

      {/* DIALOG KHOẢN CHI */}
      <Dialog isOpen={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen} width={480} purpose="form">
        <DialogHeader
          title={editingExpenseId ? 'Sửa khoản chi' : 'Ghi khoản chi từ quỹ'}
          subtitle={`${current.name} · số dư ${formatCurrency(summary.balance)}`}
          onOpenChange={setIsExpenseDialogOpen}
        />
        <VStack gap={4} padding={4}>
          <TextInput
            label="Nội dung"
            value={expTitle}
            onChange={setExpTitle}
            placeholder="Ví dụ: Sinh nhật Trung, tiền nước"
            width="100%"
          />
          <Grid columns={{ minWidth: 200, repeat: 'fit' }} gap={3}>
            <MoneyInput label="Số tiền" value={expAmount} onChange={setExpAmount} placeholder="500.000" />
            <DateInput
              label="Ngày chi"
              value={(expDate as ISODateString) || undefined}
              onChange={(v) => v && setExpDate(v)}
              presentation="popover"
              width="100%"
            />
          </Grid>
          <Selector
            label="Người chi"
            value={expSpentBy}
            options={[{ value: '', label: 'Không ghi' }, ...current.members.map((m) => ({ value: m, label: m }))]}
            onChange={setExpSpentBy}
            width="100%"
          />
          {!editingExpenseId && expAmount > summary.balance && (
            <Text type="supporting" weight="semibold">
              Khoản này lớn hơn số dư hiện tại, quỹ sẽ bị âm {formatCurrency(expAmount - summary.balance)}.
            </Text>
          )}
          <HStack hAlign="end" gap={2}>
            <Button label="Hủy" variant="ghost" onClick={() => setIsExpenseDialogOpen(false)} />
            <Button label={editingExpenseId ? 'Lưu' : 'Ghi khoản chi'} variant="primary" onClick={saveExpense} />
          </HStack>
        </VStack>
      </Dialog>

      <AlertDialog
        isOpen={deleteRoundId !== null}
        onOpenChange={(open) => !open && setDeleteRoundId(null)}
        title="Xóa đợt thu?"
        description={`Xóa đợt "${rounds.find((r) => r.id === deleteRoundId)?.title ?? ''}" cùng trạng thái góp của mọi người. Số dư quỹ sẽ được tính lại.`}
        actionLabel="Xóa đợt thu"
        cancelLabel="Giữ lại"
        actionVariant="destructive"
        width={440}
        onAction={deleteRound}
      />

      <AlertDialog
        isOpen={deleteExpenseId !== null}
        onOpenChange={(open) => !open && setDeleteExpenseId(null)}
        title="Xóa khoản chi?"
        description={`Xóa "${current.expenses.find((e) => e.id === deleteExpenseId)?.title ?? ''}". Số dư quỹ sẽ được tính lại.`}
        actionLabel="Xóa"
        cancelLabel="Giữ lại"
        actionVariant="destructive"
        width={420}
        onAction={deleteExpense}
      />

      <AlertDialog
        isOpen={isDeleteFundOpen}
        onOpenChange={setIsDeleteFundOpen}
        title={`Xóa "${current.name}"?`}
        description="Toàn bộ đợt thu, khoản chi và lịch sử góp của quỹ này sẽ bị xóa."
        actionLabel="Xóa quỹ"
        cancelLabel="Giữ lại"
        actionVariant="destructive"
        width={440}
        onAction={deleteFund}
      />
    </VStack>
  );
}
