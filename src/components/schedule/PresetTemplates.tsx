import React from 'react';
import { Modal, Card, Typography, Row, Col } from 'antd';

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

interface PresetTemplatesProps {
  onApplyPreset: (schedule: WeeklySchedule) => void;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Quick preset templates modal for common schedule patterns
 */
export const PresetTemplates: React.FC<PresetTemplatesProps> = ({
  onApplyPreset,
  isOpen,
  onClose,
}) => {
  const presets = [
    {
      name: 'Mon-Fri (9-5)',
      description: 'Monday to Friday, 9:00 AM - 5:00 PM',
      schedule: {
        monday: {
          enabled: true,
          timeBlocks: [{ id: crypto.randomUUID(), start: '09:00', end: '17:00' }],
          earlyRegistrationWindow: 0,
        },
        tuesday: {
          enabled: true,
          timeBlocks: [{ id: crypto.randomUUID(), start: '09:00', end: '17:00' }],
          earlyRegistrationWindow: 0,
        },
        wednesday: {
          enabled: true,
          timeBlocks: [{ id: crypto.randomUUID(), start: '09:00', end: '17:00' }],
          earlyRegistrationWindow: 0,
        },
        thursday: {
          enabled: true,
          timeBlocks: [{ id: crypto.randomUUID(), start: '09:00', end: '17:00' }],
          earlyRegistrationWindow: 0,
        },
        friday: {
          enabled: true,
          timeBlocks: [{ id: crypto.randomUUID(), start: '09:00', end: '17:00' }],
          earlyRegistrationWindow: 0,
        },
        saturday: { enabled: false, timeBlocks: [], earlyRegistrationWindow: 0 },
        sunday: { enabled: false, timeBlocks: [], earlyRegistrationWindow: 0 },
      },
    },
    {
      name: 'Mon-Fri (Split)',
      description: 'Monday to Friday, 9-12 & 2-5 (lunch break)',
      schedule: {
        monday: {
          enabled: true,
          timeBlocks: [
            { id: crypto.randomUUID(), start: '09:00', end: '12:00' },
            { id: crypto.randomUUID(), start: '14:00', end: '17:00' },
          ],
          earlyRegistrationWindow: 0,
        },
        tuesday: {
          enabled: true,
          timeBlocks: [
            { id: crypto.randomUUID(), start: '09:00', end: '12:00' },
            { id: crypto.randomUUID(), start: '14:00', end: '17:00' },
          ],
          earlyRegistrationWindow: 0,
        },
        wednesday: {
          enabled: true,
          timeBlocks: [
            { id: crypto.randomUUID(), start: '09:00', end: '12:00' },
            { id: crypto.randomUUID(), start: '14:00', end: '17:00' },
          ],
          earlyRegistrationWindow: 0,
        },
        thursday: {
          enabled: true,
          timeBlocks: [
            { id: crypto.randomUUID(), start: '09:00', end: '12:00' },
            { id: crypto.randomUUID(), start: '14:00', end: '17:00' },
          ],
          earlyRegistrationWindow: 0,
        },
        friday: {
          enabled: true,
          timeBlocks: [
            { id: crypto.randomUUID(), start: '09:00', end: '12:00' },
            { id: crypto.randomUUID(), start: '14:00', end: '17:00' },
          ],
          earlyRegistrationWindow: 0,
        },
        saturday: { enabled: false, timeBlocks: [], earlyRegistrationWindow: 0 },
        sunday: { enabled: false, timeBlocks: [], earlyRegistrationWindow: 0 },
      },
    },
    {
      name: 'Weekends Only',
      description: 'Saturday and Sunday, 9:00 AM - 5:00 PM',
      schedule: {
        monday: { enabled: false, timeBlocks: [], earlyRegistrationWindow: 0 },
        tuesday: { enabled: false, timeBlocks: [], earlyRegistrationWindow: 0 },
        wednesday: { enabled: false, timeBlocks: [], earlyRegistrationWindow: 0 },
        thursday: { enabled: false, timeBlocks: [], earlyRegistrationWindow: 0 },
        friday: { enabled: false, timeBlocks: [], earlyRegistrationWindow: 0 },
        saturday: {
          enabled: true,
          timeBlocks: [{ id: crypto.randomUUID(), start: '09:00', end: '17:00' }],
          earlyRegistrationWindow: 0,
        },
        sunday: {
          enabled: true,
          timeBlocks: [{ id: crypto.randomUUID(), start: '09:00', end: '17:00' }],
          earlyRegistrationWindow: 0,
        },
      },
    },
    {
      name: 'Every Day',
      description: 'All 7 days, 9:00 AM - 5:00 PM',
      schedule: {
        monday: {
          enabled: true,
          timeBlocks: [{ id: crypto.randomUUID(), start: '09:00', end: '17:00' }],
          earlyRegistrationWindow: 0,
        },
        tuesday: {
          enabled: true,
          timeBlocks: [{ id: crypto.randomUUID(), start: '09:00', end: '17:00' }],
          earlyRegistrationWindow: 0,
        },
        wednesday: {
          enabled: true,
          timeBlocks: [{ id: crypto.randomUUID(), start: '09:00', end: '17:00' }],
          earlyRegistrationWindow: 0,
        },
        thursday: {
          enabled: true,
          timeBlocks: [{ id: crypto.randomUUID(), start: '09:00', end: '17:00' }],
          earlyRegistrationWindow: 0,
        },
        friday: {
          enabled: true,
          timeBlocks: [{ id: crypto.randomUUID(), start: '09:00', end: '17:00' }],
          earlyRegistrationWindow: 0,
        },
        saturday: {
          enabled: true,
          timeBlocks: [{ id: crypto.randomUUID(), start: '09:00', end: '17:00' }],
          earlyRegistrationWindow: 0,
        },
        sunday: {
          enabled: true,
          timeBlocks: [{ id: crypto.randomUUID(), start: '09:00', end: '17:00' }],
          earlyRegistrationWindow: 0,
        },
      },
    },
  ];

  const handleApplyPreset = (schedule: WeeklySchedule) => {
    onApplyPreset(schedule);
    onClose();
  };

  return (
    <Modal
      title={<Title level={4}>Quick Templates</Title>}
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Start with a common schedule pattern, then customize as needed.
      </Text>

      <Row gutter={[16, 16]}>
        {presets.map((preset) => (
          <Col xs={24} sm={12} key={preset.name}>
            <Card
              hoverable
              onClick={() => handleApplyPreset(preset.schedule)}
              style={{ cursor: 'pointer' }}
              styles={{ body: { padding: 16 } }}
            >
              <Text strong style={{ display: 'block', marginBottom: 4 }}>
                {preset.name}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {preset.description}
              </Text>
            </Card>
          </Col>
        ))}
      </Row>
    </Modal>
  );
};
