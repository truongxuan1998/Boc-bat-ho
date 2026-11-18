'use client';

import React, { useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Badge } from '@astryxdesign/core/Badge';
import { Divider } from '@astryxdesign/core/Divider';
import { Icon } from '@astryxdesign/core/Icon';
import { CalculatorIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '@/lib/huiCalculator';

export function CalculatorTab() {
  // 1. State Dự Toán Hụi
  const [huiSlots, setHuiSlots] = useState('12');
  const [huiAmount, setHuiAmount] = useState('5000000');
  const [huiBidAvg, setHuiBidAvg] = useState('400000');
  const [huiCommission, setHuiCommission] = useState('500000');

  const slotsCount = parseInt(huiSlots, 10) || 12;
  const slotAmount = parseInt(huiAmount.replace(/\D/g, ''), 10) || 5000000;
  const bidAvg = parseInt(huiBidAvg.replace(/\D/g, ''), 10) || 400000;
  const commission = parseInt(huiCommission.replace(/\D/g, ''), 10) || 500000;

  // Tổng tiền cả dây
  const totalHuiValue = slotsCount * slotAmount;
  // Tổng tiền xâu chủ hụi thu qua cả dây
  const totalHostCommission = slotsCount * commission;
  // Người hốt đầu tiên (kỳ 1): nhận = (slotsCount - 1) * (slotAmount - bidAvg) - commission
  const firstWinnerReceive =
    (slotsCount - 1) * (slotAmount - bidAvg) - commission;
  // Tổng tiền người hốt đầu phải đóng ở các kỳ sau (chân chết): (slotsCount - 1) * slotAmount
  const firstWinnerTotalPaid = (slotsCount - 1) * slotAmount;
  const firstWinnerNetCost = firstWinnerTotalPaid - firstWinnerReceive;

  // Người hốt cuối cùng (kỳ chót): nhận = (slotsCount - 1) * slotAmount - commission
  const lastWinnerReceive = (slotsCount - 1) * slotAmount - commission;
  // Tổng tiền người hốt cuối đã đóng ở các kỳ trước (toàn bộ là chân sống): (slotsCount - 1) * (slotAmount - bidAvg)
  const lastWinnerTotalPaid = (slotsCount - 1) * (slotAmount - bidAvg);
  const lastWinnerNetProfit = lastWinnerReceive - lastWinnerTotalPaid;

  return (
    <VStack gap={6}>
      <Card>
        <HStack gap={3} vAlign="center">
          <Icon icon={CalculatorIcon} size="lg" />
          <VStack gap={0}>
            <Heading level={3}>Máy Tính Dự Toán Hụi / Họ Xoay Vòng</Heading>
            <Text type="supporting" color="secondary">
              Công cụ tính nhẩm dòng tiền, tỉ suất sinh lời người hốt chót và chi phí người hốt đầu trước khi vào dây hụi
            </Text>
          </VStack>
        </HStack>
      </Card>

      {/* DỰ TOÁN HỤI / HỌ XOAY VÒNG */}
      <Card>
        <VStack gap={4}>
          <HStack gap={2} vAlign="center">
            <Icon icon={SparklesIcon} size="md" />
            <Heading level={4}>Thông Số Dây Hụi Dự Kiến</Heading>
          </HStack>

          <Grid columns={{ minWidth: 220, repeat: 'fit' }} gap={4}>
            <TextInput
              label="Số Chân (Kỳ Hụi)"
              value={huiSlots}
              onChange={setHuiSlots}
              placeholder="12"
            />
            <TextInput
              label="Tiền Góp Mỗi Chân (VNĐ)"
              value={huiAmount}
              onChange={setHuiAmount}
              placeholder="5000000"
            />
            <TextInput
              label="Mức Kêu Trung Bình (VNĐ)"
              value={huiBidAvg}
              onChange={setHuiBidAvg}
              placeholder="400000"
            />
            <TextInput
              label="Tiền Xâu Mỗi Kỳ (VNĐ)"
              value={huiCommission}
              onChange={setHuiCommission}
              placeholder="500000"
            />
          </Grid>

          <Divider />

          <Grid columns={{ minWidth: 240, repeat: 'fit' }} gap={4}>
            <Card variant="muted">
              <VStack gap={1}>
                <Text type="supporting" color="secondary">
                  Tổng Giá Trị Dây Hụi
                </Text>
                <Heading level={4}>{formatCurrency(totalHuiValue)}</Heading>
                <Text type="supporting">
                  Chủ hụi thu xâu trọn gói:{' '}
                  <Text weight="semibold">
                    {formatCurrency(totalHostCommission)}
                  </Text>
                </Text>
              </VStack>
            </Card>

            <Card variant="muted">
              <VStack gap={1}>
                <HStack gap={2} vAlign="center">
                  <Text type="supporting" color="secondary">
                    Người Hốt Chót (Lãi Cao Nhất)
                  </Text>
                  <Badge label="Lời To" variant="success" />
                </HStack>
                <Heading level={4}>
                  +{formatCurrency(lastWinnerNetProfit)}
                </Heading>
                <Text type="supporting">
                  Đóng {formatCurrency(lastWinnerTotalPaid)} ➔ Lĩnh{' '}
                  {formatCurrency(lastWinnerReceive)}
                </Text>
              </VStack>
            </Card>

            <Card variant="muted">
              <VStack gap={1}>
                <HStack gap={2} vAlign="center">
                  <Text type="supporting" color="secondary">
                    Người Hốt Đầu (Kỳ 1 - Cần Vốn)
                  </Text>
                  <Badge label="Chịu Lãi" variant="warning" />
                </HStack>
                <Heading level={4}>
                  -{formatCurrency(firstWinnerNetCost)}
                </Heading>
                <Text type="supporting">
                  Lĩnh {formatCurrency(firstWinnerReceive)} ➔ Phải đóng{' '}
                  {formatCurrency(firstWinnerTotalPaid)}
                </Text>
              </VStack>
            </Card>
          </Grid>
        </VStack>
      </Card>
    </VStack>
  );
}
