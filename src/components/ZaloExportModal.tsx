'use client';

import React, { useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Icon } from '@astryxdesign/core/Icon';
import {
  ClipboardDocumentCheckIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { SystemData } from '@/types';
import { formatCurrency } from '@/lib/huiCalculator';

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

  // Sinh nội dung tin nhắn gửi Zalo
  const generateZaloMessage = (): string => {
    const lines: string[] = [];
    lines.push('📢 BẢNG THÔNG BÁO KHUI HỤI & ĐÓNG TIỀN 📢');
    lines.push(`⏰ Cập nhật: ${new Date().toLocaleDateString('vi-VN')}`);
    lines.push('--------------------------------------');

    if (data.huiGroups.length > 0) {
      for (const hui of data.huiGroups) {
        lines.push(`\n📌 DÂY HỤI: ${hui.name.toUpperCase()}`);
        lines.push(
          `• Tiền chân gốc: ${formatCurrency(hui.amountPerSlot)} | Tổng: ${
            hui.totalSlots
          } chân`
        );

        const latestPeriod = hui.periods?.[hui.periods.length - 1];
        if (latestPeriod) {
          lines.push(`\n🎉 KẾT QUẢ KỲ ${latestPeriod.periodNumber} (${latestPeriod.openDate}):`);
          lines.push(`• Người hốt: ${latestPeriod.winnerName}`);
          lines.push(`• Mức thăm kêu lãi: ${formatCurrency(latestPeriod.bidAmount)}`);
          lines.push(
            `• Thực lĩnh về tay: ${formatCurrency(latestPeriod.actualReceived)}`
          );

          lines.push('\n💰 TIỀN PHẢI NỘP KỲ NÀY:');
          const livingSlotAmount = Math.max(
            0,
            hui.amountPerSlot - latestPeriod.bidAmount
          );
          lines.push(
            `👉 CHÂN SỐNG (chưa hốt): ${formatCurrency(livingSlotAmount)}`
          );
          lines.push(
            `👉 CHÂN CHẾT (đã hốt): ${formatCurrency(hui.amountPerSlot)} (đủ gốc)`
          );

          const unpaidList = latestPeriod.payments.filter((p) => !p.isPaid);
          if (unpaidList.length > 0) {
            lines.push(
              `\n⚠️ CÁC CHÂN CHƯA CHUYỂN TIỀN (${unpaidList.length} chân):`
            );
            unpaidList.forEach((p) => {
              lines.push(`  - Chân #${p.slotNumber} (${p.memberName}): ${formatCurrency(p.amountToPay)}`);
            });
          } else {
            lines.push('\n✅ Tất cả các chân đã đóng tiền đủ 100%!');
          }
        } else {
          lines.push('• Dây hụi mới, chưa khui kỳ nào.');
        }
      }
    }

    lines.push('\n--------------------------------------');
    lines.push('💳 Mọi người vui lòng chuyển khoản theo STK của Chủ Hụi.');
    lines.push('Xin cảm ơn cả nhà!');

    return lines.join('\n');
  };

  const messageText = generateZaloMessage();

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      width={620}
      purpose="info"
    >
      <DialogHeader
        title="Xuất Tin Nhắn Gửi Nhóm Zalo"
        subtitle="Văn bản định dạng sẵn, sao chép 1 chạm để gửi cho nhóm hụi"
        onOpenChange={onOpenChange}
      />
      <VStack gap={4} padding={4}>
        <HStack hAlign="between" vAlign="center">
          <HStack gap={2} vAlign="center">
            <Icon icon={ChatBubbleLeftRightIcon} size="md" />
            <Text weight="semibold">Nội dung tin nhắn sao chép:</Text>
          </HStack>
          <Button
            label={copied ? 'Đã Sao Chép!' : 'Sao Chép Tin Nhắn'}
            variant={copied ? 'primary' : 'secondary'}
            size="sm"
            icon={
              <Icon
                icon={copied ? CheckIcon : ClipboardDocumentCheckIcon}
                size="sm"
              />
            }
            onClick={handleCopy}
          />
        </HStack>

        <TextArea
          label="Nội dung thông báo"
          value={messageText}
          onChange={() => {}}
          isReadOnly
          width="100%"
          description="Được tạo tự động theo dữ liệu kỳ khui mới nhất của các dây hụi"
        />

        <Divider />

        <HStack hAlign="end" gap={2}>
          <Button
            label="Đóng"
            variant="ghost"
            size="md"
            onClick={() => onOpenChange(false)}
          />
          <Button
            label={copied ? 'Đã Sao Chép Vào Bộ Nhớ' : 'Sao Chép Ngay'}
            variant="primary"
            size="md"
            icon={
              <Icon
                icon={copied ? CheckIcon : ClipboardDocumentCheckIcon}
                size="sm"
              />
            }
            onClick={handleCopy}
          />
        </HStack>
      </VStack>
    </Dialog>
  );
}
