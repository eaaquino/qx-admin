import React from "react";
import { DateField, Show, TextField } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import { Typography, Descriptions } from "antd";

const { Title } = Typography;

export const PatientShow: React.FC = () => {
  const { queryResult } = useShow();
  const { data, isLoading } = queryResult;

  const record = data?.data;

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
        <Descriptions.Item label="Phone">
          <TextField value={record?.phone || "N/A"} />
        </Descriptions.Item>
        <Descriptions.Item label="Email">
          <TextField value={record?.email || "N/A"} />
        </Descriptions.Item>
        <Descriptions.Item label="Registered">
          <DateField value={record?.created_at} />
        </Descriptions.Item>
      </Descriptions>
    </Show>
  );
};
