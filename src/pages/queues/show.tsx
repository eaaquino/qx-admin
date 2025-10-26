import React from "react";
import { DateField, Show, TextField } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import { Typography, Descriptions, Tag } from "antd";

const { Title } = Typography;

export const QueueShow: React.FC = () => {
  const { queryResult } = useShow();
  const { data, isLoading } = queryResult;

  const record = data?.data;

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
    <Show isLoading={isLoading}>
      <Title level={5}>Queue Entry Details</Title>
      <Descriptions bordered column={1}>
        <Descriptions.Item label="Position">
          <TextField value={record?.queue_position} />
        </Descriptions.Item>
        <Descriptions.Item label="Patient">
          <TextField value={record?.patients?.name || "N/A"} />
        </Descriptions.Item>
        <Descriptions.Item label="Doctor">
          <TextField
            value={
              record?.doctors
                ? `Dr. ${record.doctors.first_name} ${record.doctors.last_name}`
                : "N/A"
            }
          />
        </Descriptions.Item>
        <Descriptions.Item label="Clinic">
          <TextField value={record?.clinics?.name || "N/A"} />
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          {record?.status && (
            <Tag color={getStatusColor(record.status)}>
              {record.status.toUpperCase()}
            </Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Reason for Visit">
          <TextField
            value={record?.reason_for_visit?.replace("-", " ").toUpperCase()}
          />
        </Descriptions.Item>
        <Descriptions.Item label="Estimated Wait Time">
          <TextField value={`${record?.estimated_wait_time || "N/A"} minutes`} />
        </Descriptions.Item>
        <Descriptions.Item label="Check-in Time">
          <DateField value={record?.check_in_time} />
        </Descriptions.Item>
        <Descriptions.Item label="Called Time">
          {record?.called_time ? (
            <DateField value={record.called_time} />
          ) : (
            "Not yet called"
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Completed Time">
          {record?.completed_time ? (
            <DateField value={record.completed_time} />
          ) : (
            "Not completed"
          )}
        </Descriptions.Item>
      </Descriptions>
    </Show>
  );
};
