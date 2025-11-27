import React from 'react';
import {
  Card,
  Typography,
  Button,
  Space,
  List,
  Tag,
  Tooltip,
  Empty,
  Collapse,
} from 'antd';
import {
  CloseCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

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

interface ExceptionsListProps {
  exceptions: Exception[];
  onEdit: (exception: Exception) => void;
  onDelete: (exceptionId: string) => void;
  onDuplicate: (exception: Exception) => void;
  onAddUnavailable: () => void;
  onAddSpecialHours: () => void;
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
 * List of upcoming schedule exceptions with edit/delete/duplicate
 */
export const ExceptionsList: React.FC<ExceptionsListProps> = ({
  exceptions,
  onEdit,
  onDelete,
  onDuplicate,
  onAddUnavailable,
  onAddSpecialHours,
}) => {
  // Sort exceptions by date (upcoming first)
  const sortedExceptions = [...exceptions].sort((a, b) => {
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);
    return dateA.getTime() - dateB.getTime();
  });

  // Split into upcoming and past
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingExceptions = sortedExceptions.filter((exc) => {
    const excDate = new Date(exc.endDate || exc.startDate);
    return excDate >= today;
  });

  const pastExceptions = sortedExceptions.filter((exc) => {
    const excDate = new Date(exc.endDate || exc.startDate);
    return excDate < today;
  });

  const formatDateRange = (exception: Exception) => {
    const start = exception.startDate;
    const end = exception.endDate;

    const startDate = new Date(start);
    const formatOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    };

    if (end && end !== start) {
      const endDate = new Date(end);
      return `${startDate.toLocaleDateString('en-US', formatOptions)} - ${endDate.toLocaleDateString('en-US', formatOptions)}`;
    }

    return startDate.toLocaleDateString('en-US', formatOptions);
  };

  const formatTimeBlocks = (timeBlocks: TimeBlock[]) => {
    if (!timeBlocks || timeBlocks.length === 0) return '';

    return timeBlocks
      .map((block) => {
        const start = formatTime(block.start);
        const end = formatTime(block.end);
        return `${start} - ${end}`;
      })
      .join(', ');
  };

  const renderException = (exception: Exception, showActions = true) => (
    <List.Item
      key={exception.id}
      style={{ padding: '12px 0' }}
      actions={
        showActions
          ? [
              <Tooltip title="Edit" key="edit">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(exception)}
                  size="small"
                />
              </Tooltip>,
              <Tooltip title="Duplicate" key="duplicate">
                <Button
                  type="text"
                  icon={<CopyOutlined />}
                  onClick={() => onDuplicate(exception)}
                  size="small"
                />
              </Tooltip>,
              <Tooltip title="Delete" key="delete">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => onDelete(exception.id)}
                  size="small"
                />
              </Tooltip>,
            ]
          : undefined
      }
    >
      <List.Item.Meta
        avatar={
          exception.type === 'unavailable' ? (
            <CloseCircleOutlined style={{ fontSize: 20, color: '#ff4d4f' }} />
          ) : (
            <ClockCircleOutlined style={{ fontSize: 20, color: '#1890ff' }} />
          )
        }
        title={
          <Space>
            <Text strong>{formatDateRange(exception)}</Text>
            <Tag color={exception.type === 'unavailable' ? 'red' : 'blue'}>
              {exception.type === 'unavailable' ? 'Closed' : 'Special Hours'}
            </Tag>
          </Space>
        }
        description={
          <Space direction="vertical" size={0}>
            {exception.type === 'special_hours' && exception.timeBlocks && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {formatTimeBlocks(exception.timeBlocks)}
              </Text>
            )}
            {exception.reason && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {exception.reason}
              </Text>
            )}
          </Space>
        }
      />
    </List.Item>
  );

  return (
    <Card
      title={
        <Title level={5} style={{ margin: 0 }}>
          Exceptions & Time Off
        </Title>
      }
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Override your regular schedule for specific dates.
      </Text>

      {/* Add Buttons */}
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<PlusOutlined />}
          onClick={onAddUnavailable}
          style={{
            backgroundColor: '#fff1f0',
            borderColor: '#ffa39e',
            color: '#cf1322',
          }}
        >
          Add Time Off
        </Button>
        <Button
          icon={<PlusOutlined />}
          onClick={onAddSpecialHours}
          style={{
            backgroundColor: '#e6f7ff',
            borderColor: '#91d5ff',
            color: '#0050b3',
          }}
        >
          Add Special Hours
        </Button>
      </Space>

      {/* Upcoming Exceptions */}
      {upcomingExceptions.length > 0 ? (
        <>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Upcoming Exceptions ({upcomingExceptions.length})
          </Text>
          <List
            dataSource={upcomingExceptions}
            renderItem={(item) => renderException(item, true)}
            split={true}
          />
        </>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No upcoming exceptions. Your regular weekly schedule applies."
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Past Exceptions (Collapsible) */}
      {pastExceptions.length > 0 && (
        <Collapse
          ghost
          items={[
            {
              key: 'past',
              label: (
                <Text type="secondary">
                  Past Exceptions ({pastExceptions.length})
                </Text>
              ),
              children: (
                <List
                  size="small"
                  dataSource={pastExceptions}
                  renderItem={(item) => (
                    <List.Item key={item.id} style={{ padding: '4px 0' }}>
                      <Space>
                        {item.type === 'unavailable' ? (
                          <CloseCircleOutlined
                            style={{ fontSize: 14, color: '#ff4d4f' }}
                          />
                        ) : (
                          <ClockCircleOutlined
                            style={{ fontSize: 14, color: '#1890ff' }}
                          />
                        )}
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {formatDateRange(item)}
                          {item.reason && ` - ${item.reason}`}
                        </Text>
                      </Space>
                    </List.Item>
                  )}
                />
              ),
            },
          ]}
        />
      )}
    </Card>
  );
};
