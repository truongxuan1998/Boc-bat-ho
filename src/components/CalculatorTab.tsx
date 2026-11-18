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

  // 2. State Dự Toán Bát Họ Ngày
  const [batHoTotal, setBatHoTotal] = useState('10000000');
  const [batHoReceived, setBatHoReceived] = useState('8000000');
  const [batHoDays, setBatHoDays] = useState('50');

  const bTotal = parseInt(batHoTotal.replace(/\D/g, ''), 10) || 10000000;
  const bReceived = parseInt(batHoReceived.replace(/\D/g, ''), 10) || 8000000;
  const bDays = parseInt(batHoDays, 10) || 50;

  const cutFee = Math.max(0, bTotal - bReceived);
  const dailyPay = bDays > 0 ? Math.round(bTotal / bDays) : 0;
  const profitRate = bReceived > 0 ? ((cutFee / bReceived) * 100).toFixed(1) : '0';

  return (
    <VStack gap={6}>
      <Card>
        <HStack gap={3} vAlign="center">
          <Icon icon={CalculatorIcon} size="lg" />
          <VStack gap={0}>
            <Heading level={3}>Máy Tính Dự Toán Hụi & Bát Họ Nhanh</Heading>
            <Text type="supporting" color="secondary">
              Công cụ tính nhẩm dòng tiền, tỉ suất lợi nhuận và chi phí trước khi vào dây hoặc cho bốc bát họ
            </Text>
          </VStack>
        </HStack>
      </Card>

      {/* DỰ TOÁN 1: HỤI / HỌ XOAY VÒNG */}
      <Card>
        <VStack gap={4}>
          <HStack gap={2} vAlign="center">
            <Icon icon={SparklesIcon} size="md" />
            <Heading level={4}>1. Dự Toán Hụi / Họ Xoay Vòng</Heading>
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
                    Người Hốt Đầu (Kỳ 1 - Vay Tiền)
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

      {/* DỰ TOÁN 2: BÁT HỌ NGÀY (10 ĂN 8) */}
      <Card>
        <VStack gap={4}>
          <HStack gap={2} vAlign="center">
            <Icon icon={SparklesIcon} size="md" />
            <Heading level={4}>2. Dự Toán Bát Họ Ngày (Vay Góp Dân Gian)</Heading>
          </HStack>

          <Grid columns={{ minWidth: 220, repeat: 'fit' }} gap={4}>
            <TextInput
              label="Số Tiền Bát Họ (VNĐ)"
              value={batHoTotal}
              onChange={setBatHoTotal}
              placeholder="10000000"
            />
            <TextInput
              label="Tiền Cầm Về (VNĐ)"
              value={batHoReceived}
              onChange={setBatHoReceived}
              placeholder="8000000"
            />
            <TextInput
              label="Thời Gian Góp (Ngày)"
              value={batHoDays}
              onChange={setBatHoDays}
              placeholder="50"
            />
          </Grid>

          <Divider />

          <Grid columns={{ minWidth: 240, repeat: 'fit' }} gap={4}>
            <Card variant="muted">
              <VStack gap={1}>
                <Text type="supporting" color="secondary">
                  Tiền Cắt Phế Ngay Tại Chỗ
                </Text>
                <Heading level={4}>{formatCurrency(cutFee)}</Heading>
                <Text type="supporting">Thu nhập cầm chắc khi giao tiền</Text>
              </VStack>
            </Card>

            <Card variant="muted">
              <VStack gap={1}>
                <Text type="supporting" color="secondary">
                  Số Tiền Khách Đóng Mỗi Ngày
                </Text>
                <Heading level={4}>{formatCurrency(dailyPay)} / ngày</Heading>
                <Text type="supporting">Đóng đều trong {bDays} ngày</Text>
              </VStack>
            </Card>

            <Card variant="muted">
              <VStack gap={1}>
                <Text type="supporting" color="secondary">
                  Tỉ Suất Sinh Lời (Trong {bDays} ngày)
                </Text>
                <Heading level={4}>{profitRate}%</Heading>
                <Text type="supporting">Lãi tính trên số tiền vốn bỏ ra</Text>
              </VStack>
            </Card>
          </Grid>
        </VStack>
      </Card>
    </VStack>
  );
}
