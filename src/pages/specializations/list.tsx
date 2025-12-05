import React from "react";
import {
  DateField,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import { Space, Table, Tag, Badge } from "antd";
import type { BaseRecord } from "@refinedev/core";
import { EditButton, DeleteButton, List } from "../../components/buttons";

export const SpecializationList: React.FC = () => {
  const { tableProps } = useTable({
    syncWithLocation: true,
    sorters: {
      initial: [
        {
          field: "display_order",
          order: "asc",
        },
      ],
    },
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column
          dataIndex="display_order"
          title="Order"
          sorter
          width={80}
          render={(value: number) => (
            <Badge count={value} showZero color={value === 0 ? "default" : "blue"} />
          )}
        />
        <Table.Column dataIndex="name" title="Specialization Name" sorter />
        <Table.Column
          dataIndex="is_active"
          title="Status"
          render={(value: boolean) => (
            <Tag color={value ? "green" : "red"}>
              {value ? "Active" : "Inactive"}
            </Tag>
          )}
          filters={[
            { text: "Active", value: true },
            { text: "Inactive", value: false },
          ]}
        />
        <Table.Column
          dataIndex="created_at"
          title="Created"
          render={(value: any) => <DateField value={value} format="LL" />}
          sorter
        />
        <Table.Column
          dataIndex="updated_at"
          title="Updated"
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
