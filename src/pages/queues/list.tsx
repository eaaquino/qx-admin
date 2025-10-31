import React, { useState, useEffect } from "react";
import { List } from "@refinedev/antd";
import { Space, Table, Tag, Button, Card, Typography } from "antd";
import { EyeOutlined, SyncOutlined } from "@ant-design/icons";
import { supabaseClient } from "../../utility";

const { Text } = Typography;

interface DoctorQueueSummary {
  doctor_id: string;
  doctor_name: string;
  clinic_name?: string;
  total_queue: number;
  waiting: number;
  in_progress: number;
  completed_today: number;
  latest_checkin?: string;
}

export const QueueList: React.FC = () => {
  const [queueSummaries, setQueueSummaries] = useState<DoctorQueueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const REFRESH_INTERVAL = 30000; // 30 seconds

  const fetchQueueSummaries = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch all queue entries with doctor and clinic info
      const { data: queueEntries, error } = await supabaseClient
        .from("queue_entries")
        .select(`
          id,
          doctor_id,
          status,
          check_in_time,
          doctors(id, first_name, last_name, clinic_id, clinics(name))
        `)
        .gte("check_in_time", today.toISOString());

      if (error) throw error;

      // Group by doctor and calculate summaries
      const summaryMap = new Map<string, DoctorQueueSummary>();

      queueEntries?.forEach((entry: any) => {
        const doctorId = entry.doctor_id;

        if (!summaryMap.has(doctorId)) {
          summaryMap.set(doctorId, {
            doctor_id: doctorId,
            doctor_name: `Dr. ${entry.doctors.first_name} ${entry.doctors.last_name}`,
            clinic_name: entry.doctors.clinics?.name,
            total_queue: 0,
            waiting: 0,
            in_progress: 0,
            completed_today: 0,
            latest_checkin: entry.check_in_time,
          });
        }

        const summary = summaryMap.get(doctorId)!;

        // Count by status
        if (entry.status === "waiting") {
          summary.waiting++;
          summary.total_queue++;
        } else if (entry.status === "in_progress" || entry.status === "called") {
          summary.in_progress++;
          summary.total_queue++;
        } else if (entry.status === "completed") {
          summary.completed_today++;
        }

        // Update latest check-in
        if (!summary.latest_checkin || entry.check_in_time > summary.latest_checkin) {
          summary.latest_checkin = entry.check_in_time;
        }
      });

      // Filter to doctors with active queues OR completed patients today
      const activeDoctors = Array.from(summaryMap.values())
        .filter((summary) => summary.total_queue > 0 || summary.completed_today > 0)
        .sort((a, b) => b.total_queue - a.total_queue);

      setQueueSummaries(activeDoctors);
      setCountdown(30); // Reset countdown
    } catch (error) {
      console.error("Error fetching queue summaries:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchQueueSummaries();
  }, []);

  // Polling interval
  useEffect(() => {
    const interval = setInterval(() => {
      fetchQueueSummaries();
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 30));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <List
      title="Active Queues"
      headerButtons={
        <Space>
          <Text type="secondary">
            Refreshing in {countdown}s
          </Text>
          <Button
            icon={<SyncOutlined spin={loading} />}
            onClick={fetchQueueSummaries}
            loading={loading}
          >
            Refresh Now
          </Button>
        </Space>
      }
    >
      {queueSummaries.length === 0 ? (
        <Card>
          <Text type="secondary">No active queues at the moment</Text>
        </Card>
      ) : (
        <Table
          dataSource={queueSummaries}
          loading={loading}
          rowKey="doctor_id"
          pagination={false}
        >
          <Table.Column
            dataIndex="doctor_name"
            title="Doctor"
            render={(value: string) => <Text strong>{value}</Text>}
          />
          <Table.Column
            dataIndex="clinic_name"
            title="Clinic"
            render={(value: string) => value || "N/A"}
          />
          <Table.Column
            dataIndex="total_queue"
            title="Active Queue"
            render={(value: number) => (
              <Tag color="blue" style={{ fontSize: "14px", padding: "4px 8px" }}>
                {value} patient{value !== 1 ? "s" : ""}
              </Tag>
            )}
          />
          <Table.Column
            dataIndex="waiting"
            title="Waiting"
            render={(value: number) => (
              <Tag color="orange">{value}</Tag>
            )}
          />
          <Table.Column
            dataIndex="in_progress"
            title="In Progress"
            render={(value: number) => (
              <Tag color="cyan">{value}</Tag>
            )}
          />
          <Table.Column
            dataIndex="completed_today"
            title="Completed Today"
            render={(value: number) => (
              <Tag color="green">{value}</Tag>
            )}
          />
          <Table.Column
            title="Actions"
            dataIndex="actions"
            render={(_, record: DoctorQueueSummary) => (
              <Space>
                <Button
                  type="primary"
                  icon={<EyeOutlined />}
                  size="small"
                  href={`/queues/doctor/${record.doctor_id}`}
                >
                  View Queue
                </Button>
              </Space>
            )}
          />
        </Table>
      )}
    </List>
  );
};
