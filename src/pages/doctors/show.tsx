import React from "react";
import { DateField, Show, TextField } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import { Typography, Descriptions, Tag } from "antd";

const { Title } = Typography;

export const DoctorShow: React.FC = () => {
  const { queryResult } = useShow();
  const { data, isLoading } = queryResult;

  const record = data?.data;

  return (
    <Show isLoading={isLoading}>
      <Title level={5}>Doctor Details</Title>
      <Descriptions bordered column={1}>
        <Descriptions.Item label="Name">
          <TextField value={`${record?.first_name} ${record?.last_name}`} />
        </Descriptions.Item>
        <Descriptions.Item label="Email">
          <TextField value={record?.email} />
        </Descriptions.Item>
        <Descriptions.Item label="Phone">
          <TextField value={record?.phone || "N/A"} />
        </Descriptions.Item>
        <Descriptions.Item label="License Number">
          <TextField value={record?.license_number} />
        </Descriptions.Item>
        <Descriptions.Item label="Specialization">
          <Tag color="blue">{record?.specialization}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Clinic">
          <TextField value={record?.clinics?.name || "N/A"} />
        </Descriptions.Item>
        <Descriptions.Item label="Intake Slug">
          <Tag>{record?.intake_slug}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="QR Code URL">
          <TextField value={record?.qr_code_url || "Not generated"} />
        </Descriptions.Item>
        <Descriptions.Item label="Created At">
          <DateField value={record?.created_at} />
        </Descriptions.Item>
        <Descriptions.Item label="Updated At">
          <DateField value={record?.updated_at} />
        </Descriptions.Item>
      </Descriptions>
    </Show>
  );
};
