import React from "react";
import { DateField, Show, TextField } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import { Typography, Descriptions, Tag } from "antd";

const { Title } = Typography;

export const AdminShow: React.FC = () => {
  const { queryResult } = useShow();
  const { data, isLoading } = queryResult;

  const record = data?.data;

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: "red",
      admin: "blue",
      viewer: "green",
    };
    return colors[role] || "default";
  };

  return (
    <Show isLoading={isLoading}>
      <Title level={5}>Admin Details</Title>
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
        <Descriptions.Item label="Role">
          {record?.role && (
            <Tag color={getRoleColor(record.role)}>
              {record.role.replace("_", " ").toUpperCase()}
            </Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={record?.is_active ? "green" : "red"}>
            {record?.is_active ? "Active" : "Inactive"}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Auth User ID">
          <TextField value={record?.auth_user_id} />
        </Descriptions.Item>
        <Descriptions.Item label="Last Login">
          {record?.last_login ? (
            <DateField value={record.last_login} />
          ) : (
            "Never"
          )}
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
