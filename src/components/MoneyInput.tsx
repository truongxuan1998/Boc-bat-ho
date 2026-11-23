'use client';

import React from 'react';
import { TextInput } from '@astryxdesign/core/TextInput';
import { InputGroup, InputGroupText } from '@astryxdesign/core/InputGroup';
import { formatNumber, parseDigits } from '@/lib/format';

interface MoneyInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  description?: string;
}

// Ô nhập số tiền: tự thêm dấu chấm hàng nghìn, đơn vị ₫
export function MoneyInput({ label, value, onChange, placeholder, description }: MoneyInputProps) {
  return (
    <InputGroup label={label} description={description}>
      <TextInput
        label={label}
        isLabelHidden
        value={formatNumber(value)}
        onChange={(val) => onChange(parseDigits(val))}
        placeholder={placeholder}
        inputMode="numeric"
        width="100%"
      />
      <InputGroupText>₫</InputGroupText>
    </InputGroup>
  );
}
