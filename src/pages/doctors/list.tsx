import React from "react";
import {
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import { Space, Table, Tag, Avatar, Button, Dropdown } from "antd";
import { BarChartOutlined, DownOutlined, CalendarOutlined } from "@ant-design/icons";
import type { BaseRecord } from "@refinedev/core";
import type { MenuProps } from "antd";
import { useNavigate } from "react-router";

export const DoctorList: React.FC = () => {
  const navigate = useNavigate();
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
          render={(_, record: BaseRecord) => {
            const analyticsItems: MenuProps['items'] = [
              {
                key: 'performance',
                label: 'Performance Metrics',
                onClick: () => navigate(`/doctors/analytics/performance/${record.id}`),
              },
              {
                key: 'history',
                label: 'Patient History',
                onClick: () => navigate(`/doctors/analytics/history/${record.id}`),
              },
            ];

            return (
              <Space>
                <ShowButton hideText size="small" recordItemId={record.id} />
                <Button
                  size="small"
                  icon={<CalendarOutlined />}
                  onClick={() => navigate(`/doctors/schedule/${record.id}`)}
                />
                <Dropdown menu={{ items: analyticsItems }} trigger={['click']}>
                  <Button size="small" icon={<BarChartOutlined />}>
                    <DownOutlined />
                  </Button>
                </Dropdown>
                <DeleteButton hideText size="small" recordItemId={record.id} />
              </Space>
            );
          }}
        />
      </Table>
    </List>
  );
};
