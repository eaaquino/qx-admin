import React from "react";
import {
  DateField,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import { Space, Table, Tag, Button } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import type { BaseRecord } from "@refinedev/core";
import { DeleteButton, List } from "../../components/buttons";

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

export const PatientList: React.FC = () => {
  const { tableProps } = useTable({
    syncWithLocation: true,
    sorters: {
      initial: [
        {
          field: "created_at",
          order: "desc",
        },
      ],
    },
    meta: {
      select: "*, queue_entries(doctor_id, reason_for_visit, doctors(first_name, last_name))",
    },
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title="Name" sorter />
        <Table.Column dataIndex="age" title="Age" sorter />
        <Table.Column
          dataIndex="sex"
          title="Sex"
          render={(value: string | null) => getSexLabel(value)}
        />
        <Table.Column
          dataIndex="queue_entries"
          title="Doctor"
          render={(queueEntries: any[]) => {
            if (!queueEntries || queueEntries.length === 0) return "N/A";
            // Get the most recent queue entry's doctor
            const latestEntry = queueEntries[queueEntries.length - 1];
            const doctor = latestEntry?.doctors;
            if (!doctor) return "N/A";
            return (
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
            );
          }}
        />
        <Table.Column
          dataIndex="queue_entries"
          title="Reason for Visit"
          render={(queueEntries: any[]) => {
            if (!queueEntries || queueEntries.length === 0) return "N/A";
            // Get the most recent queue entry's reason
            const latestEntry = queueEntries[queueEntries.length - 1];
            const reason = latestEntry?.reason_for_visit;
            if (!reason) return "N/A";
            const badge = getReasonBadge(reason);
            return <Tag color={badge.color}>{badge.label}</Tag>;
          }}
        />
        <Table.Column
          dataIndex="created_at"
          title="Registered"
          render={(value: any) => <DateField value={value} format="LL" />}
          sorter
        />
        <Table.Column
          title="Actions"
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <ShowButton hideText size="small" recordItemId={record.id} />
              <DeleteButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
