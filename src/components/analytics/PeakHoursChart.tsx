import React from "react";
import { Card, theme } from "antd";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PeakHourData {
  hour: number;
  session_count: number;
}

interface PeakHoursChartProps {
  data?: PeakHourData[];
  loading?: boolean;
}

export const PeakHoursChart: React.FC<PeakHoursChartProps> = ({ data = [], loading = false }) => {
  const { token } = theme.useToken();

  // Format data for display
  const formattedData = data.map(item => ({
    ...item,
    hourLabel: `${item.hour.toString().padStart(2, '0')}:00`
  }));

  return (
    <Card title="Peak Hours" loading={loading} bordered={false} style={{ marginBottom: '20px' }}>
      {formattedData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={formattedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="hourLabel"
              label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }}
              tick={{ fontSize: 12 }}
              interval={2}
            />
            <YAxis label={{ value: 'Sessions', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              formatter={(value: number) => [`${value} sessions`, 'Count']}
              labelFormatter={(label: string) => `Hour: ${label}`}
              contentStyle={{
                backgroundColor: token.colorBgElevated,
                borderColor: token.colorBorder,
                color: token.colorText,
              }}
              labelStyle={{ color: token.colorText }}
              itemStyle={{ color: token.colorText }}
            />
            <Bar dataKey="session_count" fill="#1890ff" name="Sessions" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: token.colorTextSecondary }}>
          No peak hours data available
        </div>
      )}
    </Card>
  );
};
