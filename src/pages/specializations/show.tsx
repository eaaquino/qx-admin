import React from "react";
import { DateField, Show, TextField } from "@refinedev/antd";
import { useShow, useList } from "@refinedev/core";
import { Typography, Tag, Table, Card, Space, Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { Link } from "react-router";

const { Title } = Typography;

export const SpecializationShow: React.FC = () => {
  const { query, result } = useShow();
  const { isLoading } = query;
  const record = result;

  // Fetch sub-specializations for this specialization
  const subSpecList = useList({
    resource: "sub_specializations",
    filters: [
      {
        field: "specialization_id",
        operator: "eq",
        value: record?.id,
      },
    ],
    sorters: [
      {
        field: "display_order",
        order: "asc",
      },
    ],
    queryOptions: {
      enabled: !!record?.id,
    },
  });
  const subSpecLoading = subSpecList.query.isLoading;
  const subSpecData = subSpecList.result;

  return (
    <Show isLoading={isLoading}>
      <Title level={5}>Specialization Name</Title>
      <TextField value={record?.name} />

      <Title level={5}>Display Order</Title>
      <TextField value={record?.display_order ?? 0} />

      <Title level={5}>Status</Title>
      <Tag color={record?.is_active ? "green" : "red"}>
        {record?.is_active ? "Active" : "Inactive"}
      </Tag>

      <Title level={5}>Created At</Title>
      <DateField value={record?.created_at} format="LLL" />

      <Title level={5}>Updated At</Title>
      <DateField value={record?.updated_at} format="LLL" />

      <Card
        title="Sub-Specializations"
        style={{ marginTop: 24 }}
        extra={
          <Link to={`/sub-specializations/create?specialization_id=${record?.id}`}>
            <Button type="primary" icon={<PlusOutlined />} size="small">
              Add Sub-Specialization
            </Button>
          </Link>
        }
      >
        <Table
          dataSource={subSpecData?.data || []}
          loading={subSpecLoading}
          rowKey="id"
          pagination={false}
          size="small"
        >
          <Table.Column dataIndex="name" title="Name" />
          <Table.Column
            dataIndex="display_order"
            title="Order"
            width={80}
          />
          <Table.Column
            dataIndex="is_active"
            title="Status"
            width={100}
            render={(value: boolean) => (
              <Tag color={value ? "green" : "red"} style={{ margin: 0 }}>
                {value ? "Active" : "Inactive"}
              </Tag>
            )}
          />
          <Table.Column
            title="Actions"
            width={120}
            render={(_, subRecord: any) => (
              <Space>
                <Link to={`/sub-specializations/edit/${subRecord.id}`}>
                  <Button size="small">Edit</Button>
                </Link>
              </Space>
            )}
          />
        </Table>
        {(!subSpecData?.data || subSpecData.data.length === 0) && !subSpecLoading && (
          <div style={{ textAlign: "center", padding: "20px", color: "#999" }}>
            No sub-specializations defined yet
          </div>
        )}
      </Card>
    </Show>
  );
};
