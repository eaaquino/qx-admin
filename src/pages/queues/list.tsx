import React, { useState, useEffect, useCallback } from "react";
import { Space, Table, Tag, Button, Card, Typography, Switch, Dropdown } from "antd";
import { EyeOutlined, SyncOutlined, CalendarOutlined, BarChartOutlined, DownOutlined, UserOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { useNavigate } from "react-router";
import { supabaseClient } from "../../utility";
import { List } from "../../components/buttons";

const { Text } = Typography;

interface DoctorQueueSummary {
  doctor_id: string;
  doctor_name: string;
  clinic_name?: string;
  waiting: number;
  in_progress: number;
  completed_today: number;
  cancelled_today: number;
  latest_checkin?: string;
  session_state: string | null;
  session_start_time?: string | null;
  total_active_duration?: number;
  is_in_timestamp: string | null;
}

// Check if doctor is clocked in (timestamp is from today in PH timezone)
const isDoctorClockedIn = (timestamp: string | null): boolean => {
  if (!timestamp) return false;
  const timestampDate = new Date(timestamp);
  const now = new Date();

  // Compare dates in Philippine timezone
  const formatPH = (d: Date) => d.toLocaleDateString('en-US', { timeZone: 'Asia/Manila' });
  return formatPH(timestampDate) === formatPH(now);
};

export const QueueList: React.FC = () => {
  const navigate = useNavigate();
  const [queueSummaries, setQueueSummaries] = useState<DoctorQueueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [showAllDoctors, setShowAllDoctors] = useState(false);
  const REFRESH_INTERVAL = 30000; // 30 seconds

  const fetchQueueSummaries = useCallback(async () => {
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
          is_in_timestamp,
          clinics(name)
        `);

      // If not showing all doctors, only show those who are clocked in today
      // We filter by is_in_timestamp not being null, then filter client-side for today
      if (!showAllDoctors) {
        doctorsQuery = doctorsQuery.not("is_in_timestamp", "is", null);
      }

      const { data: doctors, error: doctorsError } = await doctorsQuery;

      if (doctorsError) throw doctorsError;

      // Filter to only include doctors clocked in today (if not showing all)
      const filteredDoctors = showAllDoctors
        ? doctors
        : doctors?.filter((doctor: any) => isDoctorClockedIn(doctor.is_in_timestamp));

      // Step 2: Fetch queue entries for today - split into two queries to avoid row limits
      // First, get active entries (waiting, called, in_progress)
      const { data: activeEntries, error: activeError } = await supabaseClient
        .from("queue_entries")
        .select("id, doctor_id, status, check_in_time")
        .gte("check_in_time", today.toISOString())
        .in("status", ["waiting", "called", "in_progress"]);

      if (activeError) throw activeError;

      // Second, get completed entries for today
      const { data: completedEntries, error: completedError } = await supabaseClient
        .from("queue_entries")
        .select("id, doctor_id, status, check_in_time")
        .gte("check_in_time", today.toISOString())
        .eq("status", "completed");

      if (completedError) throw completedError;

      // Third, get cancelled entries for today
      const { data: cancelledEntries, error: cancelledError } = await supabaseClient
        .from("queue_entries")
        .select("id, doctor_id, status, check_in_time")
        .gte("check_in_time", today.toISOString())
        .eq("status", "cancelled");

      if (cancelledError) throw cancelledError;

      // Combine all sets
      const queueEntries = [...(activeEntries || []), ...(completedEntries || []), ...(cancelledEntries || [])];

      // Step 3: Build summary map from doctors (not queue entries)
      const summaryMap = new Map<string, DoctorQueueSummary>();

      filteredDoctors?.forEach((doctor: any) => {
        summaryMap.set(doctor.id, {
          doctor_id: doctor.id,
          doctor_name: `Dr. ${doctor.first_name} ${doctor.last_name}`,
          clinic_name: doctor.clinics?.name,
          waiting: 0,
          in_progress: 0,
          completed_today: 0,
          cancelled_today: 0,
          session_state: doctor.session_state,
          session_start_time: doctor.session_start_time,
          total_active_duration: doctor.total_active_duration,
          is_in_timestamp: doctor.is_in_timestamp,
        });
      });

      // Step 4: Add queue entry counts to doctor summaries
      queueEntries?.forEach((entry: any) => {
        const summary = summaryMap.get(entry.doctor_id);

        if (summary) {
          // Count by status
          if (entry.status === "waiting") {
            summary.waiting++;
          } else if (entry.status === "in_progress" || entry.status === "called") {
            summary.in_progress++;
          } else if (entry.status === "completed") {
            summary.completed_today++;
          } else if (entry.status === "cancelled") {
            summary.cancelled_today++;
          }

          // Update latest check-in
          if (!summary.latest_checkin || entry.check_in_time > summary.latest_checkin) {
            summary.latest_checkin = entry.check_in_time;
          }
        }
      });

      // Step 5: Sort - clocked in first, then by active patients (in_progress + waiting)
      const sortedDoctors = Array.from(summaryMap.values()).sort((a, b) => {
        // Primary sort: clocked in doctors first
        const aClockedIn = isDoctorClockedIn(a.is_in_timestamp);
        const bClockedIn = isDoctorClockedIn(b.is_in_timestamp);

        if (aClockedIn && !bClockedIn) return -1;
        if (!aClockedIn && bClockedIn) return 1;

        // Secondary sort: by active patients count
        const aActive = a.in_progress + a.waiting;
        const bActive = b.in_progress + b.waiting;
        return bActive - aActive;
      });

      setQueueSummaries(sortedDoctors);
      setCountdown(30); // Reset countdown
    } catch (error) {
      console.error("Error fetching queue summaries:", error);
    } finally {
      setLoading(false);
    }
  }, [showAllDoctors]);

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
  }, [fetchQueueSummaries]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 30));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <List
      title={showAllDoctors ? "All Doctors" : "Clocked In Doctors"}
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
      {queueSummaries.length === 0 && !loading ? (
        <Card>
          <Text type="secondary">
            {showAllDoctors
              ? "No doctors found"
              : "No doctors clocked in at the moment"}
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
            dataIndex="is_in_timestamp"
            title="Clock-In Status"
            render={(value: string | null) => {
              if (isDoctorClockedIn(value)) {
                return <Tag color="green">CLOCKED IN</Tag>;
              } else {
                return <Tag color="red">CLOCKED OUT</Tag>;
              }
            }}
          />
          <Table.Column
            dataIndex="in_progress"
            title="In Progress"
            render={(value: number) => (
              <Tag color="cyan">{value}</Tag>
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
            dataIndex="completed_today"
            title="Completed"
            render={(value: number) => (
              <Tag color="green">{value}</Tag>
            )}
          />
          <Table.Column
            dataIndex="cancelled_today"
            title="Cancelled"
            render={(value: number) => (
              <Tag color="red">{value}</Tag>
            )}
          />
          <Table.Column
            title="Actions"
            dataIndex="actions"
            render={(_, record: DoctorQueueSummary) => {
              const analyticsItems: MenuProps['items'] = [
                {
                  key: 'performance',
                  label: 'Performance Metrics',
                  onClick: () => navigate(`/doctors/analytics/performance/${record.doctor_id}`),
                },
                {
                  key: 'history',
                  label: 'Patient History',
                  onClick: () => navigate(`/doctors/analytics/history/${record.doctor_id}`),
                },
              ];

              return (
                <Space>
                  <Button
                    type="primary"
                    icon={<EyeOutlined />}
                    size="small"
                    href={`/queues/doctor/${record.doctor_id}`}
                  >
                    View Queue
                  </Button>
                  <Button
                    size="small"
                    icon={<UserOutlined />}
                    onClick={() => navigate(`/doctors/show/${record.doctor_id}`)}
                    title="View Profile"
                  />
                  <Button
                    size="small"
                    icon={<CalendarOutlined />}
                    onClick={() => navigate(`/doctors/schedule/${record.doctor_id}`)}
                    title="View Schedule"
                  />
                  <Dropdown menu={{ items: analyticsItems }} trigger={['click']}>
                    <Button size="small" icon={<BarChartOutlined />} title="Analytics">
                      <DownOutlined />
                    </Button>
                  </Dropdown>
                </Space>
              );
            }}
          />
        </Table>
      )}
    </List>
  );
};
