import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Card, Typography, Tag, Space, Button, Descriptions, Row, Col, Divider } from "antd";
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
  patients: {
    name: string;
    phone: string;
  };
}

interface DoctorInfo {
  id: string;
  first_name: string;
  last_name: string;
  specialization: string;
  clinics: {
    name: string;
  };
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
        .select("id, first_name, last_name, specialization, clinics(name)")
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);

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
  const completed = queueEntries.filter((e) => e.status === "completed");

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const QueueCard: React.FC<{ entry: QueueEntry }> = ({ entry }) => (
    <Card
      size="small"
      style={{ marginBottom: 8 }}
      bodyStyle={{ padding: "12px 16px" }}
    >
      <Space direction="vertical" style={{ width: "100%" }} size={4}>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Space>
            <Tag color="blue" style={{ fontSize: "16px", fontWeight: "bold", padding: "4px 12px" }}>
              #{entry.queue_position}
            </Tag>
            <Text strong style={{ fontSize: "16px" }}>{entry.patients.name}</Text>
          </Space>
          <Tag color={getStatusColor(entry.status)}>{entry.status.toUpperCase()}</Tag>
        </Space>
        <Space split={<Divider type="vertical" />} style={{ fontSize: "12px" }}>
          <Text type="secondary">Reason: {entry.reason_for_visit.replace(/-/g, " ")}</Text>
          <Text type="secondary">Check-in: {formatTime(entry.check_in_time)}</Text>
          {entry.estimated_wait_time && (
            <Text type="secondary">Est. Wait: {entry.estimated_wait_time} min</Text>
          )}
        </Space>
      </Space>
    </Card>
  );

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
            <Descriptions.Item label="Status">
              <Tag color="green">● LIVE</Tag>
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
                completed.map((entry) => <QueueCard key={entry.id} entry={entry} />)
              )}
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
};
