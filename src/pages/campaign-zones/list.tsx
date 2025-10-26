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

export const CampaignZoneList: React.FC = () => {
  const { tableProps } = useTable({
    syncWithLocation: true,
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title="Zone Name" sorter />
        <Table.Column dataIndex="description" title="Description" />
        <Table.Column
          dataIndex="is_universal"
          title="Type"
          render={(value: boolean) => (
            <Tag color={value ? "purple" : "blue"}>
              {value ? "Universal" : "Targeted"}
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
              {!record.is_universal && (
                <DeleteButton hideText size="small" recordItemId={record.id} />
              )}
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
