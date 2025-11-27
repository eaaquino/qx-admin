import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Button, Typography, Alert, Space, theme } from 'antd';
import {
  WarningOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { CalendarPreview } from './CalendarPreview';
import { PresetTemplates } from './PresetTemplates';
import { DayScheduleRow } from './DayScheduleRow';
import { ExceptionsList } from './ExceptionsList';
import { ExceptionModal } from './ExceptionModal';
import { CopyTimeBlocksModal } from './CopyTimeBlocksModal';

const { Title, Text } = Typography;

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

interface Warning {
  day?: string;
  blockId?: string;
  type: string;
  severity: 'error' | 'warning';
  message: string;
  label?: string;
  exceptionId?: string;
}

interface ScheduleData {
  weeklySchedule: WeeklySchedule;
  exceptions: Exception[];
}

interface ScheduleWidgetProps {
  onChange?: (data: ScheduleData) => void;
  onSave?: (data: ScheduleData) => void;
  initialSchedule?: WeeklySchedule | null;
  initialExceptions?: Exception[];
  saveButtonText?: string;
  showSaveButton?: boolean;
}

const defaultSchedule: WeeklySchedule = {
  monday: { enabled: false, timeBlocks: [], earlyRegistrationWindow: 0 },
  tuesday: { enabled: false, timeBlocks: [], earlyRegistrationWindow: 0 },
  wednesday: { enabled: false, timeBlocks: [], earlyRegistrationWindow: 0 },
  thursday: { enabled: false, timeBlocks: [], earlyRegistrationWindow: 0 },
  friday: { enabled: false, timeBlocks: [], earlyRegistrationWindow: 0 },
  saturday: { enabled: false, timeBlocks: [], earlyRegistrationWindow: 0 },
  sunday: { enabled: false, timeBlocks: [], earlyRegistrationWindow: 0 },
};

/**
 * Complete schedule management widget
 * Features:
 * - Multiple time blocks per day (e.g., 9-12, 2-5)
 * - Per-day non-uniform schedules
 * - Quick preset templates (modal popup)
 * - Per-day context menu for copy to/from operations
 * - Calendar preview with continuous range highlighting
 * - Exception management with edit capability (unavailable, special hours)
 * - Non-blocking validation warnings (always visible in sidebar)
 * - Sticky save button at bottom
 */
export const ScheduleWidget: React.FC<ScheduleWidgetProps> = ({
  onChange,
  onSave,
  initialSchedule = null,
  initialExceptions = [],
  saveButtonText = 'Save Schedule',
  showSaveButton = true,
}) => {
  const { token } = theme.useToken();

  // Weekly schedule state - initialize from props
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(
    () => initialSchedule || defaultSchedule
  );

  // Exceptions state - initialize from props
  const [exceptions, setExceptions] = useState<Exception[]>(
    () => initialExceptions || []
  );

  // UI state
  const [exceptionModal, setExceptionModal] = useState<
    'unavailable' | 'special_hours' | null
  >(null);
  const [editingException, setEditingException] = useState<Exception | null>(null);
  const [exceptionInitialData, setExceptionInitialData] = useState<Exception | null>(
    null
  );
  const [showPresetTemplates, setShowPresetTemplates] = useState(false);
  const [copyModal, setCopyModal] = useState<{
    mode: 'to' | 'from';
    sourceDay: string;
  } | null>(null);

  // Track first render to skip initial onChange call
  const isInitialMount = useRef(true);

  // Notify parent of changes (skip on initial mount only)
  useEffect(() => {
    // Skip the very first call on mount to avoid overwriting parent's loaded data
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Call onChange for all subsequent changes (user edits)
    if (onChange) {
      onChange({ weeklySchedule, exceptions });
    }
  }, [weeklySchedule, exceptions]);

  // Helper functions
  const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const checkOverlap = (block1: TimeBlock, block2: TimeBlock) => {
    const timeToMinutes = (timeStr: string) => {
      if (!timeStr) return 0;
      const [hours, mins] = timeStr.split(':').map(Number);
      return hours * 60 + mins;
    };

    const start1 = timeToMinutes(block1.start);
    const end1 = timeToMinutes(block1.end);
    const start2 = timeToMinutes(block2.start);
    const end2 = timeToMinutes(block2.end);

    return start1 < end2 && start2 < end1;
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '--:--';

    const [hours, mins] = timeStr.split(':');
    const h = parseInt(hours);
    const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const period = h >= 12 ? 'PM' : 'AM';

    return `${hour}:${mins} ${period}`;
  };

  const calculateEarlyStartTime = (timeStr: string, hoursEarly: number) => {
    if (!timeStr || !hoursEarly) return timeStr;

    const [hours, minutes] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes - hoursEarly * 60;

    if (totalMinutes < 0) {
      const adjustedMinutes = 1440 + totalMinutes;
      const newHours = Math.floor(adjustedMinutes / 60);
      const newMinutes = adjustedMinutes % 60;
      return `${newHours.toString().padStart(2, '0')}:${newMinutes
        .toString()
        .padStart(2, '0')} (previous day)`;
    }

    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;

    return `${newHours.toString().padStart(2, '0')}:${newMinutes
      .toString()
      .padStart(2, '0')}`;
  };

  // Validation (non-blocking)
  const validateSchedule = (): Warning[] => {
    const warnings: Warning[] = [];

    Object.entries(weeklySchedule).forEach(([day, config]) => {
      if (!config.enabled) return;

      // Check if enabled but empty
      if (config.timeBlocks.length === 0) {
        warnings.push({
          day,
          type: 'empty',
          severity: 'warning',
          message: `${capitalize(day)} is enabled but has no time blocks`,
        });
        return;
      }

      // Check each time block
      config.timeBlocks.forEach((block: TimeBlock) => {
        // Invalid range
        if (block.start && block.end && block.end <= block.start) {
          warnings.push({
            day,
            blockId: block.id,
            type: 'invalid_range',
            severity: 'error',
            message: 'End time must be after start time',
          });
        }

        // Missing times
        if (!block.start || !block.end) {
          warnings.push({
            day,
            blockId: block.id,
            type: 'incomplete',
            severity: 'warning',
            message: 'Time block is incomplete',
          });
        }

        // Check overlaps with other blocks
        config.timeBlocks.forEach((otherBlock: TimeBlock) => {
          if (block.id === otherBlock.id) return;
          if (
            !block.start ||
            !block.end ||
            !otherBlock.start ||
            !otherBlock.end
          )
            return;

          const overlap = checkOverlap(block, otherBlock);
          if (overlap) {
            warnings.push({
              day,
              blockId: block.id,
              type: 'overlap',
              severity: 'warning',
              message: `Overlaps with ${formatTime(otherBlock.start)} - ${formatTime(
                otherBlock.end
              )}`,
            });
          }
        });
      });

      // Check early registration window overflow
      if (config.earlyRegistrationWindow > 0 && config.timeBlocks.length > 0) {
        const earliestBlock = config.timeBlocks.reduce(
          (earliest: TimeBlock | null, block: TimeBlock) => {
            if (!block.start) return earliest;
            if (!earliest || block.start < earliest.start) return block;
            return earliest;
          },
          null as TimeBlock | null
        );

        if (earliestBlock && earliestBlock.start) {
          const [hours, minutes] = earliestBlock.start.split(':').map(Number);
          const totalMinutes = hours * 60 + minutes;
          const earlyWindowMinutes = config.earlyRegistrationWindow * 60;

          if (totalMinutes < earlyWindowMinutes) {
            const effectiveStartTime = calculateEarlyStartTime(
              earliestBlock.start,
              config.earlyRegistrationWindow
            );

            warnings.push({
              day,
              type: 'early_window_overflow',
              severity: 'error',
              message: `Early registration window (${config.earlyRegistrationWindow}h) before ${formatTime(
                earliestBlock.start
              )} would start at ${effectiveStartTime} (before midnight). Reduce the window or adjust start time.`,
            });
          }
        }
      }
    });

    // Validate exceptions
    exceptions.forEach((exception, index) => {
      if (!exception.startDate) {
        warnings.push({
          type: 'exception_incomplete',
          severity: 'warning',
          label: 'Missing Date',
          message: `"${exception.reason || 'Unnamed'}" is missing a start date`,
          exceptionId: exception.id,
        });
      }

      if (
        exception.type === 'special_hours' &&
        (!exception.timeBlocks || exception.timeBlocks.length === 0)
      ) {
        warnings.push({
          type: 'exception_incomplete',
          severity: 'warning',
          label: 'Missing Time Blocks',
          message: `"${exception.reason || 'Unnamed'}" has no time blocks`,
          exceptionId: exception.id,
        });
      }

      // Check overlapping exceptions
      exceptions.forEach((otherException, otherIndex) => {
        if (index >= otherIndex) return;
        if (!exception.startDate || !otherException.startDate) return;

        const start1 = new Date(exception.startDate);
        const end1 = new Date(exception.endDate || exception.startDate);
        const start2 = new Date(otherException.startDate);
        const end2 = new Date(otherException.endDate || otherException.startDate);

        if (start1 <= end2 && start2 <= end1) {
          const formatDateRange = (startDate: string, endDate?: string) => {
            const options: Intl.DateTimeFormatOptions = {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            };
            const start = new Date(startDate).toLocaleDateString('en-US', options);
            const end = new Date(endDate || startDate).toLocaleDateString(
              'en-US',
              options
            );
            return startDate === endDate || !endDate ? start : `${start} - ${end}`;
          };

          const range1 = formatDateRange(exception.startDate, exception.endDate);
          const range2 = formatDateRange(
            otherException.startDate,
            otherException.endDate
          );

          warnings.push({
            type: 'exception_overlap',
            severity: 'warning',
            label: 'Exception Overlap',
            message: `${range1} overlaps with ${range2}`,
            exceptionId: exception.id,
          });
        }
      });
    });

    return warnings;
  };

  const warnings = validateSchedule();

  const handleDayChange = (day: string, daySchedule: DaySchedule) => {
    setWeeklySchedule({
      ...weeklySchedule,
      [day]: daySchedule,
    });
  };

  const handlePresetApply = (presetSchedule: WeeklySchedule) => {
    setWeeklySchedule(presetSchedule);
  };

  const handleSaveException = (exception: Exception) => {
    const existingIndex = exceptions.findIndex((e) => e.id === exception.id);

    if (existingIndex !== -1) {
      setExceptions(
        exceptions.map((e) => (e.id === exception.id ? exception : e))
      );
    } else {
      setExceptions([...exceptions, exception]);
    }
    setEditingException(null);
    setExceptionInitialData(null);
  };

  const handleEditException = (exception: Exception) => {
    setEditingException(exception);
    setExceptionInitialData(exception);
    setExceptionModal(exception.type);
  };

  const handleDuplicateException = (exception: Exception) => {
    const duplicate: Exception = {
      ...exception,
      id: crypto.randomUUID(),
      timeBlocks: exception.timeBlocks?.map((block) => ({
        ...block,
        id: crypto.randomUUID(),
      })) || [],
    };

    setExceptions([...exceptions, duplicate]);
  };

  const handleDeleteException = (exceptionId: string) => {
    setExceptions(exceptions.filter((e) => e.id !== exceptionId));
  };

  const handleCloseModal = () => {
    setExceptionModal(null);
    setEditingException(null);
    setExceptionInitialData(null);
  };

  const handleCopyTo = (sourceDay: string) => {
    setCopyModal({ mode: 'to', sourceDay });
  };

  const handleCopyFrom = (sourceDay: string) => {
    setCopyModal({ mode: 'from', sourceDay });
  };

  const handleApplyCopy = (updates: Partial<WeeklySchedule>) => {
    setWeeklySchedule({
      ...weeklySchedule,
      ...updates,
    });
  };

  const handleSave = () => {
    const hasErrors = warnings.some((w) => w.severity === 'error');
    if (hasErrors) {
      return;
    }

    if (onSave) {
      onSave({ weeklySchedule, exceptions });
    }
  };

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ];

  const hasErrors = warnings.some((w) => w.severity === 'error');
  const hasWarnings = warnings.some((w) => w.severity === 'warning');

  return (
    <>
      <Row gutter={[24, 24]}>
        {/* Left Column - Form */}
        <Col xs={24} lg={14}>
          {/* Weekly Schedule Editor */}
          <Card
            title={
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Title level={5} style={{ margin: 0 }}>
                  Weekly Schedule
                </Title>
                <Button
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  onClick={() => setShowPresetTemplates(true)}
                  size="small"
                >
                  Quick Templates
                </Button>
              </div>
            }
            style={{ marginBottom: 24 }}
          >
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Set the regular weekly availability. This repeats indefinitely until
              changed.
            </Text>

            {days.map((day) => (
              <DayScheduleRow
                key={day.key}
                day={day.key}
                dayLabel={day.label}
                daySchedule={weeklySchedule[day.key as keyof WeeklySchedule]}
                onChange={(updated) => handleDayChange(day.key, updated)}
                warnings={warnings.filter((w) => w.day === day.key)}
                onCopyTo={handleCopyTo}
                onCopyFrom={handleCopyFrom}
              />
            ))}
          </Card>

          {/* Exceptions List */}
          <ExceptionsList
            exceptions={exceptions}
            onEdit={handleEditException}
            onDuplicate={handleDuplicateException}
            onDelete={handleDeleteException}
            onAddUnavailable={() => {
              setEditingException(null);
              setExceptionInitialData(null);
              setExceptionModal('unavailable');
            }}
            onAddSpecialHours={() => {
              setEditingException(null);
              setExceptionInitialData(null);
              setExceptionModal('special_hours');
            }}
          />
        </Col>

        {/* Right Column - Calendar Preview & Warnings */}
        <Col xs={24} lg={10}>
          <div style={{ position: 'sticky', top: 24 }}>
            {/* Validation Warnings */}
            {warnings.length > 0 && (
              <Alert
                type={hasErrors ? 'error' : 'warning'}
                message={
                  <Text strong>
                    {hasErrors ? 'Errors' : 'Warnings'} ({warnings.length})
                  </Text>
                }
                description={
                  <>
                    <ul style={{ paddingLeft: 16, margin: '8px 0' }}>
                      {warnings.map((warning, idx) => (
                        <li
                          key={idx}
                          style={{
                            fontWeight: warning.severity === 'error' ? 'bold' : 'normal',
                          }}
                        >
                          {warning.day ? (
                            <>
                              <strong>{capitalize(warning.day)}:</strong>{' '}
                              {warning.message}
                            </>
                          ) : warning.label ? (
                            <>
                              <strong>{warning.label}:</strong> {warning.message}
                            </>
                          ) : (
                            warning.message
                          )}
                        </li>
                      ))}
                    </ul>
                    <Text
                      type={hasErrors ? 'danger' : 'warning'}
                      style={{ fontSize: 12 }}
                    >
                      {hasErrors
                        ? 'You must fix all errors before you can save.'
                        : 'You can still save, but these may affect bookings.'}
                    </Text>
                  </>
                }
                showIcon
                icon={<WarningOutlined />}
                style={{ marginBottom: 16 }}
              />
            )}

            {/* Calendar Preview */}
            <CalendarPreview
              weeklySchedule={weeklySchedule}
              exceptions={exceptions}
            />
          </div>
        </Col>
      </Row>

      {/* Sticky Save Button */}
      {showSaveButton && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: token.colorBgContainer,
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            padding: '16px 24px',
            marginTop: 24,
            marginLeft: -24,
            marginRight: -24,
            marginBottom: -24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: token.boxShadowSecondary,
          }}
        >
          <Space>
            {hasErrors ? (
              <Text type="danger">
                <WarningOutlined style={{ marginRight: 8 }} />
                {warnings.filter((w) => w.severity === 'error').length} error
                {warnings.filter((w) => w.severity === 'error').length !== 1
                  ? 's'
                  : ''}{' '}
                - fix before saving
              </Text>
            ) : hasWarnings ? (
              <Text type="warning">
                <WarningOutlined style={{ marginRight: 8 }} />
                {warnings.length} warning{warnings.length !== 1 ? 's' : ''} - you can
                still save
              </Text>
            ) : (
              <Text type="success">
                <CheckCircleOutlined style={{ marginRight: 8 }} />
                Schedule looks good
              </Text>
            )}
          </Space>
          <Button
            type="primary"
            size="large"
            onClick={handleSave}
            disabled={hasErrors}
          >
            {saveButtonText}
          </Button>
        </div>
      )}

      {/* Preset Templates Modal */}
      <PresetTemplates
        isOpen={showPresetTemplates}
        onClose={() => setShowPresetTemplates(false)}
        onApplyPreset={handlePresetApply}
      />

      {/* Copy Time Blocks Modal */}
      {copyModal && (
        <CopyTimeBlocksModal
          mode={copyModal.mode}
          sourceDay={copyModal.sourceDay}
          sourceDayLabel={
            days.find((d) => d.key === copyModal.sourceDay)?.label || ''
          }
          weeklySchedule={weeklySchedule}
          onClose={() => setCopyModal(null)}
          onApply={handleApplyCopy}
        />
      )}

      {/* Exception Modal */}
      {exceptionModal && (
        <ExceptionModal
          type={exceptionModal}
          onClose={handleCloseModal}
          onSave={handleSaveException}
          editMode={!!editingException}
          initialData={exceptionInitialData}
        />
      )}
    </>
  );
};
