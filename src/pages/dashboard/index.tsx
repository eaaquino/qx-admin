import React, { useState, useEffect } from "react";
import { Card, Col, Row, Statistic, message } from "antd";
import {
  ClockCircleOutlined,
  TeamOutlined,
  UserOutlined,
  CloseCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { analyticsService, getDateRange, isMultiDayPreset, type AnalyticsData } from "../../services/analyticsService";
import { DateRangeSelector, PeakHoursChart, DemographicsCharts, TimeSeriesChart, MultiTimeSeriesChart } from "../../components/analytics";

export const Dashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState<string>("7days");
  const [loading, setLoading] = useState<boolean>(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({});

  // Fetch analytics data
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const range = getDateRange(dateRange);
      const response = await analyticsService.getAnalytics({
        start_date: range.start_date,
        end_date: range.end_date,
      });

      setAnalyticsData(response.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      message.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when date range changes
  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  // Check if we should show time series charts
  const showTimeSeries = isMultiDayPreset(dateRange) && analyticsData.time_series;

  // Format time values
  const formatTime = (minutes: number | undefined): string => {
    if (!minutes) return "0";
    if (minutes < 60) return `${Math.round(minutes)}`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div style={{ padding: "24px" }}>
      {/* Date Range Selector */}
      <Row style={{ marginBottom: "24px" }}>
        <Col span={24}>
          <DateRangeSelector
            value={dateRange}
            onChange={setDateRange}
            onRefresh={fetchAnalytics}
            loading={loading}
          />
        </Col>
      </Row>

      {/* Key Metrics - Show as line charts for multi-day ranges, cards for single day */}
      {showTimeSeries ? (
        <>
          {/* Time Series Charts */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <TimeSeriesChart
                title="Total Patients"
                data={analyticsData.time_series?.total_patients}
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
                    data: analyticsData.time_series?.cancelled_count || [],
                    name: "Cancellations",
                    color: "#ff7875",
                  },
                  {
                    data: analyticsData.time_series?.no_show_count || [],
                    name: "No-Shows",
                    color: "#cf1322",
                  },
                ]}
                loading={loading}
              />
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: "16px" }}>
            <Col xs={24} lg={12}>
              <TimeSeriesChart
                title="Avg Consultation Time"
                data={analyticsData.time_series?.avg_consultation_time}
                loading={loading}
                color="#1890ff"
                valueLabel="Minutes"
                valueSuffix=" min"
              />
            </Col>
            <Col xs={24} lg={12}>
              <TimeSeriesChart
                title="Avg Waiting Time"
                data={analyticsData.time_series?.avg_waiting_time}
                loading={loading}
                color="#faad14"
                valueLabel="Minutes"
                valueSuffix=" min"
              />
            </Col>
          </Row>

          {/* Summary totals for the period */}
          <Row gutter={[16, 16]} style={{ marginTop: "16px" }}>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic
                  title="Total Patients"
                  value={analyticsData.total_patients || 0}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: "#52c41a", fontSize: "18px" }}
                  loading={loading}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic
                  title="Avg Consultation"
                  value={formatTime(analyticsData.avg_consultation_time)}
                  suffix={analyticsData.avg_consultation_time && analyticsData.avg_consultation_time >= 60 ? "" : "min"}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: "#1890ff", fontSize: "18px" }}
                  loading={loading}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic
                  title="Cancellations"
                  value={analyticsData.cancelled_count || 0}
                  prefix={<CloseCircleOutlined />}
                  valueStyle={{ color: "#ff7875", fontSize: "18px" }}
                  loading={loading}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic
                  title="No-Shows"
                  value={analyticsData.no_show_count || 0}
                  prefix={<StopOutlined />}
                  valueStyle={{ color: "#cf1322", fontSize: "18px" }}
                  loading={loading}
                />
              </Card>
            </Col>
          </Row>
        </>
      ) : (
        <>
          {/* Single Day View - Show as statistic cards */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic
                  title="Avg Consultation Time"
                  value={formatTime(analyticsData.avg_consultation_time)}
                  suffix={analyticsData.avg_consultation_time && analyticsData.avg_consultation_time >= 60 ? "" : "min"}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: "#1890ff" }}
                  loading={loading}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic
                  title="Avg Waiting Time"
                  value={formatTime(analyticsData.avg_waiting_time)}
                  suffix={analyticsData.avg_waiting_time && analyticsData.avg_waiting_time >= 60 ? "" : "min"}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: "#faad14" }}
                  loading={loading}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic
                  title="Total Patients"
                  value={analyticsData.total_patients || 0}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: "#52c41a" }}
                  loading={loading}
                />
              </Card>
            </Col>
          </Row>

          {/* Second Row - Cancellations and No-Shows */}
          <Row gutter={[16, 16]} style={{ marginTop: "16px" }}>
            <Col xs={24} sm={12}>
              <Card>
                <Statistic
                  title="Cancellations"
                  value={analyticsData.cancelled_count || 0}
                  prefix={<CloseCircleOutlined />}
                  valueStyle={{ color: "#ff7875" }}
                  loading={loading}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card>
                <Statistic
                  title="No-Shows"
                  value={analyticsData.no_show_count || 0}
                  prefix={<StopOutlined />}
                  valueStyle={{ color: "#cf1322" }}
                  loading={loading}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* Demographics */}
      <Row style={{ marginTop: "24px" }}>
        <Col span={24}>
          <DemographicsCharts
            data={analyticsData.demographics || {}}
            loading={loading}
          />
        </Col>
      </Row>

      {/* Peak Hours */}
      <Row gutter={[16, 16]} style={{ marginTop: "24px" }}>
        <Col span={24}>
          <PeakHoursChart
            data={analyticsData.peak_hours || []}
            loading={loading}
          />
        </Col>
      </Row>
    </div>
  );
};
