import React from "react";
import {
  DateField,
  DeleteButton,
  List,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import { Space, Table } from "antd";
import type { BaseRecord } from "@refinedev/core";

export const PatientList: React.FC = () => {
  const { tableProps } = useTable({
    syncWithLocation: true,
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title="Name" sorter />
        <Table.Column dataIndex="age" title="Age" sorter />
        <Table.Column dataIndex="phone" title="Phone" />
        <Table.Column dataIndex="email" title="Email" />
        <Table.Column
          dataIndex="created_at"
          title="Registered"
          render={(value: any) => <DateField value={value} format="LL" />}
          sorter
        />
        <Table.Column
          title="Actions"
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <ShowButton hideText size="small" recordItemId={record.id} />
              <DeleteButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
