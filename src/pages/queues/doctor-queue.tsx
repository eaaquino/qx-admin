import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router";
import { Card, Typography, Tag, Space, Button, Descriptions, Row, Col, Tooltip, theme, DatePicker } from "antd";
import { ArrowLeftOutlined, SyncOutlined, HistoryOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { supabaseClient } from "../../utility";
import { ColorModeContext } from "../../contexts/color-mode";

const { Title, Text } = Typography;
const { useToken } = theme;

interface QueueEntry {
  id: string;
  patient_id: string;
  status: string;
  reason_for_visit: string;
  estimated_wait_time: number | null;
  check_in_time: string;
  called_time: string | null;
  completed_time: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  patients: any;
}

// Get cancellation reason display label
const getCancellationReasonLabel = (reason: string | null): string => {
  const labels: Record<string, string> = {
    'expired_session': 'Session Expired',
    'no_show': 'No Show',
    'doctor_cancelled': 'Doctor Cancelled',
    'patient_cancelled': 'Patient Cancelled',
  };
  return reason ? labels[reason] || reason : 'Unknown';
};

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

// Get today's date in PH timezone as dayjs object
const getTodayPH = (): Dayjs => {
  const now = new Date();
  const phDateString = now.toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const [month, day, year] = phDateString.split('/');
  return dayjs(`${year}-${month}-${day}`);
};

export const DoctorQueueMonitor: React.FC = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(getTodayPH());
  const { mode } = useContext(ColorModeContext);
  const { token } = useToken();
  const isDarkMode = mode === "dark";
  const REFRESH_INTERVAL = 30000; // 30 seconds

  // Check if viewing today's queue (enable auto-refresh only for today)
  const isToday = selectedDate.format('YYYY-MM-DD') === getTodayPH().format('YYYY-MM-DD');

  // Column header colors that adapt to dark mode
  const columnColors = {
    ongoing: isDarkMode ? token.colorInfoBg : "#e6f7ff",
    waiting: isDarkMode ? token.colorWarningBg : "#fff7e6",
    completed: isDarkMode ? token.colorSuccessBg : "#f6ffed",
    cancelled: isDarkMode ? token.colorErrorBg : "#fff1f0",
  };

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
      // Use selectedDate to create start and end of day in PH timezone
      const dateStr = selectedDate.format('YYYY-MM-DD');
      const startOfDay = new Date(`${dateStr}T00:00:00+08:00`);
      const endOfDay = new Date(`${dateStr}T23:59:59+08:00`);

      const { data, error } = await supabaseClient
        .from("queue_entries")
        .select(`
          id,
          patient_id,
          status,
          reason_for_visit,
          estimated_wait_time,
          check_in_time,
          called_time,
          completed_time,
          cancelled_at,
          cancellation_reason,
          patients(name, phone)
        `)
        .eq("doctor_id", doctorId)
        .gte("check_in_time", startOfDay.toISOString())
        .lte("check_in_time", endOfDay.toISOString())
        .order("check_in_time", { ascending: true });

      if (error) throw error;

      setQueueEntries(data || []);
    } catch (error) {
      console.error("Error fetching queue entries:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch when doctorId or selectedDate changes
  useEffect(() => {
    fetchQueueEntries();
  }, [doctorId, selectedDate]);

  // Polling interval for queue updates (only for today's date)
  useEffect(() => {
    if (!isToday) return; // Don't auto-refresh for historical dates

    const interval = setInterval(() => {
      fetchQueueEntries();
      setCountdown(30);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [doctorId, selectedDate, isToday]);

  // Countdown timer (only for today's date)
  useEffect(() => {
    if (!isToday) return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 30));
    }, 1000);

    return () => clearInterval(timer);
  }, [isToday]);

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
  const cancelled = queueEntries
    .filter((e) => e.status === "cancelled" || e.status === "no_show")
    .sort((a, b) => {
      // Sort by check_in_time descending (newest first)
      const aTime = new Date(a.check_in_time).getTime();
      const bTime = new Date(b.check_in_time).getTime();
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
  // Position is determined by check_in_time ordering (entries are already sorted)
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

    // Add time for all waiting/called patients ahead of this entry (by check_in_time)
    const entryCheckInTime = new Date(entry.check_in_time).getTime();
    for (const e of queueEntries) {
      // Skip entries at or after this entry's check_in_time
      if (new Date(e.check_in_time).getTime() >= entryCheckInTime) break;
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

  // QueueCard now accepts position prop derived from array index
  const QueueCard: React.FC<{ entry: QueueEntry; isCompleted?: boolean; isCancelled?: boolean; position?: number }> = ({ entry, isCompleted, isCancelled, position }) => {
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
              {!isCompleted && !isCancelled && position !== undefined && (
                <Tag color="blue" style={{ fontSize: "16px", fontWeight: "bold", padding: "4px 12px", margin: 0 }}>
                  #{position}
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

          {/* Row 2: Cancellation reason badge (for cancelled/no_show entries) */}
          {isCancelled && (
            <div>
              <Tag color="red" style={{ margin: 0 }}>
                {getCancellationReasonLabel(entry.cancellation_reason)}
              </Tag>
            </div>
          )}

          {/* Row 2: Status badge (for ongoing/waiting) */}
          {!isCompleted && !isCancelled && (
            <div>
              <Tag color={getStatusColor(entry.status)} style={{ margin: 0 }}>
                {entry.status.replace('_', ' ').toUpperCase()}
              </Tag>
            </div>
          )}

          {/* Row 3: Time info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {isCancelled ? (
              // For cancelled: show check-in time and cancelled time
              <>
                <Text type="secondary">Check-in: {formatTime(entry.check_in_time)}</Text>
                {entry.cancelled_at && (
                  <Text type="secondary">Cancelled: {formatTime(entry.cancelled_at)}</Text>
                )}
              </>
            ) : isCompleted ? (
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
          {/* Row 1: Back button and Date controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/queues")}
            >
              Back to Queue List
            </Button>
            <Space>
              <DatePicker
                value={selectedDate}
                onChange={(date) => date && setSelectedDate(date)}
                disabledDate={(current) => current && current > getTodayPH().endOf('day')}
                allowClear={false}
                format="MMM D, YYYY"
              />
              {!isToday && (
                <Button onClick={() => setSelectedDate(getTodayPH())}>
                  Back to Today
                </Button>
              )}
              {isToday && (
                <>
                  <Text type="secondary">
                    Refreshing in {countdown}s
                  </Text>
                  <Button
                    icon={<SyncOutlined spin={loading} />}
                    onClick={() => {
                      fetchQueueEntries();
                      setCountdown(30);
                    }}
                    loading={loading}
                  >
                    Refresh
                  </Button>
                </>
              )}
            </Space>
          </div>

          {/* Row 2: Doctor name and status */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <Title level={3} style={{ margin: 0 }}>
              Dr. {doctorInfo.first_name} {doctorInfo.last_name}
            </Title>
            {isToday ? (
              isDoctorClockedIn(doctorInfo.is_in_timestamp) ? (
                <Tag color="green" style={{ fontSize: "14px", padding: "4px 12px" }}>
                  CLOCKED IN
                </Tag>
              ) : (
                <Tag color="red" style={{ fontSize: "14px", padding: "4px 12px" }}>
                  CLOCKED OUT
                </Tag>
              )
            ) : (
              <Tag color="purple" icon={<HistoryOutlined />} style={{ fontSize: "14px", padding: "4px 12px" }}>
                HISTORICAL VIEW
              </Tag>
            )}
          </div>

          {/* Row 3: Clinic and Specialization */}
          <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
            <Text type="secondary">
              <Text strong>Clinic:</Text> {doctorInfo.clinics?.name || "N/A"}
            </Text>
            <Text type="secondary">
              <Text strong>Specialization:</Text> {doctorInfo.specialization || "N/A"}
            </Text>
          </Space>
        </Card>

        {/* Queue Sections */}
        <Row gutter={16}>
          {/* Ongoing */}
          <Col span={6}>
            <Card
              title={
                <Space>
                  <Text strong>Ongoing</Text>
                  <Tag color="cyan">{ongoing.length}</Tag>
                </Space>
              }
              headStyle={{ backgroundColor: columnColors.ongoing }}
            >
              {ongoing.length === 0 ? (
                <Text type="secondary">No ongoing patients</Text>
              ) : (
                ongoing.map((entry, index) => <QueueCard key={entry.id} entry={entry} position={index + 1} />)
              )}
            </Card>
          </Col>

          {/* Waiting */}
          <Col span={6}>
            <Card
              title={
                <Space>
                  <Text strong>Waiting</Text>
                  <Tag color="orange">{waiting.length}</Tag>
                </Space>
              }
              headStyle={{ backgroundColor: columnColors.waiting }}
            >
              {waiting.length === 0 ? (
                <Text type="secondary">No patients waiting</Text>
              ) : (
                waiting.map((entry, index) => <QueueCard key={entry.id} entry={entry} position={ongoing.length + index + 1} />)
              )}
            </Card>
          </Col>

          {/* Completed */}
          <Col span={6}>
            <Card
              title={
                <Space>
                  <Text strong>{isToday ? "Completed" : `Completed (${selectedDate.format('MMM D')})`}</Text>
                  <Tag color="green">{completed.length}</Tag>
                </Space>
              }
              headStyle={{ backgroundColor: columnColors.completed }}
            >
              {completed.length === 0 ? (
                <Text type="secondary">No completed patients</Text>
              ) : (
                completed.map((entry) => <QueueCard key={entry.id} entry={entry} isCompleted />)
              )}
            </Card>
          </Col>

          {/* Cancelled */}
          <Col span={6}>
            <Card
              title={
                <Space>
                  <Text strong>{isToday ? "Cancelled" : `Cancelled (${selectedDate.format('MMM D')})`}</Text>
                  <Tag color="red">{cancelled.length}</Tag>
                </Space>
              }
              headStyle={{ backgroundColor: columnColors.cancelled }}
            >
              {cancelled.length === 0 ? (
                <Text type="secondary">No cancelled patients</Text>
              ) : (
                cancelled.map((entry) => <QueueCard key={entry.id} entry={entry} isCancelled />)
              )}
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
};
