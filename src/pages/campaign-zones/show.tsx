import React from "react";
import { DateField, TextField } from "@refinedev/antd";
import { Show } from "../../components/buttons";
import { useShow } from "@refinedev/core";
import { Typography, Descriptions, Tag } from "antd";

const { Title } = Typography;

export const CampaignZoneShow: React.FC = () => {
  const { query } = useShow();
  const { data, isLoading } = query;

  const record = data?.data;

  return (
    <Show isLoading={isLoading}>
      <Title level={5}>Campaign Zone Details</Title>
      <Descriptions bordered column={1}>
        <Descriptions.Item label="Name">
          <TextField value={record?.name} />
        </Descriptions.Item>
        <Descriptions.Item label="Description">
          <TextField value={record?.description || "N/A"} />
        </Descriptions.Item>
        <Descriptions.Item label="Type">
          <Tag color={record?.is_universal ? "purple" : "blue"}>
            {record?.is_universal ? "Universal (shows to all doctors)" : "Targeted (requires assignment)"}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={record?.is_active ? "green" : "red"}>
            {record?.is_active ? "Active" : "Inactive"}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Created">
          <DateField value={record?.created_at} />
        </Descriptions.Item>
        <Descriptions.Item label="Updated">
          <DateField value={record?.updated_at} />
        </Descriptions.Item>
      </Descriptions>
    </Show>
  );
};
