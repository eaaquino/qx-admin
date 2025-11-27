import React from 'react';
import { Select, Button, Space, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface TimeBlock {
  id: string;
  start: string;
  end: string;
}

interface TimeBlockInputProps {
  block: TimeBlock;
  onChange: (block: TimeBlock) => void;
  onRemove: () => void;
  canRemove?: boolean;
  error?: string | null;
  warning?: string | null;
}

/**
 * Individual time block input (e.g., 9:00 AM - 5:00 PM)
 * Used within DayScheduleRow for multiple blocks per day
 */
export const TimeBlockInput: React.FC<TimeBlockInputProps> = ({
  block,
  onChange,
  onRemove,
  canRemove = true,
  error = null,
  warning = null,
}) => {
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = ['00', '15', '30', '45'];

  // Parse time string "HH:MM" into components
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hour: '', minute: '00', period: 'AM' };

    const [hoursStr, mins] = timeStr.split(':');
    const h = parseInt(hoursStr);

    return {
      hour: h === 0 ? 12 : h > 12 ? h - 12 : h,
      minute: mins || '00',
      period: h >= 12 ? 'PM' : 'AM',
    };
  };

  // Format time components into "HH:MM" string
  const formatTime = (hour: number | string, minute: string, period: string) => {
    if (!hour) return '';

    let h = typeof hour === 'string' ? parseInt(hour) : hour;
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;

    return `${h.toString().padStart(2, '0')}:${minute || '00'}`;
  };

  const startTime = parseTime(block.start);
  const endTime = parseTime(block.end);

  const handleStartChange = (field: string, value: string | number) => {
    const newStart = { ...startTime, [field]: value };
    onChange({
      ...block,
      start: formatTime(newStart.hour, newStart.minute, newStart.period),
    });
  };

  const handleEndChange = (field: string, value: string | number) => {
    const newEnd = { ...endTime, [field]: value };
    onChange({
      ...block,
      end: formatTime(newEnd.hour, newEnd.minute, newEnd.period),
    });
  };

  const selectStatus = error ? 'error' : warning ? 'warning' : undefined;

  return (
    <div style={{ marginBottom: 8 }}>
      <Space wrap>
        {/* Start Time */}
        <Space.Compact>
          <Select
            value={startTime.hour || undefined}
            onChange={(value) => handleStartChange('hour', value)}
            placeholder="--"
            style={{ width: 70 }}
            status={selectStatus}
          >
            {hours.map((h) => (
              <Select.Option key={h} value={h}>
                {h}
              </Select.Option>
            ))}
          </Select>
          <Select
            value={startTime.minute}
            onChange={(value) => handleStartChange('minute', value)}
            style={{ width: 70 }}
            status={selectStatus}
          >
            {minutes.map((m) => (
              <Select.Option key={m} value={m}>
                {m}
              </Select.Option>
            ))}
          </Select>
          <Select
            value={startTime.period}
            onChange={(value) => handleStartChange('period', value)}
            style={{ width: 70 }}
            status={selectStatus}
          >
            <Select.Option value="AM">AM</Select.Option>
            <Select.Option value="PM">PM</Select.Option>
          </Select>
        </Space.Compact>

        <Text type="secondary">to</Text>

        {/* End Time */}
        <Space.Compact>
          <Select
            value={endTime.hour || undefined}
            onChange={(value) => handleEndChange('hour', value)}
            placeholder="--"
            style={{ width: 70 }}
            status={selectStatus}
          >
            {hours.map((h) => (
              <Select.Option key={h} value={h}>
                {h}
              </Select.Option>
            ))}
          </Select>
          <Select
            value={endTime.minute}
            onChange={(value) => handleEndChange('minute', value)}
            style={{ width: 70 }}
            status={selectStatus}
          >
            {minutes.map((m) => (
              <Select.Option key={m} value={m}>
                {m}
              </Select.Option>
            ))}
          </Select>
          <Select
            value={endTime.period}
            onChange={(value) => handleEndChange('period', value)}
            style={{ width: 70 }}
            status={selectStatus}
          >
            <Select.Option value="AM">AM</Select.Option>
            <Select.Option value="PM">PM</Select.Option>
          </Select>
        </Space.Compact>

        {/* Remove Button */}
        {canRemove && (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={onRemove}
            title="Remove time block"
          />
        )}
      </Space>

      {/* Error/Warning messages */}
      {(error || warning) && (
        <div style={{ marginTop: 4 }}>
          {error && <Text type="danger" style={{ fontSize: 12 }}>{error}</Text>}
          {warning && <Text type="warning" style={{ fontSize: 12 }}>{warning}</Text>}
        </div>
      )}
    </div>
  );
};
