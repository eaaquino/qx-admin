import React from "react";
import { Card, theme } from "antd";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TimeSeriesDataPoint } from "../../services/analyticsService";

interface TimeSeriesChartProps {
  title: string;
  data?: TimeSeriesDataPoint[];
  loading?: boolean;
  color?: string;
  valueLabel?: string;
  valueSuffix?: string;
  height?: number;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  title,
  data = [],
  loading = false,
  color = "#1890ff",
  valueLabel = "Value",
  valueSuffix = "",
  height = 250,
}) => {
  const { token } = theme.useToken();

  // Format data for display - format date as readable string
  const formattedData = data.map((item) => ({
    ...item,
    dateLabel: formatDate(item.date),
  }));

  return (
    <Card title={title} loading={loading} bordered={false} style={{ marginBottom: "16px" }}>
      {formattedData.length > 0 ? (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={formattedData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number) => [
                `${value.toFixed(1)}${valueSuffix}`,
                valueLabel,
              ]}
              labelFormatter={(label: string) => `Date: ${label}`}
              contentStyle={{
                backgroundColor: token.colorBgElevated,
                borderColor: token.colorBorder,
                color: token.colorText,
              }}
              labelStyle={{ color: token.colorText }}
              itemStyle={{ color: token.colorText }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name={valueLabel}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ textAlign: "center", padding: "40px", color: token.colorTextSecondary }}>
          No data available for this period
        </div>
      )}
    </Card>
  );
};

// Helper to format date string (YYYY-MM-DD) to readable format
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// Multi-line chart for comparing multiple metrics
interface MultiTimeSeriesChartProps {
  title: string;
  series: Array<{
    data: TimeSeriesDataPoint[];
    name: string;
    color: string;
  }>;
  loading?: boolean;
  valueSuffix?: string;
  height?: number;
}

export const MultiTimeSeriesChart: React.FC<MultiTimeSeriesChartProps> = ({
  title,
  series,
  loading = false,
  valueSuffix = "",
  height = 250,
}) => {
  const { token } = theme.useToken();

  // Merge all series data by date
  const dateMap = new Map<string, Record<string, number>>();

  series.forEach((s) => {
    s.data.forEach((point) => {
      const existing = dateMap.get(point.date) || {};
      existing[s.name] = point.value;
      dateMap.set(point.date, existing);
    });
  });

  // Convert to array and sort by date
  const formattedData = Array.from(dateMap.entries())
    .map(([date, values]) => ({
      date,
      dateLabel: formatDate(date),
      ...values,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Card title={title} loading={loading} bordered={false} style={{ marginBottom: "16px" }}>
      {formattedData.length > 0 ? (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={formattedData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value.toFixed(1)}${valueSuffix}`,
                name,
              ]}
              labelFormatter={(label: string) => `Date: ${label}`}
              contentStyle={{
                backgroundColor: token.colorBgElevated,
                borderColor: token.colorBorder,
                color: token.colorText,
              }}
              labelStyle={{ color: token.colorText }}
              itemStyle={{ color: token.colorText }}
            />
            <Legend />
            {series.map((s) => (
              <Line
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ textAlign: "center", padding: "40px", color: token.colorTextSecondary }}>
          No data available for this period
        </div>
      )}
    </Card>
  );
};
