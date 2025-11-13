import React, { useState, useMemo, useEffect } from "react";
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
import type { CrudFilters } from "@refinedev/core";
import { MultiSelectFilter } from "../../components";
import { supabaseClient } from "../../utility";

type CampaignStatus = "active" | "scheduled" | "expired" | "disabled";

export const CampaignList: React.FC = () => {
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([
    "active",
    "scheduled",
  ]);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [campaignZones, setCampaignZones] = useState<Array<{ id: string; name: string }>>([]);

  // Fetch campaign zones using Supabase directly
  useEffect(() => {
    const fetchZones = async () => {
      const { data, error } = await supabaseClient
        .from("campaign_zones")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching campaign zones:", error);
      } else {
        console.log("Fetched campaign zones:", data);
        setCampaignZones(data || []);
      }
    };

    fetchZones();
  }, []);

  const { tableProps, setFilters } = useTable({
    syncWithLocation: true,
    sorters: {
      initial: [
        {
          field: "priority",
          order: "desc",
        },
      ],
    },
    meta: {
      select: "*, campaign_zone_tags(zone_id, campaign_zones(id, name))",
    },
  });

  const handleStatusFilterChange = (statuses: string[]) => {
    setSelectedStatuses(statuses);

    const newFilters: CrudFilters = [];

    // Determine which is_active values to fetch from backend
    const hasDisabled = statuses.includes("disabled");
    const hasNonDisabled = statuses.some((s) =>
      ["active", "scheduled", "expired"].includes(s)
    );

    if (hasDisabled && !hasNonDisabled) {
      // Only disabled selected
      newFilters.push({
        field: "is_active",
        operator: "eq",
        value: false,
      });
    } else if (!hasDisabled && hasNonDisabled) {
      // Only active/scheduled/expired selected
      newFilters.push({
        field: "is_active",
        operator: "eq",
        value: true,
      });
    }
    // If both or neither selected, fetch all (no filter)

    console.log("Setting filters:", newFilters);
    setFilters(newFilters, "replace"); // Use "replace" to clear previous filters
  };

  // Apply initial filter on mount
  useEffect(() => {
    handleStatusFilterChange(selectedStatuses);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getStatus = (
    record: BaseRecord
  ): { status: string; statusType: CampaignStatus; color: string } => {
    const now = new Date();
    const startDate = new Date(record.start_date);
    const endDate = record.end_date ? new Date(record.end_date) : null;

    // Disabled campaigns
    if (!record.is_active) {
      return { status: "Disabled", statusType: "disabled", color: "red" };
    }

    // Expired campaigns
    if (endDate && endDate < now) {
      return { status: "Expired", statusType: "expired", color: "red" };
    }

    // Future/scheduled campaigns
    if (startDate > now) {
      return { status: "Scheduled", statusType: "scheduled", color: "blue" };
    }

    // Active campaigns
    return { status: "Active", statusType: "active", color: "green" };
  };

  // Filter table data based on selected statuses and zones (client-side filtering)
  const filteredDataSource = useMemo(() => {
    if (!tableProps.dataSource) {
      return tableProps.dataSource;
    }

    return tableProps.dataSource.filter((record) => {
      // Filter by status
      if (selectedStatuses.length > 0) {
        const { statusType } = getStatus(record);
        if (!selectedStatuses.includes(statusType)) {
          return false;
        }
      }

      // Filter by campaign zones
      if (selectedZones.length > 0) {
        const campaignZones = record.campaign_zone_tags?.map((tag: any) => tag.zone_id) || [];
        const hasSelectedZone = campaignZones.some((zoneId: string) =>
          selectedZones.includes(zoneId)
        );
        if (!hasSelectedZone) {
          return false;
        }
      }

      return true;
    });
  }, [tableProps.dataSource, selectedStatuses, selectedZones]);

  const filterOptions = [
    { label: "Active", value: "active" },
    { label: "Scheduled", value: "scheduled" },
    { label: "Expired", value: "expired" },
    { label: "Disabled", value: "disabled" },
  ];

  const zoneFilterOptions = useMemo(() => {
    return campaignZones.map((zone) => ({
      label: zone.name,
      value: zone.id,
    }));
  }, [campaignZones]);

  return (
    <List>
      <Space style={{ marginBottom: 16 }} size="middle" wrap>
        <MultiSelectFilter
          label="Status Filter"
          options={filterOptions}
          value={selectedStatuses}
          onChange={handleStatusFilterChange}
          placeholder="Select statuses..."
        />
        <MultiSelectFilter
          label="Campaign Zones"
          options={zoneFilterOptions}
          value={selectedZones}
          onChange={setSelectedZones}
          placeholder="Filter by zones..."
        />
      </Space>
      <Table
        {...tableProps}
        dataSource={filteredDataSource}
        rowKey="id"
      >
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
          render={(value: string) => <DateField value={value} format="LL" />}
          sorter
        />
        <Table.Column
          dataIndex="end_date"
          title="End Date"
          render={(value: string | null) =>
            value ? <DateField value={value} format="LL" /> : "No end date"
          }
        />
        <Table.Column
          dataIndex="is_active"
          title="Status"
          render={(_, record: BaseRecord) => {
            const { status, color } = getStatus(record);
            return <Tag color={color}>{status}</Tag>;
          }}
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
