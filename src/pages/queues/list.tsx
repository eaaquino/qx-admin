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

export const QueueList: React.FC = () => {
  const { tableProps } = useTable({
    syncWithLocation: true,
    sorters: {
      initial: [
        {
          field: "check_in_time",
          order: "desc",
        },
      ],
    },
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      waiting: "blue",
      called: "orange",
      in_progress: "cyan",
      completed: "green",
      cancelled: "red",
      no_show: "default",
    };
    return colors[status] || "default";
  };

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column
          dataIndex="queue_position"
          title="Position"
          sorter
          defaultSortOrder="ascend"
        />
        <Table.Column
          dataIndex={["patients", "name"]}
          title="Patient"
          render={(value) => value || "N/A"}
        />
        <Table.Column
          dataIndex={["doctors", "first_name"]}
          title="Doctor"
          render={(value, record: BaseRecord) =>
            `Dr. ${value} ${record.doctors?.last_name || ""}`
          }
        />
        <Table.Column
          dataIndex="status"
          title="Status"
          render={(value: string) => (
            <Tag color={getStatusColor(value)}>{value.toUpperCase()}</Tag>
          )}
        />
        <Table.Column
          dataIndex="reason_for_visit"
          title="Reason"
          render={(value: string) => value.replace("-", " ").toUpperCase()}
        />
        <Table.Column
          dataIndex="estimated_wait_time"
          title="Est. Wait (min)"
          sorter
          render={(value) => value || "N/A"}
        />
        <Table.Column
          dataIndex="check_in_time"
          title="Check-in"
          render={(value: any) => <DateField value={value} format="LT" />}
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
