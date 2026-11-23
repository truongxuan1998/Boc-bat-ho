'use client';

import React, { useState, useMemo } from 'react';
import { VStack } from '@astryxdesign/core/Layout';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Selector } from '@astryxdesign/core/Selector';
import { Divider } from '@astryxdesign/core/Divider';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { generateProgressiveMatrix, formatCurrency } from '@/lib/huiCalculator';
import { MONTH_OPTIONS } from '@/lib/format';
import { HuiMatrixTable } from '@/components/HuiMatrixTable';
import { MoneyInput } from '@/components/MoneyInput';
import { MemberOrderEditor } from '@/components/MemberOrderEditor';

export function CalculatorTab() {
  const isCompact = useMediaQuery('(max-width: 640px)');
  const [members, setMembers] = useState<string[]>(['BÌNH', 'BẢO', 'CƯỜNG', 'TRUNG', 'XUÂN']);
  const [amountPerSlot, setAmountPerSlot] = useState<number>(3000000);
  const [interestStep, setInterestStep] = useState<number>(30000);
  const [startMonth, setStartMonth] = useState<number>(4);

  const matrix = useMemo(
    () => generateProgressiveMatrix(members, startMonth, interestStep, amountPerSlot),
    [members, startMonth, interestStep, amountPerSlot]
  );

  const firstWinner = matrix.members[0];
  const lastWinner = matrix.members[matrix.members.length - 1];

  const summary = [
    {
      label: 'Tiền lụm gốc mỗi kỳ',
      value: formatCurrency(matrix.basePot),
      hint: `(${matrix.totalMembers} − 1) × ${formatCurrency(matrix.baseAmount)}`,
    },
    {
      label: 'Lãi tăng mỗi kỳ',
      value: `+${formatCurrency(matrix.interestStep)}`,
      hint: 'Mỗi kỳ sau nhận thêm một bậc',
    },
    {
      label: `Kỳ 1 nhận (${firstWinner?.memberName ?? '—'})`,
      value: formatCurrency(firstWinner?.wonAmount ?? matrix.basePot),
      hint: 'Lấy vốn sớm, đóng bù về sau',
    },
    {
      label: `Kỳ chót nhận (${lastWinner?.memberName ?? '—'})`,
      value: formatCurrency(lastWinner?.wonAmount ?? 0),
      hint: `Gồm +${formatCurrency(lastWinner?.wonBonus ?? 0)} lãi`,
    },
  ];

  return (
    <VStack gap={isCompact ? 4 : 6} width="100%">
      <Card>
        <VStack gap={5}>
          <VStack gap={1}>
            <Heading level={2}>Dự toán hụi lũy tiến</Heading>
            <Text type="supporting" color="secondary">
              Nhập thông số để xem mỗi người nhận bao nhiêu tháng lụm, đóng bù bao nhiêu sau đó và lãi/lỗ cả dây.
            </Text>
          </VStack>

          <MemberOrderEditor members={members} onChange={setMembers} />

          <Grid columns={{ minWidth: 200, repeat: 'fit' }} gap={4}>
            <MoneyInput
              label="Tiền góp mỗi chân"
              value={amountPerSlot}
              onChange={setAmountPerSlot}
              placeholder="3.000.000"
            />
            <MoneyInput
              label="Lãi tăng mỗi kỳ"
              value={interestStep}
              onChange={setInterestStep}
              placeholder="30.000"
            />
            <Selector
              label="Tháng bắt đầu"
              value={String(startMonth)}
              onChange={(val) => setStartMonth(parseInt(val, 10))}
              options={MONTH_OPTIONS}
              width="100%"
            />
          </Grid>

          <Divider />

          <Grid columns={{ minWidth: isCompact ? 150 : 200, repeat: 'fit' }} gap={isCompact ? 3 : 4}>
            {summary.map((s) => (
              <Card key={s.label} variant="muted">
                <VStack gap={1}>
                  <Text type="supporting" color="secondary" maxLines={1}>
                    {s.label}
                  </Text>
                  <Text size={isCompact ? 'lg' : 'xl'} weight="bold" hasTabularNumbers maxLines={1}>
                    {s.value}
                  </Text>
                  <Text type="supporting" color="secondary">
                    {s.hint}
                  </Text>
                </VStack>
              </Card>
            ))}
          </Grid>
        </VStack>
      </Card>

      <HuiMatrixTable
        matrix={matrix}
        title="Kết quả dự toán"
        subtitle={`${matrix.totalMembers} thành viên, ${matrix.months[0]} đến ${matrix.months[matrix.months.length - 1].toLowerCase()}`}
      />
    </VStack>
  );
}
