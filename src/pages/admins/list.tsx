import React, { useState } from "react";
import {
  DateField,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import { Space, Table, Tag, Avatar, Button, Popconfirm, message } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import type { BaseRecord } from "@refinedev/core";
import { useInvalidate } from "@refinedev/core";
import { supabaseClient } from "../../utility";
import { EditButton, List } from "../../components/buttons";

export const AdminList: React.FC = () => {
  const { tableProps } = useTable({
    syncWithLocation: true,
  });
  const invalidate = useInvalidate();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (adminId: string) => {
    setDeletingId(adminId);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        message.error("Authentication required");
        return;
      }

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/manage-admin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            action: "delete",
            adminId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to delete admin");
      }

      message.success(result.message || "Admin deleted successfully");
      invalidate({ resource: "admins", invalidates: ["list"] });
    } catch (error: any) {
      console.error("Error deleting admin:", error);
      message.error(error.message || "Failed to delete admin");
    } finally {
      setDeletingId(null);
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: "red",
      admin: "blue",
      viewer: "green",
    };
    return colors[role] || "default";
  };

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column
          dataIndex="profile_photo_url"
          title="Photo"
          width={80}
          render={(value: string, record: BaseRecord) => (
            <Avatar
              size={40}
              src={value}
              style={{ backgroundColor: '#004777' }}
            >
              {record.first_name?.charAt(0)}{record.last_name?.charAt(0)}
            </Avatar>
          )}
        />
        <Table.Column dataIndex="first_name" title="First Name" sorter />
        <Table.Column dataIndex="last_name" title="Last Name" sorter />
        <Table.Column dataIndex="email" title="Email" />
        <Table.Column dataIndex="phone" title="Phone" />
        <Table.Column
          dataIndex="role"
          title="Role"
          render={(value: string) => (
            <Tag color={getRoleColor(value)}>
              {value.replace("_", " ").toUpperCase()}
            </Tag>
          )}
        />
        <Table.Column
          dataIndex="is_active"
          title="Status"
          render={(value: boolean) => (
            <Tag color={value ? "green" : "red"}>
              {value ? "Active" : "Inactive"}
            </Tag>
          )}
        />
        <Table.Column
          dataIndex="last_login"
          title="Last Login"
          render={(value: any) =>
            value ? <DateField value={value} format="LLL" /> : "Never"
          }
        />
        <Table.Column
          dataIndex="created_at"
          title="Created"
          render={(value: any) => <DateField value={value} format="LL" />}
          sorter
        />
        <Table.Column
          title="Actions"
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} />
              <ShowButton hideText size="small" recordItemId={record.id} />
              <Popconfirm
                title="Delete Admin"
                description="This will permanently delete this admin and their login. Are you sure?"
                onConfirm={() => handleDelete(record.id as string)}
                okText="Yes, Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  loading={deletingId === record.id}
                />
              </Popconfirm>
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
