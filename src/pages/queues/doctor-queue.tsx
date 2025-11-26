import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Card, Typography, Tag, Space, Button, Descriptions, Row, Col, Tooltip } from "antd";
import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons";
import { supabaseClient } from "../../utility";
import type { RealtimeChannel } from "@supabase/supabase-js";

const { Title, Text } = Typography;

interface QueueEntry {
  id: string;
  queue_position: number;
  patient_id: string;
  status: string;
  reason_for_visit: string;
  estimated_wait_time: number | null;
  check_in_time: string;
  called_time: string | null;
  completed_time: string | null;
  patients: any;
}

// Visit type durations (matching edge function)
const VISIT_TYPE_DURATIONS: Record<string, number> = {
  'new-consult': 15,
  'follow-up': 10,
  'medical-certificate': 15,
};

// Get expected duration for a visit type
const getExpectedDuration = (reason: string): number => {
  const reasonLower = reason.toLowerCase();
  if (reasonLower.includes('medical') || reasonLower.includes('certificate')) {
    return VISIT_TYPE_DURATIONS['medical-certificate'];
  }
  if (reasonLower.includes('follow')) {
    return VISIT_TYPE_DURATIONS['follow-up'];
  }
  return VISIT_TYPE_DURATIONS['new-consult'];
};

// Get reason badge color and label (matching qx-client style)
const getReasonBadge = (reason: string): { color: string; label: string } => {
  const reasonLower = reason.toLowerCase();
  if (reasonLower.includes('follow')) {
    return { color: '#52c41a', label: 'Follow-up' }; // green
  }
  if (reasonLower.includes('medical') || reasonLower.includes('certificate') || reasonLower.includes('medcert')) {
    return { color: '#faad14', label: 'Med Cert' }; // yellow/gold
  }
  return { color: '#722ed1', label: 'New Consult' }; // purple
};

interface DoctorInfo {
  id: string;
  first_name: string;
  last_name: string;
  specialization: string;
  clinics: any;
  session_state: string | null;
  session_start_time: string | null;
  total_active_duration: number | null;
  is_in_timestamp: string | null;
}

