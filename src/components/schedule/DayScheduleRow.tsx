import React, { useState } from 'react';
import {
  Card,
  Checkbox,
  Typography,
  Button,
  Dropdown,
  InputNumber,
  Tooltip,
  Space,
  Alert,
} from 'antd';
import {
  MoreOutlined,
  PlusOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { TimeBlockInput } from './TimeBlockInput';

const { Text, Title } = Typography;

interface TimeBlock {
  id: string;
  start: string;
  end: string;
}

interface DaySchedule {
  enabled: boolean;
  timeBlocks: TimeBlock[];
  earlyRegistrationWindow: number;
}

interface Warning {
  day?: string;
  blockId?: string;
  type: string;
  severity: 'error' | 'warning';
  message: string;
}

interface DayScheduleRowProps {
  day: string;
  dayLabel: string;
  daySchedule: DaySchedule;
  onChange: (daySchedule: DaySchedule) => void;
  warnings?: Warning[];
  onCopyTo: (day: string) => void;
  onCopyFrom: (day: string) => void;
}

/**
 * Single day schedule row with multiple time blocks
 * Example: Monday with blocks [9-12, 2-5]
 */
export const DayScheduleRow: React.FC<DayScheduleRowProps> = ({
  day,
  dayLabel,
  daySchedule,
  onChange,
  warnings = [],
  onCopyTo,
  onCopyFrom,
}) => {
  const { enabled, timeBlocks, earlyRegistrationWindow } = daySchedule;

  const handleToggle = () => {
    onChange({
      ...daySchedule,
      enabled: !enabled,
      // Initialize with one empty block if enabling
      timeBlocks:
        !enabled && timeBlocks.length === 0
          ? [{ id: crypto.randomUUID(), start: '', end: '' }]
          : timeBlocks,
    });
  };

  const handleBlockChange = (blockId: string, updatedBlock: TimeBlock) => {
    onChange({
      ...daySchedule,
      timeBlocks: timeBlocks.map((block) =>
        block.id === blockId ? updatedBlock : block
      ),
    });
  };

  const handleBlockRemove = (blockId: string) => {
    const newBlocks = timeBlocks.filter((block) => block.id !== blockId);
    onChange({
      ...daySchedule,
      timeBlocks: newBlocks,
    });
  };

  const handleAddBlock = () => {
    onChange({
      ...daySchedule,
      timeBlocks: [
        ...timeBlocks,
        { id: crypto.randomUUID(), start: '', end: '' },
      ],
    });
  };

  const handleEarlyRegistrationWindowChange = (value: number | null) => {
    onChange({
      ...daySchedule,
      earlyRegistrationWindow: Math.min(Math.max(value || 0, 0), 3),
    });
  };

  const getBlockWarnings = (blockId: string) => {
    return warnings.filter((w) => w.blockId === blockId);
  };

  const getDayWarnings = () => {
    return warnings.filter((w) => !w.blockId);
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'copyTo',
      label: 'Copy time blocks to...',
      onClick: () => onCopyTo(day),
    },
    {
      key: 'copyFrom',
      label: 'Copy time blocks from...',
      onClick: () => onCopyFrom(day),
    },
  ];

  return (
    <Card
      size="small"
      style={{ marginBottom: 12 }}
      styles={{ body: { padding: '12px 16px' } }}
    >
      {/* Day Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Space>
          <Checkbox checked={enabled} onChange={handleToggle} />
          <Title level={5} style={{ margin: 0 }}>
            {dayLabel}
          </Title>
        </Space>

        <Space>
          {enabled && timeBlocks.length > 0 && (
            <Dropdown menu={{ items: menuItems }} trigger={['click']}>
              <Button type="text" icon={<MoreOutlined />} />
            </Dropdown>
          )}
          {!enabled && (
            <Text type="secondary" italic>
              Not working on this day
            </Text>
          )}
        </Space>
      </div>

      {/* Time Blocks */}
      {enabled && (
        <div style={{ marginTop: 12, paddingLeft: 24 }}>
          {timeBlocks.length === 0 ? (
            <Text type="secondary" italic style={{ marginBottom: 8, display: 'block' }}>
              No time blocks. Click "Add Time Block" to set availability.
            </Text>
          ) : (
            timeBlocks.map((block) => {
              const blockWarnings = getBlockWarnings(block.id);
              const error = blockWarnings.find((w) => w.severity === 'error');
              const warning = blockWarnings.find((w) => w.severity === 'warning');

              return (
                <TimeBlockInput
                  key={block.id}
                  block={block}
                  onChange={(updatedBlock) =>
                    handleBlockChange(block.id, updatedBlock)
                  }
                  onRemove={() => handleBlockRemove(block.id)}
                  canRemove={timeBlocks.length > 1}
                  error={error?.message}
                  warning={warning?.message}
                />
              );
            })
          )}

          {/* Add Block Button */}
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleAddBlock}
            style={{ marginTop: 8 }}
            size="small"
          >
            Add Time Block
          </Button>

          {/* Early Registration Window */}
          {timeBlocks.length > 0 && (
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Space>
                <Text strong>Early Registration Window</Text>
                <Tooltip
                  title={
                    <>
                      <p style={{ marginBottom: 8 }}>
                        You may set this to allow early patient queueing even before
                        the clinic opens.
                      </p>
                      <p>
                        Example: If your first block starts at 9:00 AM, setting this
                        to 1 hour means patients can register by 8:00 AM
                      </p>
                    </>
                  }
                >
                  <InfoCircleOutlined style={{ color: '#999', cursor: 'help' }} />
                </Tooltip>
              </Space>
              <Space>
                <InputNumber
                  min={0}
                  max={3}
                  step={1}
                  value={earlyRegistrationWindow || 0}
                  onChange={handleEarlyRegistrationWindowChange}
                  style={{ width: 80 }}
                />
                <Text type="secondary">hours</Text>
              </Space>
            </div>
          )}

          {/* Day-level warnings */}
          {getDayWarnings().map((warn, idx) => (
            <Alert
              key={idx}
              message={warn.message}
              type={warn.severity === 'error' ? 'error' : 'warning'}
              showIcon
              icon={<WarningOutlined />}
              style={{ marginTop: 8 }}
            />
          ))}
        </div>
      )}
    </Card>
  );
};
