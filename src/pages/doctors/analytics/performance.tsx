import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { Card, Row, Col, Button, DatePicker, Space, Statistic, Spin } from 'antd';
import { ReloadOutlined, CloseCircleOutlined, StopOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { analyticsService, type AnalyticsData } from '../../../services/analyticsService';
import { PeakHoursChart, DemographicsCharts, TimeSeriesChart, MultiTimeSeriesChart } from '../../../components/analytics';
import { useNavigation } from '@refinedev/core';

const { RangePicker } = DatePicker;

export const DoctorAnalyticsPerformance: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { list } = useNavigation();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('day'), dayjs().endOf('day')]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [activePreset, setActivePreset] = useState<string>('today');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dateRange) {
      fetchAnalytics();
    }
  }, [dateRange, id]);

  const fetchAnalytics = async () => {
    if (!dateRange || !id) return;

    setLoading(true);
    setError(null);

    try {
      const [startDate, endDate] = dateRange;
      const response = await analyticsService.getAnalytics({
        doctor_id: id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      if (response.success) {
        setAnalyticsData(response.data);
      } else {
        setError('Failed to load analytics data');
      }
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
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

    setActivePreset(preset);
    setDateRange([start, end]);
  };

  // Check if we should show time series charts (multi-day range)
  const isMultiDayRange = !['today', 'yesterday'].includes(activePreset);
  const showTimeSeries = isMultiDayRange && analyticsData?.time_series;

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
          Analytics Overview
        </h1>
        <p style={{ color: '#666' }}>View queue performance metrics and patient demographics</p>
      </div>

      {/* Preset Buttons and Date Range */}
      <Card style={{ marginBottom: '16px' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <Button onClick={() => handlePresetRange('today')}>Today</Button>
            <Button onClick={() => handlePresetRange('yesterday')}>Yesterday</Button>
            <Button onClick={() => handlePresetRange('7days')}>7 Days</Button>
            <Button onClick={() => handlePresetRange('30days')}>30 Days</Button>
            <Button onClick={() => handlePresetRange('1year')}>1 Year</Button>
          </Space>
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => dates && setDateRange(dates as [Dayjs, Dayjs])}
              format="YYYY-MM-DD"
            />
            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={fetchAnalytics}
              loading={loading}
            >
              Refresh
            </Button>
            <Button onClick={() => list('doctors')}>
              Back to Doctors
            </Button>
          </Space>
        </Space>
      </Card>

      {error && (
        <Card style={{ marginBottom: '16px', borderColor: '#ff4d4f', backgroundColor: '#fff2f0' }}>
          <p style={{ color: '#ff4d4f', margin: 0 }}>{error}</p>
        </Card>
      )}

      {/* Key Metrics - Show as line charts for multi-day ranges */}
      {showTimeSeries ? (
        <>
          {/* Time Series Charts */}
          <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
            <Col xs={24} lg={12}>
              <TimeSeriesChart
                title="Total Patients"
                data={analyticsData?.time_series?.total_patients}
                loading={loading}
                color="#52c41a"
                valueLabel="Patients"
              />
            </Col>
            <Col xs={24} lg={12}>
              <MultiTimeSeriesChart
                title="Cancellations & No-Shows"
                series={[
                  {
                    data: analyticsData?.time_series?.cancelled_count || [],
                    name: "Cancellations",
                    color: "#ff7875",
                  },
                  {
                    data: analyticsData?.time_series?.no_show_count || [],
                    name: "No-Shows",
                    color: "#cf1322",
                  },
                ]}
                loading={loading}
              />
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
            <Col xs={24} lg={12}>
              <TimeSeriesChart
                title="Avg Consultation Time"
                data={analyticsData?.time_series?.avg_consultation_time}
                loading={loading}
                color="#1890ff"
                valueLabel="Minutes"
                valueSuffix=" min"
              />
            </Col>
            <Col xs={24} lg={12}>
              <TimeSeriesChart
                title="Avg Waiting Time"
                data={analyticsData?.time_series?.avg_waiting_time}
                loading={loading}
                color="#faad14"
                valueLabel="Minutes"
                valueSuffix=" min"
              />
            </Col>
          </Row>

          {/* Summary Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={12} sm={6}>
              <Card bordered={false} size="small">
                <Statistic
                  title="Total Patients"
                  value={analyticsData?.total_patients ?? 0}
                  valueStyle={{ fontSize: '18px' }}
                  loading={loading}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card bordered={false} size="small">
                <Statistic
                  title="Avg Consultation"
                  value={analyticsData?.avg_consultation_time ? Math.round(analyticsData.avg_consultation_time) : 0}
                  suffix="min"
                  valueStyle={{ fontSize: '18px' }}
                  loading={loading}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card bordered={false} size="small">
                <Statistic
                  title="Cancellations"
                  value={analyticsData?.cancelled_count ?? 0}
                  prefix={<CloseCircleOutlined />}
                  valueStyle={{ color: '#ff7875', fontSize: '18px' }}
                  loading={loading}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card bordered={false} size="small">
                <Statistic
                  title="Average Rating"
                  value={analyticsData?.avg_rating ? analyticsData.avg_rating.toFixed(1) : 'N/A'}
                  suffix={analyticsData?.avg_rating ? '★' : ''}
                  valueStyle={{ fontSize: '18px' }}
                  loading={loading}
                />
              </Card>
            </Col>
          </Row>
        </>
      ) : (
        <>
          {/* Single Day View - Show as statistic cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false}>
                <Statistic
                  title="Avg Consultation Time"
                  value={analyticsData?.avg_consultation_time ? Math.round(analyticsData.avg_consultation_time) : 0}
                  suffix="min"
                  loading={loading}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false}>
                <Statistic
                  title="Avg Waiting Time"
                  value={analyticsData?.avg_waiting_time ? Math.round(analyticsData.avg_waiting_time) : 0}
                  suffix="min"
                  loading={loading}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false}>
                <Statistic
                  title="Total Patients"
                  value={analyticsData?.total_patients ?? 0}
                  loading={loading}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false}>
                <Statistic
                  title="Average Rating"
                  value={analyticsData?.avg_rating ? analyticsData.avg_rating.toFixed(1) : 'N/A'}
                  suffix={analyticsData?.avg_rating ? '★' : ''}
                  loading={loading}
                />
                {!loading && analyticsData?.rating_count !== undefined && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {analyticsData.rating_count} {analyticsData.rating_count === 1 ? 'rating' : 'ratings'}
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          {/* Second Row - Cancellations and No-Shows */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12}>
              <Card bordered={false}>
                <Statistic
                  title="Cancellations"
                  value={analyticsData?.cancelled_count ?? 0}
                  prefix={<CloseCircleOutlined />}
                  valueStyle={{ color: '#ff7875' }}
                  loading={loading}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card bordered={false}>
                <Statistic
                  title="No-Shows"
                  value={analyticsData?.no_show_count ?? 0}
                  prefix={<StopOutlined />}
                  valueStyle={{ color: '#cf1322' }}
                  loading={loading}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* Rating Distribution */}
      {analyticsData?.rating_distribution && analyticsData.rating_distribution.length > 0 && (
        <Card title="Rating Distribution" bordered={false} style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[5, 4, 3, 2, 1].map((starValue) => {
              const ratingData = analyticsData.rating_distribution.find((r: any) => r.rating === starValue);
              const count = ratingData?.count || 0;
              const total = analyticsData.rating_count || 0;
              const percentage = total > 0 ? (count / total) * 100 : 0;

              return (
                <div key={starValue} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '64px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{starValue}</span>
                    <span style={{ color: '#fadb14' }}>★</span>
                  </div>
                  <div style={{ flex: 1, backgroundColor: '#f0f0f0', borderRadius: '4px', height: '16px', overflow: 'hidden' }}>
                    <div
                      style={{
                        backgroundColor: '#fadb14',
                        height: '100%',
                        borderRadius: '4px',
                        width: `${percentage}%`,
                        transition: 'width 0.3s'
                      }}
                    ></div>
                  </div>
                  <div style={{ width: '80px', textAlign: 'right' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{count}</span>
                    <span style={{ fontSize: '12px', color: '#666', marginLeft: '4px' }}>({percentage.toFixed(0)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Peak Hours Chart */}
      <PeakHoursChart
        data={analyticsData?.peak_hours || []}
        loading={loading}
      />

      {/* Demographics Charts */}
      <DemographicsCharts
        data={analyticsData?.demographics || {}}
        loading={loading}
      />
    </div>
  );
};
