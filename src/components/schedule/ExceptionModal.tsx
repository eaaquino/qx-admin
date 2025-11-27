import React, { useState } from 'react';
import {
  Modal,
  Form,
  DatePicker,
  Input,
  Checkbox,
  Button,
  Space,
  Alert,
  Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { TimeBlockInput } from './TimeBlockInput';

const { Text } = Typography;

interface TimeBlock {
  id: string;
  start: string;
  end: string;
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

interface ExceptionModalProps {
  type: 'unavailable' | 'special_hours';
  onClose: () => void;
  onSave: (exception: Exception) => void;
  editMode?: boolean;
  initialData?: Partial<Exception> | null;
}

/**
 * Modal for adding/editing exceptions (unavailable or special hours)
 */
export const ExceptionModal: React.FC<ExceptionModalProps> = ({
  type,
  onClose,
  onSave,
  editMode = false,
  initialData = null,
}) => {
  const [formData, setFormData] = useState(() => {
    if (initialData) {
      return {
        startDate: initialData.startDate || '',
        endDate: initialData.endDate || '',
        reason: initialData.reason || '',
        showReasonToPatients: initialData.showReasonToPatients || false,
        timeBlocks:
          initialData.timeBlocks && initialData.timeBlocks.length > 0
            ? initialData.timeBlocks
            : [{ id: crypto.randomUUID(), start: '', end: '' }],
      };
    }
    return {
      startDate: '',
      endDate: '',
      reason: '',
      showReasonToPatients: false,
      timeBlocks: [{ id: crypto.randomUUID(), start: '', end: '' }],
    };
  });

  const isUnavailable = type === 'unavailable';
  const isSpecialHours = type === 'special_hours';

  const handleSubmit = () => {
    const exception: Exception = {
      id: editMode && initialData?.id ? initialData.id : crypto.randomUUID(),
      type: type,
      startDate: formData.startDate,
      endDate: formData.endDate || formData.startDate,
      reason: formData.reason,
      showReasonToPatients: formData.showReasonToPatients,
      timeBlocks: formData.timeBlocks,
    };

    onSave(exception);
    onClose();
  };

  const handleAddTimeBlock = () => {
    setFormData({
      ...formData,
      timeBlocks: [
        ...formData.timeBlocks,
        { id: crypto.randomUUID(), start: '', end: '' },
      ],
    });
  };

  const handleRemoveTimeBlock = (blockId: string) => {
    setFormData({
      ...formData,
      timeBlocks: formData.timeBlocks.filter((b) => b.id !== blockId),
    });
  };

  const handleTimeBlockChange = (blockId: string, updatedBlock: TimeBlock) => {
    setFormData({
      ...formData,
      timeBlocks: formData.timeBlocks.map((b) =>
        b.id === blockId ? updatedBlock : b
      ),
    });
  };

  const canSubmit =
    formData.startDate &&
    (isUnavailable ||
      (isSpecialHours && formData.timeBlocks.some((b) => b.start && b.end)));

  return (
    <Modal
      title={
        editMode
          ? isUnavailable
            ? 'Edit Time Off'
            : 'Edit Special Hours'
          : isUnavailable
          ? 'Add Time Off'
          : 'Add Special Hours'
      }
      open={true}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit} disabled={!canSubmit}>
          {editMode
            ? 'Update'
            : isUnavailable
            ? 'Mark Unavailable'
            : 'Save Special Hours'}
        </Button>,
      ]}
      width={500}
    >
      <Form layout="vertical">
        {/* Date Selection */}
        {isUnavailable ? (
          <Space style={{ width: '100%' }} direction="vertical" size="small">
            <Space style={{ width: '100%' }}>
              <Form.Item label="From Date" required style={{ marginBottom: 8, flex: 1 }}>
                <DatePicker
                  value={formData.startDate ? dayjs(formData.startDate) : null}
                  onChange={(date) =>
                    setFormData({
                      ...formData,
                      startDate: date ? date.format('YYYY-MM-DD') : '',
                    })
                  }
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item
                label="To Date"
                style={{ marginBottom: 8, flex: 1 }}
                extra="Leave blank for single day"
              >
                <DatePicker
                  value={formData.endDate ? dayjs(formData.endDate) : null}
                  onChange={(date) =>
                    setFormData({
                      ...formData,
                      endDate: date ? date.format('YYYY-MM-DD') : '',
                    })
                  }
                  disabledDate={(current) =>
                    formData.startDate
                      ? current && current < dayjs(formData.startDate)
                      : false
                  }
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Space>
          </Space>
        ) : (
          <Form.Item label="Date" required style={{ marginBottom: 16 }}>
            <DatePicker
              value={formData.startDate ? dayjs(formData.startDate) : null}
              onChange={(date) =>
                setFormData({
                  ...formData,
                  startDate: date ? date.format('YYYY-MM-DD') : '',
                })
              }
              style={{ width: '100%' }}
            />
          </Form.Item>
        )}

        {/* Time Blocks (Special Hours Only) */}
        {isSpecialHours && (
          <Form.Item label="Time Blocks" required style={{ marginBottom: 16 }}>
            {formData.timeBlocks.map((block) => (
              <TimeBlockInput
                key={block.id}
                block={block}
                onChange={(updatedBlock) =>
                  handleTimeBlockChange(block.id, updatedBlock)
                }
                onRemove={() => handleRemoveTimeBlock(block.id)}
                canRemove={formData.timeBlocks.length > 1}
              />
            ))}
            <Button
              type="dashed"
              onClick={handleAddTimeBlock}
              icon={<PlusOutlined />}
              size="small"
              style={{ marginTop: 8 }}
            >
              Add Time Block
            </Button>
          </Form.Item>
        )}

        {/* Reason */}
        <Form.Item label="Reason (Optional)" style={{ marginBottom: 16 }}>
          <Input
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder={
              isUnavailable
                ? 'e.g., Vacation, Holiday'
                : 'e.g., Extended hours for special clinic'
            }
          />
        </Form.Item>

        {/* Show Reason Toggle (Unavailable Only) */}
        {isUnavailable && formData.reason && formData.reason.trim() !== '' && (
          <Form.Item style={{ marginBottom: 16 }}>
            <Checkbox
              checked={formData.showReasonToPatients}
              onChange={(e) =>
                setFormData({ ...formData, showReasonToPatients: e.target.checked })
              }
            >
              <div>
                <Text strong>Show this reason to patients trying to register</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  If unchecked, patients will see a generic "Doctor is unavailable"
                  message
                </Text>
              </div>
            </Checkbox>
          </Form.Item>
        )}

        {/* Info Message */}
        <Alert
          type="info"
          message={
            isUnavailable
              ? "This will block all appointments during the selected period. Patients won't be able to register for these dates."
              : 'This will override your regular weekly schedule for this specific date with custom hours.'
          }
          style={{ marginBottom: 0 }}
        />
      </Form>
    </Modal>
  );
};
