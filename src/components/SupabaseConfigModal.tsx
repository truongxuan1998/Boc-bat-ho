'use client';

import React, { useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Divider } from '@astryxdesign/core/Divider';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Icon } from '@astryxdesign/core/Icon';
import {
  CloudIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  isSupabaseConfigured,
} from '@/lib/supabaseClient';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfigSaved: () => void;
}

export function SupabaseConfigModal({
  isOpen,
  onOpenChange,
  onConfigSaved,
}: SupabaseConfigModalProps) {
  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url || '');
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey || '');
  const isConfigured = isSupabaseConfigured();

  const handleSave = () => {
    if (!url.trim() || !anonKey.trim()) {
      alert('Vui lòng nhập đầy đủ Supabase Project URL và Anon Key');
      return;
    }
    saveSupabaseConfig(url, anonKey);
    onConfigSaved();
    onOpenChange(false);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      width={560}
      purpose="form"
    >
      <DialogHeader
        title="Kết Nối Supabase Cloud Database"
        subtitle="Đồng bộ dữ liệu nhiều máy và truy cập trên điện thoại theo thời gian thực"
        onOpenChange={onOpenChange}
      />
      <VStack gap={4} padding={4}>
        {/* Trạng thái hiện tại */}
        <Card variant={isConfigured ? 'default' : 'muted'}>
          <HStack hAlign="between" vAlign="center" wrap="wrap" gap={2}>
            <HStack gap={2} vAlign="center">
              <Icon
                icon={isConfigured ? CheckCircleIcon : ExclamationCircleIcon}
                size="md"
              />
              <VStack gap={0}>
                <Text weight="semibold">
                  {isConfigured
                    ? 'Đang kết nối Đám mây Supabase'
                    : 'Chưa kết nối Đám mây (Đang lưu trên máy)'}
                </Text>
                <Text type="supporting" color="secondary">
                  {isConfigured
                    ? 'Dữ liệu được sao lưu và đồng bộ đa thiết bị tự động'
                    : 'Dữ liệu đang được lưu an toàn tại LocalStorage của trình duyệt này'}
                </Text>
              </VStack>
            </HStack>
            {isConfigured ? (
              <Badge label="Đã Kết Nối" variant="success" />
            ) : (
              <Badge label="Offline / Local" variant="neutral" />
            )}
          </HStack>
        </Card>

        {/* Hướng dẫn nhanh 2 bước */}
        <VStack gap={1}>
          <Text weight="semibold">Hướng dẫn lấy thông tin Supabase (Miễn phí):</Text>
          <Text type="supporting" color="secondary">
            1. Vào trang supabase.com tạo project miễn phí.
          </Text>
          <Text type="supporting" color="secondary">
            2. Vào mục Project Settings ➔ API ➔ Copy &quot;Project URL&quot; và &quot;anon public key&quot; dán vào bên dưới.
          </Text>
          <Text type="supporting" color="secondary">
            3. Vào SQL Editor trên Supabase ➔ Dán nội dung file &quot;supabase-schema.sql&quot; trong thư mục dự án và nhấn RUN.
          </Text>
        </VStack>

        <TextInput
          label="Project URL"
          value={url}
          onChange={setUrl}
          placeholder="https://xyzcompany.supabase.co"
        />

        <TextInput
          label="Anon Public Key"
          value={anonKey}
          onChange={setAnonKey}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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
            label="Lưu Cấu Hình & Đồng Bộ"
            variant="primary"
            size="md"
            icon={<Icon icon={CloudIcon} size="sm" />}
            onClick={handleSave}
          />
        </HStack>
      </VStack>
    </Dialog>
  );
}
