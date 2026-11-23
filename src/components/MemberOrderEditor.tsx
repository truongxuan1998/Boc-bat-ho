'use client';

import React, { useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Token } from '@astryxdesign/core/Token';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Badge } from '@astryxdesign/core/Badge';
import { Icon } from '@astryxdesign/core/Icon';
import { useToast } from '@astryxdesign/core/Toast';
import { GripVertical, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

interface MemberOrderEditorProps {
  members: string[];
  onChange: (members: string[]) => void;
  minMembers?: number;
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

// Danh sách thành viên theo thứ tự lụm: thêm bằng Enter/dấu phẩy, kéo thả hoặc bấm mũi tên để đổi thứ tự
export function MemberOrderEditor({ members, onChange, minMembers = 2 }: MemberOrderEditorProps) {
  const toast = useToast();
  const [input, setInput] = useState('');
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const addMembers = (raw: string) => {
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    onChange([...members, ...parts]);
    setInput('');
  };

  const removeMember = (idx: number) => {
    if (members.length <= minMembers) {
      toast({ body: `Dây hụi cần tối thiểu ${minMembers} thành viên.`, type: 'error' });
      return;
    }
    onChange(members.filter((_, i) => i !== idx));
  };

  const moveMember = (from: number, direction: -1 | 1) => {
    const to = from + direction;
    if (to < 0 || to >= members.length) return;
    onChange(moveItem(members, from, to));
  };

  const dropOn = (to: number) => {
    if (draggedIdx === null || draggedIdx === to) return;
    onChange(moveItem(members, draggedIdx, to));
    setDraggedIdx(null);
  };

  return (
    <VStack gap={2}>
      <HStack hAlign="between" vAlign="center" wrap="wrap" gap={2}>
        <VStack gap={0.5}>
          <Text weight="semibold">Thứ tự lụm</Text>
          <Text type="supporting" color="secondary">
            Người đầu lụm kỳ 1, người cuối lụm kỳ chót. Kéo thả hoặc bấm ‹ › để đổi chỗ.
          </Text>
        </VStack>
        <Badge label={`${members.length} người`} variant="blue" />
      </HStack>

      <Card variant="muted" padding={3}>
        <VStack gap={3}>
          {members.length === 0 ? (
            <Text color="secondary" type="supporting">
              Chưa có thành viên. Nhập tên ở ô bên dưới rồi nhấn Enter.
            </Text>
          ) : (
            <HStack wrap="wrap" gap={2} vAlign="center">
              {members.map((name, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === members.length - 1;
                return (
                  <HStack
                    key={`${name}-${idx}`}
                    vAlign="center"
                    draggable
                    onDragStart={() => setDraggedIdx(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dropOn(idx)}
                  >
                    <Token
                      icon={<Icon icon={GripVertical} size="xsm" color="secondary" />}
                      label={`${idx + 1}. ${name}`}
                      color={isFirst ? 'yellow' : isLast ? 'green' : 'default'}
                      size="md"
                      endContent={
                        <HStack gap={0.5} vAlign="center">
                          {!isFirst && (
                            <IconButton
                              label={`Chuyển ${name} lên kỳ trước`}
                              icon={<Icon icon={ChevronLeft} size="xsm" />}
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveMember(idx, -1);
                              }}
                            />
                          )}
                          {!isLast && (
                            <IconButton
                              label={`Chuyển ${name} xuống kỳ sau`}
                              icon={<Icon icon={ChevronRight} size="xsm" />}
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveMember(idx, 1);
                              }}
                            />
                          )}
                        </HStack>
                      }
                      onRemove={() => removeMember(idx)}
                    />
                  </HStack>
                );
              })}
            </HStack>
          )}

          <HStack gap={2} vAlign="center" width="100%">
            <StackItem size="fill">
              <TextInput
                label="Thêm thành viên"
                isLabelHidden
                value={input}
                onChange={setInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addMembers(input);
                  }
                }}
                placeholder="Nhập tên rồi nhấn Enter"
                width="100%"
              />
            </StackItem>
            <StackItem size="static">
              <Button
                label="Thêm"
                variant="secondary"
                icon={<Icon icon={Plus} />}
                onClick={() => addMembers(input)}
                isDisabled={!input.trim()}
              />
            </StackItem>
          </HStack>
        </VStack>
      </Card>
    </VStack>
  );
}
