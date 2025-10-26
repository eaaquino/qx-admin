import React from "react";
import {
  DateField,
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import { Space, Table, Tag, Image } from "antd";
import type { BaseRecord } from "@refinedev/core";

export const CampaignList: React.FC = () => {
  const { tableProps } = useTable({
    syncWithLocation: true,
    sorters: {
      initial: [
        {
          field: "priority",
          order: "desc",
        },
      ],
    },
  });

  const isActive = (record: BaseRecord) => {
    const now = new Date();
    const startDate = new Date(record.start_date);
    const endDate = record.end_date ? new Date(record.end_date) : null;

    return (
      record.is_active &&
      startDate <= now &&
      (!endDate || endDate >= now)
    );
  };

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column
          dataIndex="image_url"
          title="Banner"
          width={120}
          render={(value: string, record: BaseRecord) => (
            value ? (
              <Image
                src={value}
                alt={record.title}
                width={100}
                height={60}
                style={{ objectFit: "cover", borderRadius: "4px" }}
                preview
              />
            ) : (
              <div style={{
                width: 100,
                height: 60,
                background: "#f0f0f0",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                color: "#999"
              }}>
                No image
              </div>
            )
          )}
        />
        <Table.Column dataIndex="title" title="Title" sorter />
        <Table.Column
          dataIndex="description"
          title="Description"
          ellipsis
        />
        <Table.Column
          dataIndex="priority"
          title="Priority"
          sorter
          render={(value: number) => (
            <Tag color={value > 5 ? "red" : value > 0 ? "orange" : "default"}>
              {value}
            </Tag>
          )}
        />
        <Table.Column
          dataIndex="start_date"
          title="Start Date"
          render={(value: any) => <DateField value={value} format="LL" />}
          sorter
        />
        <Table.Column
          dataIndex="end_date"
          title="End Date"
          render={(value: any) =>
            value ? <DateField value={value} format="LL" /> : "No end date"
          }
        />
        <Table.Column
          dataIndex="is_active"
          title="Status"
          render={(_, record: BaseRecord) => (
            <Tag color={isActive(record) ? "green" : "red"}>
              {isActive(record) ? "Active" : "Inactive"}
            </Tag>
          )}
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
