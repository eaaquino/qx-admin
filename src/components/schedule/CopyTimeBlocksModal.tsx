import React, { useState } from 'react';
import { Modal, Typography, Radio, Checkbox, Space, Alert, Card, Tag, theme } from 'antd';

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

interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface CopyTimeBlocksModalProps {
  mode: 'to' | 'from';
  sourceDay: string;
  sourceDayLabel: string;
  weeklySchedule: WeeklySchedule;
  onClose: () => void;
  onApply: (updates: Partial<WeeklySchedule>) => void;
}

/**
 * Modal for copying time blocks to/from other days
 */
export const CopyTimeBlocksModal: React.FC<CopyTimeBlocksModalProps> = ({
  mode,
  sourceDay,
  sourceDayLabel,
  weeklySchedule,
  onClose,
  onApply,
}) => {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const { token } = theme.useToken();

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ];

  // For 'from' mode, only allow single selection
  const isCopyFrom = mode === 'from';

  const handleToggleDay = (dayKey: string) => {
    if (dayKey === sourceDay) return; // Can't select source day

    if (isCopyFrom) {
      // Single selection for "copy from"
      setSelectedDays([dayKey]);
    } else {
      // Multiple selection for "copy to"
      setSelectedDays((prev) =>
        prev.includes(dayKey)
          ? prev.filter((d) => d !== dayKey)
          : [...prev, dayKey]
      );
    }
  };

  const handleApply = () => {
    if (isCopyFrom && selectedDays.length === 1) {
      // Copy FROM the selected day TO the source day
      const fromDay = selectedDays[0] as keyof WeeklySchedule;
      const updates: Partial<WeeklySchedule> = {
        [sourceDay]: {
          enabled: weeklySchedule[fromDay].enabled,
          timeBlocks: weeklySchedule[fromDay].timeBlocks.map((block) => ({
            ...block,
            id: crypto.randomUUID(), // New IDs for copied blocks
          })),
          earlyRegistrationWindow:
            weeklySchedule[fromDay].earlyRegistrationWindow || 0,
        },
      };
      onApply(updates);
    } else {
      // Copy TO the selected days FROM the source day
      const updates: Partial<WeeklySchedule> = {};
      const sourceDayKey = sourceDay as keyof WeeklySchedule;
      selectedDays.forEach((day) => {
        (updates as any)[day] = {
          enabled: weeklySchedule[sourceDayKey].enabled,
          timeBlocks: weeklySchedule[sourceDayKey].timeBlocks.map((block) => ({
            ...block,
            id: crypto.randomUUID(), // New IDs for copied blocks
          })),
          earlyRegistrationWindow:
            weeklySchedule[sourceDayKey].earlyRegistrationWindow || 0,
        };
      });
      onApply(updates);
    }
    onClose();
  };

  const canApply = selectedDays.length > 0;

  return (
    <Modal
      title={
        <Title level={4}>
          {isCopyFrom
            ? `Copy Time Blocks to ${sourceDayLabel}`
            : `Copy ${sourceDayLabel} Time Blocks`}
        </Title>
      }
      open={true}
      onCancel={onClose}
      onOk={handleApply}
      okText={isCopyFrom ? `Copy to ${sourceDayLabel}` : 'Apply to Selected'}
      okButtonProps={{ disabled: !canApply }}
      width={450}
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        {isCopyFrom
          ? `Select which day's time blocks to copy to ${sourceDayLabel}:`
          : `Select which days to copy ${sourceDayLabel}'s time blocks to:`}
      </Text>

      {/* Day Selection */}
      <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
        {days.map((day) => {
          const isSource = day.key === sourceDay;
          const isSelected = selectedDays.includes(day.key);
          const dayKey = day.key as keyof WeeklySchedule;
          const hasTimeBlocks = weeklySchedule[dayKey]?.timeBlocks?.length > 0;

          return (
            <Card
              key={day.key}
              size="small"
              style={{
                cursor: isSource ? 'not-allowed' : 'pointer',
                opacity: isSource ? 0.5 : 1,
                borderColor: isSelected ? token.colorPrimary : undefined,
                backgroundColor: isSelected ? token.colorPrimaryBg : isSource ? token.colorBgContainerDisabled : undefined,
              }}
              onClick={() => !isSource && handleToggleDay(day.key)}
              styles={{ body: { padding: '8px 12px' } }}
            >
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space>
                  {isCopyFrom ? (
                    <Radio
                      checked={isSelected}
                      disabled={isSource}
                      onChange={() => handleToggleDay(day.key)}
                    />
                  ) : (
                    <Checkbox
                      checked={isSelected}
                      disabled={isSource}
                      onChange={() => handleToggleDay(day.key)}
                    />
                  )}
                  <Text strong>{day.label}</Text>
                </Space>
                {isSource && <Tag color="blue">Source</Tag>}
                {!isSource && hasTimeBlocks && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {weeklySchedule[dayKey].timeBlocks.length} block
                    {weeklySchedule[dayKey].timeBlocks.length !== 1 ? 's' : ''}
                  </Text>
                )}
              </Space>
            </Card>
          );
        })}
      </Space>

      {/* Warning */}
      {selectedDays.length > 0 && !isCopyFrom && (
        <Alert
          type="warning"
          message="This will replace existing time blocks on the selected days."
          showIcon
        />
      )}
    </Modal>
  );
};
