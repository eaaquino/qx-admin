import React, { useState, useEffect } from "react";
import { Show } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import {
  Card,
  Row,
  Col,
  Statistic,
  Image,
  Tag,
  Select,
  Spin,
  Typography,
  Space,
} from "antd";
import {
  EyeOutlined,
  InteractionOutlined,
  GiftOutlined,
  RiseOutlined,
  FallOutlined,
} from "@ant-design/icons";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { analyticsService, getDateRange } from "../../services/analyticsService";
import type { CampaignAnalyticsResponse } from "../../services/analyticsService";

const { Title, Text } = Typography;

type CampaignStatus = "active" | "scheduled" | "expired" | "disabled";

export const CampaignAnalyticsShow: React.FC = () => {
  const { query } = useShow();
  const { data, isLoading } = query;
  const record = data?.data;

  const [dateRangePreset, setDateRangePreset] = useState<string>("7days");
  const [analytics, setAnalytics] = useState<CampaignAnalyticsResponse["data"] | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Fetch analytics when campaign or date range changes
  useEffect(() => {
    if (!record?.id) return;

    const fetchAnalytics = async () => {
      setAnalyticsLoading(true);
      try {
        const dateRange = getDateRange(dateRangePreset);
        const response = await analyticsService.getCampaignAnalytics(
          String(record.id),
          {
            start_date: dateRange.start_date || undefined,
            end_date: dateRange.end_date || undefined
          }
        );

        if (response.success) {
          setAnalytics(response.data);
        }
      } catch (error) {
        console.error("Error fetching campaign analytics:", error);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, [record?.id, dateRangePreset]);

  const getStatus = (
    record: any
  ): { status: string; statusType: CampaignStatus; color: string } => {
    if (!record) return { status: "", statusType: "disabled", color: "" };

    const now = new Date();
    const startDate = new Date(record.start_date);
    const endDate = record.end_date ? new Date(record.end_date) : null;

    if (!record.is_active) {
      return { status: "Disabled", statusType: "disabled", color: "red" };
    }

    if (endDate && endDate < now) {
      return { status: "Expired", statusType: "expired", color: "red" };
    }

    if (startDate > now) {
      return { status: "Scheduled", statusType: "scheduled", color: "blue" };
    }

    return { status: "Active", statusType: "active", color: "green" };
  };

  const dateRangeOptions = [
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "Last 7 Days", value: "7days" },
    { label: "Last 30 Days", value: "1month" },
    { label: "Last Year", value: "1year" },
    { label: "Lifetime", value: "lifetime" },
  ];

  // Mock trend data for line chart (this should come from backend in future)
  // For now, generate sample data based on analytics totals
  const generateTrendData = () => {
    if (!analytics) return [];

    const days = (dateRangePreset === "today" || dateRangePreset === "yesterday") ? 24 : dateRangePreset === "7days" ? 7 : 30;
    const data = [];

    for (let i = 0; i < days; i++) {
      // Distribute totals across time period with some variance
      const variance = 0.8 + Math.random() * 0.4; // 80% to 120%
      data.push({
        name: (dateRangePreset === "today" || dateRangePreset === "yesterday") ? `${i}:00` : `Day ${i + 1}`,
        impressions: Math.round((analytics.impressions / days) * variance),
        clicks: Math.round((analytics.clicks / days) * variance),
        redemptions: Math.round((analytics.redeems / days) * variance),
      });
    }

    return data;
  };

  const trendData = generateTrendData();

  if (isLoading) {
    return (
      <Show>
        <Spin size="large" style={{ display: "block", margin: "50px auto" }} />
      </Show>
    );
  }

  if (!record) {
    return (
      <Show>
        <Text>Campaign not found</Text>
      </Show>
    );
  }

  const { status, color } = getStatus(record);

  return (
    <Show>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* Campaign Header */}
        <Card>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={8} md={6}>
              {record.image_url ? (
                <Image
                  src={record.image_url}
                  alt={record.title}
                  style={{
                    width: "100%",
                    maxWidth: 200,
                    borderRadius: 8,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    maxWidth: 200,
                    height: 120,
                    background: "#f0f0f0",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  No image
                </div>
              )}
            </Col>
            <Col xs={24} sm={16} md={18}>
              <Space direction="vertical" size="small">
                <Title level={3} style={{ margin: 0 }}>
                  {record.title}
                </Title>
                {record.description && (
                  <Text type="secondary">{record.description}</Text>
                )}
                <Space>
                  <Tag color={color}>{status}</Tag>
                  {record.priority > 0 && (
                    <Tag color="orange">Priority: {record.priority}</Tag>
                  )}
                </Space>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Date Range Filter */}
        <Card>
          <Space>
            <Text strong>Date Range:</Text>
            <Select
              value={dateRangePreset}
              onChange={setDateRangePreset}
              options={dateRangeOptions}
              style={{ width: 150 }}
            />
          </Space>
        </Card>

        {/* Analytics Metrics */}
        {analyticsLoading ? (
          <Card>
            <Spin
              size="large"
              style={{ display: "block", margin: "50px auto" }}
            />
          </Card>
        ) : analytics ? (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Total Impressions"
                    value={analytics.impressions}
                    prefix={<EyeOutlined />}
                    valueStyle={{ color: "#3f8600" }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Total Clicks"
                    value={analytics.clicks}
                    prefix={<InteractionOutlined />}
                    suffix={
                      <Text type="secondary" style={{ fontSize: 14 }}>
                        ({analytics.ctr.toFixed(2)}% CTR)
                      </Text>
                    }
                    valueStyle={{ color: "#1890ff" }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Total Redemptions"
                    value={analytics.redeems}
                    prefix={<GiftOutlined />}
                    suffix={
                      <Text type="secondary" style={{ fontSize: 14 }}>
                        ({analytics.redemption_rate.toFixed(2)}%)
                      </Text>
                    }
                    valueStyle={{ color: "#cf1322" }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Bounce Rate"
                    value={analytics.bounce_rate.toFixed(2)}
                    suffix="%"
                    prefix={
                      analytics.bounce_rate > 50 ? (
                        <RiseOutlined />
                      ) : (
                        <FallOutlined />
                      )
                    }
                    valueStyle={{
                      color: analytics.bounce_rate > 50 ? "#cf1322" : "#3f8600",
                    }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Trend Chart */}
            <Card title="Performance Trend">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={trendData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="impressions"
                    stroke="#3f8600"
                    strokeWidth={2}
                    name="Impressions"
                  />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="#1890ff"
                    strokeWidth={2}
                    name="Clicks"
                  />
                  <Line
                    type="monotone"
                    dataKey="redemptions"
                    stroke="#cf1322"
                    strokeWidth={2}
                    name="Redemptions"
                  />
                </LineChart>
              </ResponsiveContainer>
              <Text type="secondary" style={{ display: "block", marginTop: 16 }}>
                Note: Trend data is estimated distribution. Implement time-series
                data collection for accurate historical trends.
              </Text>
            </Card>
          </>
        ) : (
          <Card>
            <Text>No analytics data available</Text>
          </Card>
        )}
      </Space>
    </Show>
  );
};
