import React from "react";
import { useList } from "@refinedev/core";
import { Card, Col, Row, Statistic, Table, Tag } from "antd";
import {
  UserOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

export const Dashboard: React.FC = () => {
  // Fetch queue entries
  const { data: queueData } = useList({
    resource: "queue_entries",
    pagination: {
      pageSize: 100,
    },
  });

  const { data: doctorData } = useList({
    resource: "doctors",
  });

  const { data: patientData } = useList({
    resource: "patients",
  });

  const queues = queueData?.data || [];
  const doctors = doctorData?.data || [];
  const patients = patientData?.data || [];

  // Calculate metrics
  const totalQueues = queues.length;
  const activeQueues = queues.filter((q) =>
    ["waiting", "called", "in_progress"].includes(q.status)
  ).length;
  const completedToday = queues.filter(
    (q) =>
      q.status === "completed" &&
      new Date(q.completed_time).toDateString() === new Date().toDateString()
  ).length;

  const avgWaitTime =
    queues.reduce((sum, q) => sum + (q.estimated_wait_time || 0), 0) /
      queues.length || 0;

  // Top doctors by patient count
  const doctorStats = doctors.map((doctor) => ({
    name: `Dr. ${doctor.first_name} ${doctor.last_name}`,
    patientCount: queues.filter((q) => q.doctor_id === doctor.id).length,
    activeQueues: queues.filter(
      (q) =>
        q.doctor_id === doctor.id &&
        ["waiting", "called", "in_progress"].includes(q.status)
    ).length,
  }));

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      waiting: "blue",
      called: "orange",
      in_progress: "cyan",
      completed: "green",
      cancelled: "red",
      no_show: "default",
    };
    return colors[status] || "default";
  };

  return (
    <div style={{ padding: "24px" }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Queues"
              value={activeQueues}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Completed Today"
              value={completedToday}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Patients"
              value={patients.length}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Avg Wait Time"
              value={Math.round(avgWaitTime)}
              suffix="min"
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: "24px" }}>
        <Col xs={24} lg={12}>
          <Card title="Doctor Performance" bordered={false}>
            <Table
              dataSource={doctorStats}
              pagination={false}
              size="small"
              columns={[
                {
                  title: "Doctor",
                  dataIndex: "name",
                  key: "name",
                },
                {
                  title: "Total Patients",
                  dataIndex: "patientCount",
                  key: "patientCount",
                  sorter: (a, b) => a.patientCount - b.patientCount,
                },
                {
                  title: "Active Queues",
                  dataIndex: "activeQueues",
                  key: "activeQueues",
                  sorter: (a, b) => a.activeQueues - b.activeQueues,
                },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Recent Queue Activity" bordered={false}>
            <Table
              dataSource={queues.slice(0, 10)}
              pagination={false}
              size="small"
              columns={[
                {
                  title: "Position",
                  dataIndex: "queue_position",
                  key: "queue_position",
                  width: 80,
                },
                {
                  title: "Status",
                  dataIndex: "status",
                  key: "status",
                  render: (status: string) => (
                    <Tag color={getStatusColor(status)}>
                      {status.toUpperCase()}
                    </Tag>
                  ),
                },
                {
                  title: "Wait Time",
                  dataIndex: "estimated_wait_time",
                  key: "estimated_wait_time",
                  render: (time: number) => `${time || "N/A"} min`,
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
