'use client';

import React, { useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Grid } from '@astryxdesign/core/Grid';
import { Divider } from '@astryxdesign/core/Divider';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Table, TableColumn, proportional, pixel } from '@astryxdesign/core/Table';
import { Icon } from '@astryxdesign/core/Icon';
import {
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { BatHoLoan } from '@/types';
import { createBatHoLoan, calculateBatHoStats } from '@/lib/batHoCalculator';
import { formatCurrency } from '@/lib/huiCalculator';

interface BatHoTabProps {
  batHoLoans: BatHoLoan[];
  onUpdateBatHoLoans: (loans: BatHoLoan[]) => void;
}

export function BatHoTab({ batHoLoans, onUpdateBatHoLoans }: BatHoTabProps) {
  const [selectedLoanId, setSelectedLoanId] = useState<string>(
    batHoLoans[0]?.id || ''
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form tạo Bát Họ mới
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [totalAmountStr, setTotalAmountStr] = useState('10000000');
  const [receivedAmountStr, setReceivedAmountStr] = useState('8000000');
  const [totalDaysStr, setTotalDaysStr] = useState('50');
  const [address, setAddress] = useState('');

  const currentLoan =
    batHoLoans.find((l) => l.id === selectedLoanId) || batHoLoans[0];

  // Xử lý toggle đóng tiền của một ngày trong Bát Họ
  const handleToggleDay = (dayIndex: number) => {
    if (!currentLoan) return;
    const updatedPayments = currentLoan.payments.map((p) => {
      if (p.dayIndex === dayIndex) {
        return {
          ...p,
          isPaid: !p.isPaid,
          paidAt: !p.isPaid ? new Date().toISOString().split('T')[0] : undefined,
        };
      }
      return p;
    });

    const isAllPaid = updatedPayments.every((p) => p.isPaid);
    const updatedLoan: BatHoLoan = {
      ...currentLoan,
      payments: updatedPayments,
      status: isAllPaid ? 'COMPLETED' : 'ACTIVE',
    };

    onUpdateBatHoLoans(
      batHoLoans.map((l) => (l.id === currentLoan.id ? updatedLoan : l))
    );
  };

  // Tạo hợp đồng Bát Họ mới
  const handleCreateLoan = () => {
    if (!customerName.trim()) {
      alert('Vui lòng nhập tên khách hàng');
      return;
    }
    const totalAmount =
      parseInt(totalAmountStr.replace(/\D/g, ''), 10) || 10000000;
    const receivedAmount =
      parseInt(receivedAmountStr.replace(/\D/g, ''), 10) || 8000000;
    const totalDays = parseInt(totalDaysStr, 10) || 50;

    const newLoan = createBatHoLoan(
      customerName,
      phone,
      totalAmount,
      receivedAmount,
      totalDays,
      new Date().toISOString().split('T')[0],
      address
    );

    onUpdateBatHoLoans([newLoan, ...batHoLoans]);
    setSelectedLoanId(newLoan.id);
    setIsCreateOpen(false);
    setCustomerName('');
    setPhone('');
    setAddress('');
  };

  // Cấu hình bảng danh sách Bát Họ
  const loanColumns: TableColumn<BatHoLoan>[] = [
    {
      key: 'customer',
      header: 'Khách Hàng',
      renderCell: (l: BatHoLoan) => (
        <VStack gap={0}>
          <Text weight="semibold">{l.customerName}</Text>
          <Text type="supporting" color="secondary">
            {l.phone || 'Chưa có SĐT'} {l.address ? `• ${l.address}` : ''}
          </Text>
        </VStack>
      ),
      width: proportional(2),
    },
    {
      key: 'terms',
      header: 'Mức Bát Họ',
      renderCell: (l: BatHoLoan) => (
        <VStack gap={0}>
          <Text weight="semibold">{formatCurrency(l.totalAmount)}</Text>
          <Text type="supporting" color="secondary">
            Cầm về: {formatCurrency(l.receivedAmount)} (Phế:{' '}
            {formatCurrency(l.cutFee)})
          </Text>
        </VStack>
      ),
      width: proportional(2),
    },
    {
      key: 'daily',
      header: 'Góp Hàng Ngày',
      renderCell: (l: BatHoLoan) => (
        <VStack gap={0}>
          <Text weight="semibold">{formatCurrency(l.dailyAmount)}/ngày</Text>
          <Text type="supporting" color="secondary">
            Trong {l.totalDays} ngày
          </Text>
        </VStack>
      ),
      width: proportional(1.5),
    },
    {
      key: 'progress',
      header: 'Tiến Độ Đóng',
      renderCell: (l: BatHoLoan) => {
        const stats = calculateBatHoStats(l);
        return (
          <VStack gap={0}>
            <Text weight="semibold">
              {stats.paidDays} / {l.totalDays} ngày ({stats.progressPercent}%)
            </Text>
            {stats.lateDays > 0 ? (
              <Badge label={`Chậm ${stats.lateDays} ngày`} variant="error" />
            ) : (
              <Text type="supporting" color="secondary">
                Đúng hạn
              </Text>
            )}
          </VStack>
        );
      },
      width: proportional(1.5),
    },
    {
      key: 'status',
      header: 'Trạng Thái',
      renderCell: (l: BatHoLoan) => {
        const stats = calculateBatHoStats(l);
        if (stats.paidDays === l.totalDays) {
          return <Badge label="Đã Tất Toán" variant="success" />;
        }
        if (stats.isOverdue) {
          return <Badge label="Cảnh Báo Chậm" variant="warning" />;
        }
        return <Badge label="Đang Góp" variant="info" />;
      },
      width: pixel(130),
    },
    {
      key: 'action',
      header: 'Sổ Kê',
      renderCell: (l: BatHoLoan) => (
        <Button
          label="Mở Sổ"
          variant={l.id === currentLoan?.id ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setSelectedLoanId(l.id)}
        />
      ),
      width: pixel(90),
    },
  ];

  const currentStats = currentLoan ? calculateBatHoStats(currentLoan) : null;

  return (
    <VStack gap={6}>
      {/* Tiêu đề & Nút thêm Bát Họ mới */}
      <Card>
        <HStack hAlign="between" vAlign="center" wrap="wrap" gap={4}>
          <VStack gap={1}>
            <Heading level={4}>Quản Lý Bát Họ Ngày (Vay Góp Dân Gian)</Heading>
            <Text type="supporting" color="secondary">
              Mô hình chuẩn 10 ăn 8, 20 ăn 16 đóng theo ngày, theo dõi tích kê từng ngày
            </Text>
          </VStack>
          <Button
            label="Thêm Bát Họ Mới"
            variant="primary"
            size="md"
            icon={<Icon icon={PlusIcon} size="sm" />}
            onClick={() => setIsCreateOpen(true)}
          />
        </HStack>
      </Card>

      {/* Danh sách Bát Họ hoặc Trạng thái trống */}
      {batHoLoans.length === 0 ? (
        <Card>
          <VStack gap={4} hAlign="center" padding={6}>
            <Heading level={4}>Chưa có hợp đồng Bát Họ nào</Heading>
            <Text type="supporting" color="secondary">
              Nhấn nút bên dưới để tạo hợp đồng bốc bát họ đầu tiên (10 ăn 8, 20 ăn 16...)
            </Text>
            <Button
              label="Thêm Bát Họ Đầu Tiên"
              variant="primary"
              size="md"
              icon={<Icon icon={PlusIcon} size="sm" />}
              onClick={() => setIsCreateOpen(true)}
            />
          </VStack>
        </Card>
      ) : (
        <>
          {/* Sổ Tích Kê Ngày Của Khách Được Chọn */}
          {currentLoan && currentStats && (
            <Card>
              <VStack gap={4}>
                <HStack hAlign="between" vAlign="center" wrap="wrap">
                  <VStack gap={1}>
                    <HStack gap={2} vAlign="center">
                      <Heading level={4}>
                        Sổ Tích Kê: {currentLoan.customerName}
                      </Heading>
                      <Badge
                        label={`${currentStats.paidDays}/${currentLoan.totalDays} ngày`}
                        variant={currentStats.progressPercent === 100 ? 'success' : 'info'}
                      />
                      {currentStats.lateDays > 0 && (
                        <Badge
                          label={`Trễ ${currentStats.lateDays} ngày`}
                          variant="error"
                        />
                      )}
                    </HStack>
                    <Text type="supporting" color="secondary">
                      Bát: {formatCurrency(currentLoan.totalAmount)} | Cầm về:{' '}
                      {formatCurrency(currentLoan.receivedAmount)} (Cắt phế{' '}
                      {formatCurrency(currentLoan.cutFee)}) | Mỗi ngày đóng:{' '}
                      <Text weight="semibold">
                        {formatCurrency(currentLoan.dailyAmount)}
                      </Text>
                    </Text>
                  </VStack>

                  <HStack gap={4} vAlign="center">
                    <VStack gap={0} hAlign="end">
                      <Text type="supporting" color="secondary">
                        Đã Thu / Còn Nợ
                      </Text>
                      <Text weight="semibold">
                        {formatCurrency(currentStats.paidAmount)} /{' '}
                        {formatCurrency(currentStats.remainingAmount)}
                      </Text>
                    </VStack>
                  </HStack>
                </HStack>

                <Divider />

                {/* Lưới 50 ngày tích kê bấm trực tiếp */}
                <VStack gap={2}>
                  <Text weight="semibold">
                    Bấm vào từng ngày để điểm danh đóng tiền:
                  </Text>
                  <Grid columns={{ minWidth: 90, repeat: 'fit' }} gap={2}>
                    {currentLoan.payments.map((p) => (
                      <Button
                        key={p.dayIndex}
                        label={`N${p.dayIndex}: ${p.isPaid ? 'Đã thu' : 'Chưa'}`}
                        variant={p.isPaid ? 'primary' : 'ghost'}
                        size="sm"
                        icon={
                          <Icon
                            icon={p.isPaid ? CheckCircleIcon : ClockIcon}
                            size="sm"
                          />
                        }
                        onClick={() => handleToggleDay(p.dayIndex)}
                      />
                    ))}
                  </Grid>
                </VStack>
              </VStack>
            </Card>
          )}

          {/* Bảng Danh Sách Tất Cả Các Hợp Đồng Bát Họ */}
          <Card>
            <VStack gap={4}>
              <Heading level={4}>Danh Sách Khách Bốc Bát Họ</Heading>
              <Table<BatHoLoan>
                data={batHoLoans}
                columns={loanColumns}
                idKey="id"
                density="compact"
                dividers="rows"
                hasHover
              />
            </VStack>
          </Card>
        </>
      )}

      {/* DIALOG THÊM BÁT HỌ MỚI */}
      <Dialog
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        width={480}
        purpose="form"
      >
        <DialogHeader
          title="Tạo Bát Họ Mới"
          subtitle="Ghi nhận khách bốc bát họ mới"
          onOpenChange={setIsCreateOpen}
        />
        <VStack gap={4} padding={4}>
          <TextInput
            label="Họ Và Tên Khách Hàng"
            value={customerName}
            onChange={setCustomerName}
            placeholder="Nguyễn Văn A"
          />

          <TextInput
            label="Số Điện Thoại"
            value={phone}
            onChange={setPhone}
            placeholder="0912345678"
          />

          <TextInput
            label="Địa Chỉ / Khu Vực"
            value={address}
            onChange={setAddress}
            placeholder="Phường X, Quận Y"
          />

          <TextInput
            label="Số Tiền Bát Họ (VNĐ)"
            value={totalAmountStr}
            onChange={setTotalAmountStr}
            placeholder="10000000"
            description="Tổng số tiền hợp đồng (Vd: 10 triệu)"
          />

          <TextInput
            label="Tiền Thực Tế Cầm Về (VNĐ)"
            value={receivedAmountStr}
            onChange={setReceivedAmountStr}
            placeholder="8000000"
            description="Tiền khách cầm sau khi cắt phế (Vd: 10 ăn 8 = 8 triệu)"
          />

          <TextInput
            label="Số Ngày Đóng (Ngày)"
            value={totalDaysStr}
            onChange={setTotalDaysStr}
            placeholder="50"
            description="Thường là 50 ngày (hoặc 40, 60 ngày)"
          />

          <Divider />

          <HStack hAlign="end" gap={2}>
            <Button
              label="Hủy Bỏ"
              variant="ghost"
              size="md"
              onClick={() => setIsCreateOpen(false)}
            />
            <Button
              label="Tạo Hợp Đồng"
              variant="primary"
              size="md"
              icon={<Icon icon={PlusIcon} size="sm" />}
              onClick={handleCreateLoan}
            />
          </HStack>
        </VStack>
      </Dialog>
    </VStack>
  );
}
