import React from "react";
import { DateField, Show, TextField } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import { Typography, Descriptions, Tag, Avatar } from "antd";

const { Title } = Typography;

export const AdminShow: React.FC = () => {
  const { query } = useShow();
  const { data, isLoading } = query;

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Avatar
          size={80}
          src={record?.profile_photo_url}
          style={{ backgroundColor: '#004777', fontSize: '32px', fontWeight: 'bold' }}
        >
          {record?.first_name?.charAt(0)}{record?.last_name?.charAt(0)}
        </Avatar>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            {record?.first_name} {record?.last_name}
          </Title>
          {record?.role && (
            <Tag color={getRoleColor(record.role)} style={{ marginTop: '8px' }}>
              {record.role.replace("_", " ").toUpperCase()}
            </Tag>
          )}
        </div>
      </div>
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
