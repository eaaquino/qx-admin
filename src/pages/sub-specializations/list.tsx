import React from "react";
import {
  DateField,
  useTable,
} from "@refinedev/antd";
import { useMany } from "@refinedev/core";
import { Space, Table, Tag, Badge } from "antd";
import type { BaseRecord } from "@refinedev/core";
import { EditButton, DeleteButton, List } from "../../components/buttons";

export const SubSpecializationList: React.FC = () => {
  const { tableProps } = useTable({
    syncWithLocation: true,
    sorters: {
      initial: [
        {
          field: "specialization_id",
          order: "asc",
        },
        {
          field: "display_order",
          order: "asc",
        },
      ],
    },
  });

  // Get unique specialization IDs from table data
  const specializationIds = tableProps?.dataSource
    ?.map((item: any) => item.specialization_id)
    .filter((id: string, index: number, self: string[]) => id && self.indexOf(id) === index) || [];

  // Fetch parent specializations
  const specializationsQuery = useMany({
    resource: "specializations",
    ids: specializationIds,
    queryOptions: {
      enabled: specializationIds.length > 0,
    },
  });
  const specializationsData = specializationsQuery.result;
  const specializationsLoading = specializationsQuery.query.isLoading;

  const getSpecializationName = (id: string) => {
    const spec = specializationsData?.data?.find((s: any) => s.id === id);
    return spec?.name || "Unknown";
  };

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
        <Table.Column dataIndex="name" title="Sub-Specialization Name" sorter />
        <Table.Column
          dataIndex="specialization_id"
          title="Parent Specialization"
          render={(value: string) => (
            specializationsLoading ? "Loading..." : getSpecializationName(value)
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
          title="Actions"
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} />
              <DeleteButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
