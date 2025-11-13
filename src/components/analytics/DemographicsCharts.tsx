import React from "react";
import { Card, Row, Col } from "antd";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'];

interface DemographicsData {
  age?: Array<{ age_group: string; patient_count: number }>;
  sex?: Array<{ sex: string; patient_count: number }>;
  reason?: Array<{ reason: string; patient_count: number }>;
}

interface DemographicsChartsProps {
  data: DemographicsData;
  loading?: boolean;
}

export const DemographicsCharts: React.FC<DemographicsChartsProps> = ({ data, loading }) => {
  return (
    <Row gutter={[16, 16]}>
      {/* Age Distribution */}
      <Col xs={24} lg={8}>
        <Card title="Age Distribution" loading={loading} bordered={false}>
          {data.age && data.age.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.age}
                  dataKey="patient_count"
                  nameKey="age_group"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(props: any) => {
                    const { age_group, percent } = props;
                    return `${age_group}: ${((percent || 0) * 100).toFixed(0)}%`;
                  }}
                >
                  {data.age.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} patients`, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              No age data available
            </div>
          )}
        </Card>
      </Col>

      {/* Sex Distribution */}
      <Col xs={24} lg={8}>
        <Card title="Sex Distribution" loading={loading} bordered={false}>
          {data.sex && data.sex.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.sex}
                  dataKey="patient_count"
                  nameKey="sex"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(props: any) => {
                    const { sex, percent } = props;
                    return `${sex}: ${((percent || 0) * 100).toFixed(0)}%`;
                  }}
                >
                  {data.sex.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} patients`, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              No sex data available
            </div>
          )}
        </Card>
      </Col>

      {/* Reason for Visit */}
      <Col xs={24} lg={8}>
        <Card title="Reason for Visit" loading={loading} bordered={false}>
          {data.reason && data.reason.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.reason} layout="horizontal" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="category" dataKey="reason" />
                <YAxis type="number" />
                <Tooltip formatter={(value: number) => [`${value} patients`, 'Count']} />
                <Bar dataKey="patient_count" fill="#1890ff" name="Patients" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              No visit reason data available
            </div>
          )}
        </Card>
      </Col>
    </Row>
  );
};
