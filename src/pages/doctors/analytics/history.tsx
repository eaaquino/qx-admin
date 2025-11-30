import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { Card, Table, Tag, Button, DatePicker, Select, Input, Space, Row, Col, Statistic } from 'antd';
import { ReloadOutlined, DownloadOutlined, SearchOutlined, CalendarOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import { supabaseClient } from '../../../utility/supabaseClient';
import Tooltip from '../../../components/Tooltip';
import { useNavigation } from '@refinedev/core';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface Patient {
  name: string;
  age: number;
  phone: string;
}

interface QueueEntry {
  id: string;
  status: string;
  reason_for_visit: string;
  check_in_time: string;
  called_time: string | null;
  ongoing_at: string | null;
  completed_time: string | null;
  rating: number | null;
  rating_feedback: string | null;
  patients: Patient;
}

export const DoctorAnalyticsHistory: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { list } = useNavigation();
  const [queueHistory, setQueueHistory] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('day'), dayjs().endOf('day')]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (dateRange && id) {
      fetchQueueHistory();
    }
  }, [dateRange, statusFilter, id]);

  const fetchQueueHistory = async () => {
    if (!id || !dateRange) return;

    setLoading(true);
    try {
      const [startDate, endDate] = dateRange;
      const startDateTime = startDate.startOf('day').toISOString();
      const endDateTime = endDate.endOf('day').toISOString();

      let query = supabaseClient
        .from('queue_entries')
        .select(`
          id,
          status,
          reason_for_visit,
          check_in_time,
          called_time,
          ongoing_at,
          completed_time,
          rating,
          rating_feedback,
          patients(name, age, phone)
        `)
        .eq('doctor_id', id)
        .gte('check_in_time', startDateTime)
        .lte('check_in_time', endDateTime)
        .order('check_in_time', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setQueueHistory((data as any) || []);
    } catch (error) {
      console.error('Error fetching queue history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      waiting: 'orange',
      called: 'blue',
      in_progress: 'cyan',
      completed: 'green',
      cancelled: 'red',
      no_show: 'default'
    };
    return colors[status] || 'default';
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return dayjs(dateString).format('MMM D, YYYY h:mm A');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return dayjs(dateString).format('MMM D, YYYY');
  };

  const calculateWaitingTime = (checkInTime: string | null, ongoingAt: string | null) => {
    if (!checkInTime || !ongoingAt) return { display: 'N/A', tooltip: null };
    const checkIn = dayjs(checkInTime);
    const ongoing = dayjs(ongoingAt);
    const diffMinutes = ongoing.diff(checkIn, 'minute');
    if (diffMinutes < 0) return { display: 'N/A', tooltip: null };

    const tooltip = `Check-in: ${formatDateTime(checkInTime)}\nCalled: ${formatDateTime(ongoingAt)}`;
    return { display: `${diffMinutes} min`, tooltip };
  };

  const calculateConsultationTime = (ongoingAt: string | null, completedTime: string | null) => {
    if (!ongoingAt || !completedTime) return { display: 'N/A', tooltip: null };
    const ongoing = dayjs(ongoingAt);
    const completed = dayjs(completedTime);
    const diffMinutes = completed.diff(ongoing, 'minute');
    if (diffMinutes < 0) return { display: 'N/A', tooltip: null };

    const tooltip = `Called: ${formatDateTime(ongoingAt)}\nCompleted: ${formatDateTime(completedTime)}`;
    return { display: `${diffMinutes} min`, tooltip };
  };

  const handlePresetRange = (preset: string) => {
    const now = dayjs();
    let start: Dayjs;
    let end: Dayjs = now.endOf('day');

    switch (preset) {
      case 'today':
        start = now.startOf('day');
        break;
      case 'yesterday':
        start = now.subtract(1, 'day').startOf('day');
        end = now.subtract(1, 'day').endOf('day');
        break;
      case '7days':
        start = now.subtract(7, 'day').startOf('day');
        break;
      case '30days':
        start = now.subtract(30, 'day').startOf('day');
        break;
      case '1year':
        start = now.subtract(1, 'year').startOf('day');
        break;
      default:
        return;
    }

    setDateRange([start, end]);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Patient Name', 'Age', 'Reason', 'Status', 'Check-in Time', 'Waiting Time', 'Consultation Time', 'Completed Time', 'Rating', 'Feedback'];
    const csvData = filteredHistory.map(entry => [
      formatDate(entry.check_in_time),
      entry.patients?.name || 'Unknown',
      entry.patients?.age || 'N/A',
      entry.reason_for_visit?.replace(/-/g, ' ') || 'N/A',
      entry.status,
      formatDateTime(entry.check_in_time),
      calculateWaitingTime(entry.check_in_time, entry.ongoing_at).display,
      calculateConsultationTime(entry.ongoing_at, entry.completed_time).display,
      formatDateTime(entry.completed_time),
      entry.rating ? `${entry.rating} stars` : 'No Rating',
      entry.rating_feedback || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `queue-history-${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredHistory = queueHistory.filter(entry => {
    if (!searchTerm) return true;
    const patientName = entry.patients?.name?.toLowerCase() || '';
    return patientName.includes(searchTerm.toLowerCase());
  });

  const columns: ColumnsType<QueueEntry> = [
    {
      title: 'Date',
      dataIndex: 'check_in_time',
      key: 'date',
      render: (text) => formatDate(text),
      width: 120,
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.patients?.name || 'Unknown'}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.patients?.age ? `${record.patients.age}y` : 'N/A'}
          </div>
        </div>
      ),
      width: 150,
    },
    {
      title: 'Reason',
      dataIndex: 'reason_for_visit',
      key: 'reason',
      render: (text) => text?.replace(/-/g, ' ') || 'N/A',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
      width: 120,
    },
    {
      title: 'Wait Time',
      key: 'waitTime',
      render: (_, record) => {
        const { display, tooltip } = calculateWaitingTime(record.check_in_time, record.ongoing_at);
        return <Tooltip content={tooltip}>{display}</Tooltip>;
      },
      width: 100,
    },
    {
      title: 'Consult Time',
      key: 'consultTime',
      render: (_, record) => {
        const { display, tooltip } = calculateConsultationTime(record.ongoing_at, record.completed_time);
        return <Tooltip content={tooltip}>{display}</Tooltip>;
      },
      width: 120,
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating, record) => (
        <div>
          {rating ? (
            <div>
              <div>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    style={{
                      color: star <= rating ? '#fadb14' : '#d9d9d9',
                      fontSize: '14px'
                    }}
                  >
                    ★
                  </span>
                ))}
                <span style={{ fontSize: '12px', color: '#666', marginLeft: '4px' }}>({rating})</span>
              </div>
              {record.rating_feedback && (
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', maxWidth: '200px' }} title={record.rating_feedback}>
                  "{record.rating_feedback.length > 30 ? record.rating_feedback.substring(0, 30) + '...' : record.rating_feedback}"
                </div>
              )}
            </div>
          ) : (
            <span style={{ fontSize: '12px', color: '#999', fontStyle: 'italic' }}>No Rating</span>
          )}
        </div>
      ),
      width: 180,
    },
    {
      title: 'Check-in',
      dataIndex: 'check_in_time',
      key: 'checkIn',
      render: (text) => <span style={{ fontSize: '12px' }}>{formatDateTime(text)}</span>,
      width: 160,
    },
    {
      title: 'Completed',
      dataIndex: 'completed_time',
      key: 'completed',
      render: (text) => <span style={{ fontSize: '12px' }}>{formatDateTime(text)}</span>,
      width: 160,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Queue History</h1>
          <p style={{ color: '#666' }}>View and manage historical patient queue data</p>
        </div>
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={exportToCSV}
            disabled={filteredHistory.length === 0}
          >
            Export CSV
          </Button>
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={fetchQueueHistory}
            loading={loading}
          >
            Refresh
          </Button>
          <Button onClick={() => list('doctors')}>
            Back to Doctors
          </Button>
        </Space>
      </div>

      {/* Preset Buttons */}
      <Card style={{ marginBottom: '16px' }}>
        <Space wrap>
          <Button onClick={() => handlePresetRange('today')}>Today</Button>
          <Button onClick={() => handlePresetRange('yesterday')}>Yesterday</Button>
          <Button onClick={() => handlePresetRange('7days')}>7 Days</Button>
          <Button onClick={() => handlePresetRange('30days')}>30 Days</Button>
          <Button onClick={() => handlePresetRange('1year')}>1 Year</Button>
        </Space>
      </Card>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <div style={{ marginBottom: '8px', fontWeight: 500 }}>
              <CalendarOutlined style={{ marginRight: '8px' }} />
              Date Range
            </div>
            <RangePicker
              value={dateRange}
              onChange={(dates) => dates && setDateRange(dates as [Dayjs, Dayjs])}
              format="YYYY-MM-DD"
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <div style={{ marginBottom: '8px', fontWeight: 500 }}>Status</div>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">All Status</Option>
              <Option value="completed">Completed</Option>
              <Option value="cancelled">Cancelled</Option>
              <Option value="no_show">No Show</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <div style={{ marginBottom: '8px', fontWeight: 500 }}>
              <SearchOutlined style={{ marginRight: '8px' }} />
              Search Patient
            </div>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Patient name..."
              allowClear
            />
          </Col>
        </Row>
      </Card>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={8}>
          <Card bordered={false}>
            <Statistic
              title="Total Patients"
              value={filteredHistory.length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false}>
            <Statistic
              title="Completed"
              value={filteredHistory.filter(e => e.status === 'completed').length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false}>
            <Statistic
              title="Cancelled"
              value={filteredHistory.filter(e => e.status === 'cancelled').length}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Queue History Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredHistory}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} entries`,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>
    </div>
  );
};
