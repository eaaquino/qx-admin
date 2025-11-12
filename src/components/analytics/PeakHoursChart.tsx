import React from "react";
import { Card } from "antd";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PeakHoursChartProps {
  data: Array<{ hour: number; session_count: number }>;
  loading?: boolean;
}

export const PeakHoursChart: React.FC<PeakHoursChartProps> = ({ data, loading }) => {
  // Format data for display
  const formattedData = data.map(item => ({
    ...item,
    hourLabel: `${item.hour.toString().padStart(2, '0')}:00`
  }));

  return (
    <Card title="Peak Hours" loading={loading} bordered={false}>
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
            labelFormatter={(label) => `Hour: ${label}`}
          />
          <Bar dataKey="session_count" fill="#1890ff" name="Sessions" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
