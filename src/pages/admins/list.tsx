import React from "react";
import {
  DateField,
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import { Space, Table, Tag } from "antd";
import type { BaseRecord } from "@refinedev/core";

export const AdminList: React.FC = () => {
  const { tableProps } = useTable({
    syncWithLocation: true,
  });

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
              <DeleteButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
