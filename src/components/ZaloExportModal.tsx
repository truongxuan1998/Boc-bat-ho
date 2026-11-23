'use client';

import React, { useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Icon } from '@astryxdesign/core/Icon';
import {
  ClipboardDocumentCheckIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { SystemData } from '@/types';
import { formatCurrency } from '@/lib/huiCalculator';
import { formatDateVi } from '@/lib/format';

interface ZaloExportModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: SystemData;
}

export function ZaloExportModal({
  isOpen,
  onOpenChange,
  data,
}: ZaloExportModalProps) {
  const [copied, setCopied] = useState(false);

  // Sinh nội dung tin nhắn gửi Zalo, số tiền lấy đúng từ bảng điểm danh kỳ mới nhất
  const generateZaloMessage = (): string => {
    const lines: string[] = [];
    lines.push('📢 THÔNG BÁO KHUI HỤI & ĐÓNG TIỀN');
    lines.push(`Cập nhật: ${new Date().toLocaleDateString('vi-VN')}`);

    if (data.huiGroups.length === 0) {
      lines.push('');
      lines.push('Chưa có dây hụi nào.');
    }

    for (const hui of data.huiGroups) {
      lines.push('');
      lines.push('━━━━━━━━━━━━━━━━');
      lines.push(`📌 ${hui.name.toUpperCase()}`);
      lines.push(`Tiền góp: ${formatCurrency(hui.amountPerSlot)}/chân · ${hui.totalSlots} chân`);

      const latestPeriod = hui.periods?.[hui.periods.length - 1];
      if (!latestPeriod) {
        lines.push('Dây mới, chưa khui kỳ nào.');
        continue;
      }

      lines.push('');
      lines.push(
        `🎉 Kỳ ${latestPeriod.periodNumber}/${hui.totalSlots} (${formatDateVi(latestPeriod.openDate)})`
      );
      lines.push(`Người lụm: ${latestPeriod.winnerName}`);
      lines.push(`Tiền nhận: ${formatCurrency(latestPeriod.actualReceived)}`);

      const payments = [...latestPeriod.payments].sort((a, b) => a.slotNumber - b.slotNumber);
      const unpaid = payments.filter((p) => !p.isPaid);

      lines.push('');
      lines.push('💰 Tiền đóng kỳ này:');
      payments.forEach((p) => {
        lines.push(
          `${p.isPaid ? '✅' : '⏳'} ${p.memberName}: ${formatCurrency(p.amountToPay)}`
        );
      });

      lines.push('');
      if (unpaid.length > 0) {
        const unpaidTotal = unpaid.reduce((sum, p) => sum + p.amountToPay, 0);
        lines.push(
          `⚠️ Còn ${unpaid.length} người chưa đóng, tổng ${formatCurrency(unpaidTotal)}`
        );
      } else {
        lines.push('✅ Tất cả đã đóng đủ.');
      }
    }

    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━');
    lines.push('Mọi người chuyển khoản theo STK của chủ hụi giúp mình nhé. Cảm ơn cả nhà!');

    return lines.join('\n');
  };

  // Chỉ tạo tin khi mở dialog (tránh đọc new Date() lúc prerender)
  const messageText = isOpen ? generateZaloMessage() : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={560} purpose="info">
      <DialogHeader
        title="Gửi thông báo nhóm Zalo"
        subtitle="Tin nhắn tạo từ kỳ khui mới nhất của từng dây, sao chép rồi dán vào nhóm"
        onOpenChange={onOpenChange}
      />
      <VStack gap={4} padding={4}>
        <TextArea
          label="Nội dung tin nhắn"
          isLabelHidden
          value={messageText}
          onChange={() => {}}
          isReadOnly
          rows={14}
          width="100%"
        />

        <HStack hAlign="end" gap={2}>
          <Button label="Đóng" variant="ghost" onClick={() => onOpenChange(false)} />
          <Button
            label={copied ? 'Đã sao chép' : 'Sao chép tin nhắn'}
            variant="primary"
            icon={<Icon icon={copied ? CheckIcon : ClipboardDocumentCheckIcon} />}
            onClick={handleCopy}
          />
        </HStack>
      </VStack>
    </Dialog>
  );
}
