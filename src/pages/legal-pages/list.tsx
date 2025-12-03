import React from "react";
import { List, EditButton, DateField, useTable } from "@refinedev/antd";
import { Table, Typography } from "antd";
import type { BaseRecord } from "@refinedev/core";

const { Text } = Typography;

export const LegalPageList: React.FC = () => {
  const { tableProps } = useTable({
    resource: "legal_pages",
    syncWithLocation: true,
  });

  return (
    <List canCreate={false}>
      <Table {...tableProps} rowKey="id">
        <Table.Column
          dataIndex="title"
          title="Page"
          render={(value: string) => <Text strong>{value}</Text>}
        />
        <Table.Column
          dataIndex="id"
          title="URL"
          render={(value: string) => <Text code>/{value === "terms" ? "terms-and-conditions" : "privacy-policy"}</Text>}
        />
        <Table.Column
          dataIndex="updated_at"
          title="Last Updated"
          render={(value: string) => <DateField value={value} format="lll" />}
        />
        <Table.Column
          title="Actions"
          render={(_, record: BaseRecord) => (
            <EditButton size="small" recordItemId={record.id} />
          )}
        />
      </Table>
    </List>
  );
};
