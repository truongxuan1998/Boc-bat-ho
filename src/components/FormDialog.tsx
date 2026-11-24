'use client';

import React from 'react';
import { Dialog } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter, VStack } from '@astryxdesign/core/Layout';

interface FormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  header: React.ReactNode; // Thường là <DialogHeader />
  footer?: React.ReactNode; // Các nút Hủy / Lưu, luôn ghim ở đáy
  width?: number;
  purpose?: 'required' | 'form' | 'info';
  children: React.ReactNode;
}

/**
 * Dialog có nội dung dài: tiêu đề cố định ở trên, phần giữa tự cuộn, nút ghim ở đáy.
 * Theo mẫu DialogScrollingContent của Astryx (Dialog > Layout header/content/footer).
 * Đặt nội dung thẳng vào Dialog thì phần vượt quá chiều cao tối đa bị cắt và không vuốt được.
 */
export function FormDialog({
  isOpen,
  onOpenChange,
  header,
  footer,
  width,
  purpose = 'form',
  children,
}: FormDialogProps) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={width} purpose={purpose} maxHeight="90dvh">
      <Layout
        header={header}
        content={
          <LayoutContent>
            <VStack gap={4}>{children}</VStack>
          </LayoutContent>
        }
        footer={footer ? <LayoutFooter>{footer}</LayoutFooter> : undefined}
      />
    </Dialog>
  );
}