export const DoctorQueueMonitor: React.FC = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Fetch doctor info
  useEffect(() => {
    const fetchDoctorInfo = async () => {
      if (!doctorId) return;

      const { data, error } = await supabaseClient
        .from("doctors")
        .select("id, first_name, last_name, specialization, session_state, session_start_time, total_active_duration, is_in_timestamp, clinics(name)")
        .eq("id", doctorId)
        .single();

      if (error) {
        console.error("Error fetching doctor:", error);
        return;
      }

      setDoctorInfo(data);
    };

    fetchDoctorInfo();
  }, [doctorId]);

  // Fetch queue entries
  const fetchQueueEntries = async () => {
    if (!doctorId) return;

    setLoading(true);
    try {
      // Calculate "today" in Philippine timezone (GMT+8)
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

      const { data, error } = await supabaseClient
        .from("queue_entries")
        .select(`
          id,
          queue_position,
          patient_id,
          status,
          reason_for_visit,
          estimated_wait_time,
          check_in_time,
          called_time,
          completed_time,
          patients(name, phone)
        `)
        .eq("doctor_id", doctorId)
        .gte("check_in_time", today.toISOString())
        .order("queue_position", { ascending: true });

      if (error) throw error;

      setQueueEntries(data || []);
    } catch (error) {
      console.error("Error fetching queue entries:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchQueueEntries();
  }, [doctorId]);

  // Real-time subscription
  useEffect(() => {
    if (!doctorId) return;

    const realtimeChannel = supabaseClient
      .channel(`queue-doctor-${doctorId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queue_entries",
          filter: `doctor_id=eq.${doctorId}`,
        },
        () => {
          // Refetch on any change
          fetchQueueEntries();
        }
      )
      .subscribe();

    setChannel(realtimeChannel);

    return () => {
      realtimeChannel.unsubscribe();
    };
  }, [doctorId]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      waiting: "orange",
      called: "blue",
      in_progress: "cyan",
      completed: "green",
      cancelled: "red",
      no_show: "default",
    };
    return colors[status] || "default";
  };

  const ongoing = queueEntries.filter((e) => e.status === "in_progress" || e.status === "called");
  const waiting = queueEntries.filter((e) => e.status === "waiting");
  const completed = queueEntries
    .filter((e) => e.status === "completed")
    .sort((a, b) => {
      // Sort by completed_time descending (newest first)
      const aTime = a.completed_time ? new Date(a.completed_time).getTime() : 0;
      const bTime = b.completed_time ? new Date(b.completed_time).getTime() : 0;
      return bTime - aTime;
    });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  // Check if doctor is clocked in (timestamp is from today in PH timezone)
  const isDoctorClockedIn = (timestamp: string | null): boolean => {
    if (!timestamp) return false;
    const timestampDate = new Date(timestamp);
    const now = new Date();

    // Compare dates in Philippine timezone
    const formatPH = (d: Date) => d.toLocaleDateString('en-US', { timeZone: 'Asia/Manila' });
    return formatPH(timestampDate) === formatPH(now);
  };

  // Calculate dynamic wait time for a waiting patient
  const calculateWaitTime = (entry: QueueEntry): number | null => {
    if (entry.status !== 'waiting') return null;

    const now = new Date();
    let totalWait = 0;

    // Find the in-progress patient (if any)
    const inProgressEntry = queueEntries.find(e => e.status === 'in_progress');

    if (inProgressEntry && inProgressEntry.called_time) {
      const expectedDuration = getExpectedDuration(inProgressEntry.reason_for_visit);
      const timeInSession = Math.floor(
        (now.getTime() - new Date(inProgressEntry.called_time).getTime()) / 1000 / 60
      );
      const remainingTime = Math.max(expectedDuration - timeInSession, 0);
      totalWait += remainingTime;
    }

    // Add time for all waiting/called patients ahead of this entry
    for (const e of queueEntries) {
      if (e.queue_position >= entry.queue_position) break;
      if (e.status === 'in_progress') continue; // Already counted above
      if (e.status === 'waiting' || e.status === 'called') {
        totalWait += getExpectedDuration(e.reason_for_visit);
      }
    }

    return totalWait;
  };

  // Calculate session duration for completed entries (called_time to completed_time)
  const getSessionDuration = (entry: QueueEntry): number | null => {
    if (!entry.called_time || !entry.completed_time) return null;
    const calledTime = new Date(entry.called_time).getTime();
    const completedTime = new Date(entry.completed_time).getTime();
    return Math.round((completedTime - calledTime) / 1000 / 60);
  };

  // Calculate total waiting time for completed entries (check_in_time to called_time)
  const getTotalWaitingTime = (entry: QueueEntry): number | null => {
    if (!entry.check_in_time || !entry.called_time) return null;
    const checkInTime = new Date(entry.check_in_time).getTime();
    const calledTime = new Date(entry.called_time).getTime();
    return Math.round((calledTime - checkInTime) / 1000 / 60);
  };

  const QueueCard: React.FC<{ entry: QueueEntry; isCompleted?: boolean }> = ({ entry, isCompleted }) => {
    const dynamicWaitTime = calculateWaitTime(entry);
    const reasonBadge = getReasonBadge(entry.reason_for_visit);
    const sessionDuration = isCompleted ? getSessionDuration(entry) : null;
    const totalWaitingTime = isCompleted ? getTotalWaitingTime(entry) : null;

    return (
      <Card
        size="small"
        style={{ marginBottom: 8 }}
        bodyStyle={{ padding: "12px 16px" }}
      >
        <Space direction="vertical" style={{ width: "100%" }} size={8}>
          {/* Row 1: Position + Name + Reason Badge */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Space>
              {!isCompleted && (
                <Tag color="blue" style={{ fontSize: "16px", fontWeight: "bold", padding: "4px 12px", margin: 0 }}>
                  #{entry.queue_position}
                </Tag>
              )}
              <Text strong style={{ fontSize: "15px" }}>{entry.patients?.name || 'Unknown'}</Text>
            </Space>
            <Tag
              style={{
                backgroundColor: reasonBadge.color + '20',
                color: reasonBadge.color,
                border: 'none',
                borderRadius: '12px',
                fontWeight: 500,
                margin: 0
              }}
            >
              {reasonBadge.label}
            </Tag>
          </div>

          {/* Row 2: Status badge (for non-completed) */}
          {!isCompleted && (
            <div>
              <Tag color={getStatusColor(entry.status)} style={{ margin: 0 }}>
                {entry.status.replace('_', ' ').toUpperCase()}
              </Tag>
            </div>
          )}

          {/* Row 3: Time info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {isCompleted ? (
              // For completed: show waiting time and session duration with tooltips
              <>
                <Tooltip
                  title={
                    <div>
                      <div>Check-in: {formatTime(entry.check_in_time)}</div>
                      {entry.called_time && <div>Session Start: {formatTime(entry.called_time)}</div>}
                    </div>
                  }
                >
                  <Text type="secondary" style={{ cursor: 'help' }}>
                    Waited: {totalWaitingTime !== null ? `${totalWaitingTime} min` : 'N/A'}
                  </Text>
                </Tooltip>
                <Tooltip
                  title={
                    <div>
                      {entry.called_time && <div>Session Start: {formatTime(entry.called_time)}</div>}
                      {entry.completed_time && <div>Completed: {formatTime(entry.completed_time)}</div>}
                    </div>
                  }
                >
                  <Text type="secondary" style={{ cursor: 'help' }}>
                    Session: {sessionDuration !== null ? `${sessionDuration} min` : 'N/A'}
                  </Text>
                </Tooltip>
              </>
            ) : (
              // For waiting/ongoing: show check-in and wait time
              <>
                <Text type="secondary">Check-in: {formatTime(entry.check_in_time)}</Text>
                {dynamicWaitTime !== null && (
                  <Text type="secondary">Est. Wait: ~{dynamicWaitTime} min</Text>
                )}
                {entry.status === 'in_progress' && (
                  <Text type="secondary">Expected: {getExpectedDuration(entry.reason_for_visit)} min</Text>
                )}
              </>
            )}
          </div>
        </Space>
      </Card>
    );
  };

  if (!doctorInfo) {
    return (
      <Card loading={true}>
        <Text>Loading doctor information...</Text>
      </Card>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" style={{ width: "100%" }} size={24}>
        {/* Header */}
        <Card>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate("/queues")}
              >
                Back to Queue List
              </Button>
              <Title level={3} style={{ margin: 0 }}>
                Queue Monitor - Dr. {doctorInfo.first_name} {doctorInfo.last_name}
              </Title>
              {isDoctorClockedIn(doctorInfo.is_in_timestamp) ? (
                <Tag color="green" style={{ fontSize: "14px", padding: "4px 12px" }}>
                  CLOCKED IN
                </Tag>
              ) : (
                <Tag color="red" style={{ fontSize: "14px", padding: "4px 12px" }}>
                  CLOCKED OUT
                </Tag>
              )}
            </Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchQueueEntries}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>

          <Descriptions style={{ marginTop: 16 }} column={3} size="small">
            <Descriptions.Item label="Clinic">{doctorInfo.clinics?.name || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Specialization">{doctorInfo.specialization || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Session Status">
              {doctorInfo.session_state === "active" ? (
                <Tag color="green">● ACTIVE</Tag>
              ) : doctorInfo.session_state === "paused" ? (
                <Tag color="orange">⏸ PAUSED</Tag>
              ) : (
                <Tag color="default">⏹ STOPPED</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Queue Sections */}
        <Row gutter={16}>
          {/* Ongoing */}
          <Col span={8}>
            <Card
              title={
                <Space>
                  <Text strong>Ongoing</Text>
                  <Tag color="cyan">{ongoing.length}</Tag>
                </Space>
              }
              headStyle={{ backgroundColor: "#e6f7ff" }}
            >
              {ongoing.length === 0 ? (
                <Text type="secondary">No ongoing patients</Text>
              ) : (
                ongoing.map((entry) => <QueueCard key={entry.id} entry={entry} />)
              )}
            </Card>
          </Col>

          {/* Waiting */}
          <Col span={8}>
            <Card
              title={
                <Space>
                  <Text strong>Waiting</Text>
                  <Tag color="orange">{waiting.length}</Tag>
                </Space>
              }
              headStyle={{ backgroundColor: "#fff7e6" }}
            >
              {waiting.length === 0 ? (
                <Text type="secondary">No patients waiting</Text>
              ) : (
                waiting.map((entry) => <QueueCard key={entry.id} entry={entry} />)
              )}
            </Card>
          </Col>

          {/* Completed */}
          <Col span={8}>
            <Card
              title={
                <Space>
                  <Text strong>Completed Today</Text>
                  <Tag color="green">{completed.length}</Tag>
                </Space>
              }
              headStyle={{ backgroundColor: "#f6ffed" }}
            >
              {completed.length === 0 ? (
                <Text type="secondary">No completed patients</Text>
              ) : (
                completed.map((entry) => <QueueCard key={entry.id} entry={entry} isCompleted />)
              )}
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
};
