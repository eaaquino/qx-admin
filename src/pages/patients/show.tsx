import React from "react";
import { DateField, TextField } from "@refinedev/antd";
import { Show } from "../../components/buttons";
import { useShow } from "@refinedev/core";
import { Typography, Descriptions, Tag, Space, Button } from "antd";
import { ExportOutlined } from "@ant-design/icons";

const { Title } = Typography;

// Get sex display label
const getSexLabel = (sex: string | null): string => {
  const labels: Record<string, string> = {
    'male': 'Male',
    'female': 'Female',
    'other': 'Other',
    'prefer_not_to_say': 'Prefer not to say',
  };
  return sex ? labels[sex] || sex : 'N/A';
};

// Get reason badge color and label
const getReasonBadge = (reason: string): { color: string; label: string } => {
  const reasonLower = reason?.toLowerCase() || '';
  if (reasonLower.includes('follow')) {
    return { color: 'green', label: 'Follow-up' };
  }
  if (reasonLower.includes('med') || reasonLower.includes('cert')) {
    return { color: 'gold', label: 'Med Cert' };
  }
  if (reasonLower.includes('consult')) {
    return { color: 'purple', label: 'Consult' };
  }
  if (reasonLower.includes('checkup')) {
    return { color: 'blue', label: 'Checkup' };
  }
  if (reasonLower.includes('prescription')) {
    return { color: 'cyan', label: 'Prescription' };
  }
  if (reasonLower.includes('emergency')) {
    return { color: 'red', label: 'Emergency' };
  }
  return { color: 'default', label: reason || 'N/A' };
};

export const PatientShow: React.FC = () => {
  const { query } = useShow({
    meta: {
      select: "*, queue_entries(doctor_id, reason_for_visit, doctors(first_name, last_name))",
    },
  });
  const { data, isLoading } = query;

  const record = data?.data;

  // Get the most recent queue entry
  const queueEntries = record?.queue_entries || [];
  const latestEntry = queueEntries.length > 0 ? queueEntries[queueEntries.length - 1] : null;
  const doctor = latestEntry?.doctors;
  const reason = latestEntry?.reason_for_visit;

  return (
    <Show isLoading={isLoading}>
      <Title level={5}>Patient Details</Title>
      <Descriptions bordered column={1}>
        <Descriptions.Item label="Name">
          <TextField value={record?.name} />
        </Descriptions.Item>
        <Descriptions.Item label="Age">
          <TextField value={record?.age} />
        </Descriptions.Item>
        <Descriptions.Item label="Sex">
          <TextField value={getSexLabel(record?.sex)} />
        </Descriptions.Item>
        <Descriptions.Item label="Doctor">
          {doctor ? (
            <Space size={4}>
              <span>Dr. {doctor.first_name} {doctor.last_name}</span>
              <Button
                type="link"
                size="small"
                icon={<ExportOutlined />}
                href={`/doctors/show/${latestEntry.doctor_id}`}
                target="_blank"
                style={{ padding: 0, height: 'auto' }}
              />
            </Space>
          ) : (
            "N/A"
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Reason for Visit">
          {reason ? (
            <Tag color={getReasonBadge(reason).color}>
              {getReasonBadge(reason).label}
            </Tag>
          ) : (
            "N/A"
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Registered">
          <DateField value={record?.created_at} />
        </Descriptions.Item>
      </Descriptions>
    </Show>
  );
};
