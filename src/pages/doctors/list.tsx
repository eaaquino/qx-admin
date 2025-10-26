import React from "react";
import {
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import { Space, Table, Tag, Avatar } from "antd";
import type { BaseRecord } from "@refinedev/core";

export const DoctorList: React.FC = () => {
  const { tableProps } = useTable({
    syncWithLocation: true,
  });

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
        <Table.Column
          dataIndex="first_name"
          title="First Name"
          sorter
        />
        <Table.Column
          dataIndex="last_name"
          title="Last Name"
          sorter
        />
        <Table.Column
          dataIndex="email"
          title="Email"
        />
        <Table.Column
          dataIndex="specialization"
          title="Specialization"
          render={(value: string) => <Tag color="blue">{value}</Tag>}
        />
        <Table.Column
          dataIndex="license_number"
          title="License #"
        />
        <Table.Column
          dataIndex={["clinics", "name"]}
          title="Clinic"
          render={(value) => value || "N/A"}
        />
        <Table.Column
          dataIndex="intake_slug"
          title="Intake Slug"
          render={(value: string) => <Tag>{value}</Tag>}
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
