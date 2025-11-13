import React, { useState, useEffect } from "react";
import { List } from "@refinedev/antd";
import { Space, Table, Tag, Button, Card, Typography, Switch } from "antd";
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
  session_state: string | null;
  session_start_time?: string | null;
  total_active_duration?: number;
}

export const QueueList: React.FC = () => {
  const [queueSummaries, setQueueSummaries] = useState<DoctorQueueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [showAllDoctors, setShowAllDoctors] = useState(false);
  const REFRESH_INTERVAL = 30000; // 30 seconds

  const fetchQueueSummaries = async () => {
    setLoading(true);
    try {
      // Calculate "today" in Philippine timezone (GMT+8)
      // Since database is set to Asia/Manila, we need to match that timezone
      const now = new Date();
      const phDateString = now.toLocaleString('en-US', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });

      // Parse MM/DD/YYYY format and create midnight in PH time
      const [month, day, year] = phDateString.split('/');
      const today = new Date(`${year}-${month}-${day}T00:00:00+08:00`);

      // Step 1: Fetch all doctors with session info
      let doctorsQuery = supabaseClient
        .from("doctors")
        .select(`
          id,
          first_name,
          last_name,
          clinic_id,
          session_state,
          session_start_time,
          total_active_duration,
          clinics(name)
        `);

      // If not showing all doctors, only show those with active/paused sessions
      if (!showAllDoctors) {
        doctorsQuery = doctorsQuery.in("session_state", ["active", "paused"]);
      }

      const { data: doctors, error: doctorsError } = await doctorsQuery;

      if (doctorsError) throw doctorsError;

      // Step 2: Fetch all queue entries for today
      const { data: queueEntries, error: queueError } = await supabaseClient
        .from("queue_entries")
        .select("id, doctor_id, status, check_in_time")
        .gte("check_in_time", today.toISOString());

      if (queueError) throw queueError;

      // Step 3: Build summary map from doctors (not queue entries)
      const summaryMap = new Map<string, DoctorQueueSummary>();

      doctors?.forEach((doctor: any) => {
        summaryMap.set(doctor.id, {
          doctor_id: doctor.id,
          doctor_name: `Dr. ${doctor.first_name} ${doctor.last_name}`,
          clinic_name: doctor.clinics?.name,
          total_queue: 0,
          waiting: 0,
          in_progress: 0,
          completed_today: 0,
          session_state: doctor.session_state,
          session_start_time: doctor.session_start_time,
          total_active_duration: doctor.total_active_duration,
        });
      });

      // Step 4: Add queue entry counts to doctor summaries
      queueEntries?.forEach((entry: any) => {
        const summary = summaryMap.get(entry.doctor_id);

        if (summary) {
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
        }
      });

      // Step 5: Sort - active sessions first, then by queue count
      const sortedDoctors = Array.from(summaryMap.values()).sort((a, b) => {
        // Primary sort: active/paused sessions first
        const aHasSession = a.session_state === 'active' || a.session_state === 'paused';
        const bHasSession = b.session_state === 'active' || b.session_state === 'paused';

        if (aHasSession && !bHasSession) return -1;
        if (!aHasSession && bHasSession) return 1;

        // Secondary sort: by total queue count
        return b.total_queue - a.total_queue;
      });

      setQueueSummaries(sortedDoctors);
      setCountdown(30); // Reset countdown
    } catch (error) {
      console.error("Error fetching queue summaries:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and re-fetch when filter changes
  useEffect(() => {
    fetchQueueSummaries();
  }, [showAllDoctors]);

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
      title={showAllDoctors ? "All Doctors" : "Active Sessions"}
      headerButtons={
        <Space>
          <Space>
            <Text type="secondary">Show All Doctors:</Text>
            <Switch
              checked={showAllDoctors}
              onChange={(checked) => setShowAllDoctors(checked)}
              checkedChildren="ON"
              unCheckedChildren="OFF"
            />
          </Space>
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
          <Text type="secondary">
            {showAllDoctors
              ? "No doctors found"
              : "No doctors with active sessions at the moment"}
          </Text>
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
            dataIndex="session_state"
            title="Session Status"
            render={(value: string | null) => {
              if (value === "active") {
                return <Tag color="green">● ACTIVE</Tag>;
              } else if (value === "paused") {
                return <Tag color="orange">⏸ PAUSED</Tag>;
              } else {
                return <Tag color="default">⏹ STOPPED</Tag>;
              }
            }}
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
