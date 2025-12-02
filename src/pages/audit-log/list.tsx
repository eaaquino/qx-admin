import React, { useState, useEffect } from "react";
import { List, DateField, useTable } from "@refinedev/antd";
import { Table, Tag, Select, DatePicker, Space, Typography, Tooltip } from "antd";
import type { BaseRecord } from "@refinedev/core";
import dayjs from "dayjs";
import { supabaseClient } from "../../utility";

const { Text } = Typography;
const { RangePicker } = DatePicker;

const ACTION_COLORS: Record<string, string> = {
  INSERT: "green",
  UPDATE: "blue",
  DELETE: "red",
};

const TABLE_LABELS: Record<string, string> = {
  admins: "Admins",
  doctors: "Doctors",
  clinics: "Clinics",
  patients: "Patients",
  doctor_schedules: "Doctor Schedules",
  doctor_schedule_exceptions: "Schedule Exceptions",
  ad_campaigns: "Ad Campaigns",
  campaign_zones: "Campaign Zones",
  campaign_zone_assignments: "Zone Assignments",
};

interface AdminInfo {
  first_name: string;
  last_name: string;
  email: string;
}

export const AuditLogList: React.FC = () => {
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [adminMap, setAdminMap] = useState<Record<string, AdminInfo>>({});

  const { tableProps } = useTable({
    resource: "audit_log",
    sorters: {
      initial: [{ field: "changed_at", order: "desc" }],
    },
    filters: {
      permanent: [
        ...(selectedTables.length > 0
          ? [{ field: "table_name", operator: "in" as const, value: selectedTables }]
          : []),
        ...(selectedActions.length > 0
          ? [{ field: "action", operator: "in" as const, value: selectedActions }]
          : []),
        ...(dateRange && dateRange[0]
          ? [{ field: "changed_at", operator: "gte" as const, value: dateRange[0].startOf('day').toISOString() }]
          : []),
        ...(dateRange && dateRange[1]
          ? [{ field: "changed_at", operator: "lte" as const, value: dateRange[1].endOf('day').toISOString() }]
          : []),
      ],
    },
  });

  // Fetch admin info for changed_by user IDs
  useEffect(() => {
    const fetchAdmins = async () => {
      const records = tableProps.dataSource || [];
      const userIds = [...new Set(records.map((r: BaseRecord) => r.changed_by).filter(Boolean))];

      if (userIds.length === 0) return;

      const { data } = await supabaseClient
        .from("admins")
        .select("auth_user_id, first_name, last_name, email")
        .in("auth_user_id", userIds);

      if (data) {
        const map: Record<string, AdminInfo> = {};
        data.forEach((admin) => {
          map[admin.auth_user_id] = {
            first_name: admin.first_name,
            last_name: admin.last_name,
            email: admin.email,
          };
        });
        setAdminMap(map);
      }
    };

    fetchAdmins();
  }, [tableProps.dataSource]);

  const renderChangedFields = (fields: string[] | null) => {
    if (!fields || fields.length === 0) return null;
    return (
      <Space size={[0, 4]} wrap>
        {fields.map((field) => (
          <Tag key={field} style={{ margin: 0 }}>
            {field}
          </Tag>
        ))}
      </Space>
    );
  };

  const renderChangedBy = (record: BaseRecord) => {
    const admin = adminMap[record.changed_by];
    if (admin) {
      return (
        <Tooltip title={admin.email}>
          <Text>{admin.first_name} {admin.last_name}</Text>
        </Tooltip>
      );
    }
    return <Text type="secondary">System</Text>;
  };

  // Fields to display as summary for each table
  const getSummaryFields = (tableName: string): string[] => {
    const fieldMap: Record<string, string[]> = {
      admins: ["first_name", "last_name", "email"],
      doctors: ["first_name", "last_name", "email"],
      clinics: ["name", "address"],
      patients: ["first_name", "last_name", "email"],
      doctor_schedules: ["day_of_week", "start_time", "end_time"],
      doctor_schedule_exceptions: ["exception_date", "reason"],
      ad_campaigns: ["name", "campaign_type"],
      campaign_zones: ["name", "description"],
      campaign_zone_assignments: ["zone_id", "doctor_id", "clinic_id"],
    };
    return fieldMap[tableName] || ["name", "id"];
  };

  const renderRecordSummary = (data: Record<string, any>, tableName: string) => {
    const fields = getSummaryFields(tableName);
    const summaryParts = fields
      .map((field) => data?.[field])
      .filter((val) => val !== null && val !== undefined && val !== "");

    if (summaryParts.length > 0) {
      return <Text strong>{summaryParts.join(" - ")}</Text>;
    }
    return <Text type="secondary">ID: {data?.id}</Text>;
  };

  const renderDataDiff = (record: BaseRecord) => {
    if (record.action === "INSERT") {
      return (
        <div>
          <Text type="secondary">Created: </Text>
          {renderRecordSummary(record.new_data, record.table_name)}
        </div>
      );
    }
    if (record.action === "DELETE") {
      return (
        <div>
          <Text type="secondary">Deleted: </Text>
          {renderRecordSummary(record.old_data, record.table_name)}
        </div>
      );
    }
    if (record.action === "UPDATE" && record.changed_fields) {
      const changes = record.changed_fields.map((field: string) => {
        const oldVal = record.old_data?.[field];
        const newVal = record.new_data?.[field];
        return (
          <div key={field} style={{ marginBottom: 4 }}>
            <Text strong>{field}:</Text>{" "}
            <Text delete type="secondary">{JSON.stringify(oldVal)}</Text>
            {" → "}
            <Text>{JSON.stringify(newVal)}</Text>
          </div>
        );
      });
      return <div style={{ maxWidth: 400 }}>{changes}</div>;
    }
    return null;
  };

  return (
    <List title="Audit Log">
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          mode="multiple"
          placeholder="Filter by table"
          style={{ minWidth: 200 }}
          value={selectedTables}
          onChange={setSelectedTables}
          allowClear
          options={Object.entries(TABLE_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Select
          mode="multiple"
          placeholder="Filter by action"
          style={{ minWidth: 150 }}
          value={selectedActions}
          onChange={setSelectedActions}
          allowClear
          options={[
            { value: "INSERT", label: "Insert" },
            { value: "UPDATE", label: "Update" },
            { value: "DELETE", label: "Delete" },
          ]}
        />
        <RangePicker
          value={dateRange}
          onChange={(dates) => setDateRange(dates)}
          allowClear
        />
      </Space>

      <Table {...tableProps} rowKey="id" size="middle">
        <Table.Column
          dataIndex="changed_at"
          title="Time"
          width={180}
          render={(value: string) => (
            <DateField value={value} format="MMM D, YYYY h:mm A" />
          )}
          sorter
        />
        <Table.Column
          dataIndex="table_name"
          title="Table"
          width={150}
          render={(value: string) => TABLE_LABELS[value] || value}
        />
        <Table.Column
          dataIndex="action"
          title="Action"
          width={100}
          render={(value: string) => (
            <Tag color={ACTION_COLORS[value]}>{value}</Tag>
          )}
        />
        <Table.Column
          dataIndex="changed_fields"
          title="Changed Fields"
          width={200}
          render={(value: string[]) => renderChangedFields(value)}
        />
        <Table.Column
          title="Changes"
          render={(_, record: BaseRecord) => renderDataDiff(record)}
        />
        <Table.Column
          title="Changed By"
          width={150}
          render={(_, record: BaseRecord) => renderChangedBy(record)}
        />
      </Table>
    </List>
  );
};
