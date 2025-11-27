import React, { useState } from 'react';
import { Card, Typography, Button, Space, Tooltip, Badge } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';

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

interface Exception {
  id: string;
  type: 'unavailable' | 'special_hours';
  startDate: string;
  endDate: string;
  reason: string;
  showReasonToPatients: boolean;
  timeBlocks: TimeBlock[];
}

interface CalendarPreviewProps {
  weeklySchedule: WeeklySchedule;
  exceptions: Exception[];
}

// Helper to format time for display
const formatTime = (timeStr: string) => {
  if (!timeStr) return '--:--';

  const [hours, mins] = timeStr.split(':');
  const h = parseInt(hours);
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const period = h >= 12 ? 'PM' : 'AM';

  return `${hour}:${mins} ${period}`;
};

/**
 * Calendar preview with continuous range highlighting
 * Blue ranges = Available, Red ranges = Exceptions, White = Not available
 */
export const CalendarPreview: React.FC<CalendarPreviewProps> = ({
  weeklySchedule,
  exceptions,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: (Date | null)[] = [];
    const startPadding = firstDay.getDay(); // 0 = Sunday

    // Add padding for days before month starts
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    // Add all days in month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getDateStatus = (date: Date | null) => {
    if (!date) return { type: 'empty' };

    // Format date as YYYY-MM-DD in local timezone (not UTC)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Check exceptions first (higher priority)
    const exception = exceptions.find((exc) => {
      const start = exc.startDate;
      const end = exc.endDate;
      return dateStr >= start && dateStr <= end;
    });

    if (exception) {
      return {
        type: exception.type === 'unavailable' ? 'unavailable' : 'special_hours',
        exception,
      };
    }

    // Check weekly schedule
    const dayNames: (keyof WeeklySchedule)[] = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const dayName = dayNames[date.getDay()];
    const daySchedule = weeklySchedule[dayName];

    if (daySchedule?.enabled && daySchedule.timeBlocks?.length > 0) {
      return { type: 'available', schedule: daySchedule };
    }

    return { type: 'not_available' };
  };

  const getTooltipContent = (date: Date) => {
    const status = getDateStatus(date);

    if (status.type === 'unavailable' && 'exception' in status) {
      return (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
            <CloseCircleOutlined style={{ marginRight: 4, color: '#ff4d4f' }} />
            Unavailable
          </div>
          <div>{status.exception?.reason || 'Time off'}</div>
        </div>
      );
    }

    if (status.type === 'special_hours' && 'exception' in status) {
      return (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
            <ClockCircleOutlined style={{ marginRight: 4, color: '#1890ff' }} />
            Special Hours
          </div>
          {status.exception?.timeBlocks?.map((b: TimeBlock, idx: number) => (
            <div key={idx}>
              {formatTime(b.start)} - {formatTime(b.end)}
            </div>
          ))}
          {status.exception?.reason && (
            <div style={{ fontStyle: 'italic', marginTop: 4 }}>
              {status.exception.reason}
            </div>
          )}
        </div>
      );
    }

    if (status.type === 'available' && 'schedule' in status) {
      return (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
            <ClockCircleOutlined style={{ marginRight: 4, color: '#1890ff' }} />
            Available
          </div>
          {status.schedule?.timeBlocks?.map((b: TimeBlock, idx: number) => (
            <div key={idx}>
              {formatTime(b.start)} - {formatTime(b.end)}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div>
        <MinusCircleOutlined style={{ marginRight: 4, color: '#999' }} />
        Not Available
      </div>
    );
  };

  const getDayStyle = (date: Date | null) => {
    if (!date) return {};

    const status = getDateStatus(date);
    const isToday = date.toDateString() === new Date().toDateString();

    let backgroundColor = 'transparent';
    let borderColor = 'transparent';
    let color = '#333';

    if (status.type === 'available') {
      backgroundColor = '#e6f7ff';
      borderColor = '#91d5ff';
    } else if (status.type === 'special_hours') {
      backgroundColor = '#bae7ff';
      borderColor = '#69c0ff';
    } else if (status.type === 'unavailable') {
      backgroundColor = '#fff1f0';
      borderColor = '#ffa39e';
    }

    return {
      backgroundColor,
      border: `1px solid ${borderColor}`,
      color,
      fontWeight: isToday ? 'bold' : 'normal',
      boxShadow: isToday ? '0 0 0 2px #1890ff' : undefined,
    };
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <Card
      title={
        <Title level={5} style={{ margin: 0 }}>
          Schedule Preview
        </Title>
      }
      extra={
        <Space>
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={goToPreviousMonth}
            size="small"
          />
          <Text strong>
            {currentMonth.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </Text>
          <Button
            type="text"
            icon={<RightOutlined />}
            onClick={goToNextMonth}
            size="small"
          />
        </Space>
      }
    >
      {/* Legend */}
      <Space style={{ marginBottom: 12 }}>
        <Badge color="#e6f7ff" text="Available" />
        <Badge color="#bae7ff" text="Special Hours" />
        <Badge color="#fff1f0" text="Unavailable" />
      </Space>

      {/* Calendar Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 2,
        }}
      >
        {/* Day headers */}
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, idx) => (
          <div
            key={idx}
            style={{
              textAlign: 'center',
              padding: '8px 0',
              fontWeight: 'bold',
              color: '#666',
              fontSize: 12,
            }}
          >
            {day}
          </div>
        ))}

        {/* Date cells */}
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} style={{ height: 32 }} />;
          }

          return (
            <Tooltip key={date.toISOString()} title={getTooltipContent(date)}>
              <div
                style={{
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  borderRadius: 4,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  ...getDayStyle(date),
                }}
              >
                {date.getDate()}
              </div>
            </Tooltip>
          );
        })}
      </div>
    </Card>
  );
};
