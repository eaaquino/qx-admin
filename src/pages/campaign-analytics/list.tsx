import React, { useState, useMemo, useEffect } from "react";
import {
  DateField,
  List,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import { Space, Table, Tag, Image, Select, Spin, Statistic } from "antd";
import { EyeOutlined, InteractionOutlined, GiftOutlined } from "@ant-design/icons";
import type { BaseRecord } from "@refinedev/core";
import type { CrudFilters } from "@refinedev/core";
import { MultiSelectFilter } from "../../components";
import { analyticsService, getDateRange } from "../../services/analyticsService";
import { supabaseClient } from "../../utility";

type CampaignStatus = "active" | "scheduled" | "expired" | "disabled";

interface CampaignAnalytics {
  impressions: number;
  clicks: number;
  redeems: number;
  ctr: number;
  redemption_rate: number;
  loading: boolean;
}

export const CampaignAnalyticsList: React.FC = () => {
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([
    "active",
    "scheduled",
  ]);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [dateRangePreset, setDateRangePreset] = useState<string>("7days");
  const [campaignAnalytics, setCampaignAnalytics] = useState<Record<string, CampaignAnalytics>>({});
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
    pagination: {
      pageSize: 10,
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

    setFilters(newFilters, "replace"); // Use "replace" to clear previous filters
  };

  // Apply initial filter on mount
  useEffect(() => {
    handleStatusFilterChange(selectedStatuses);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch analytics for currently visible campaigns
  useEffect(() => {
    if (!tableProps.dataSource) return;

    const dateRange = getDateRange(dateRangePreset);

    tableProps.dataSource.forEach(async (campaign) => {
      const campaignId = String(campaign.id);
      if (!campaignId) return;

      // Set loading state
      setCampaignAnalytics(prev => ({
        ...prev,
        [campaignId]: { ...prev[campaignId], loading: true } as CampaignAnalytics
      }));

      try {
        const response = await analyticsService.getCampaignAnalytics(
          campaignId,
          {
            start_date: dateRange.start_date || undefined,
            end_date: dateRange.end_date || undefined
          }
        );

        if (response.success) {
          setCampaignAnalytics(prev => ({
            ...prev,
            [campaignId]: {
              impressions: response.data.impressions,
              clicks: response.data.clicks,
              redeems: response.data.redeems,
              ctr: response.data.ctr,
              redemption_rate: response.data.redemption_rate,
              loading: false,
            }
          }));
        }
      } catch (error) {
        console.error(`Error fetching analytics for campaign ${campaignId}:`, error);
        setCampaignAnalytics(prev => ({
          ...prev,
          [campaignId]: {
            impressions: 0,
            clicks: 0,
            redeems: 0,
            ctr: 0,
            redemption_rate: 0,
            loading: false,
          }
        }));
      }
    });
  }, [tableProps.dataSource, dateRangePreset]);

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

  const dateRangeOptions = [
    { label: "Today", value: "today" },
    { label: "Last 7 Days", value: "7days" },
    { label: "Last 30 Days", value: "1month" },
    { label: "Last Year", value: "1year" },
    { label: "Lifetime", value: "lifetime" },
  ];

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
        <Select
          value={dateRangePreset}
          onChange={setDateRangePreset}
          options={dateRangeOptions}
          style={{ width: 150 }}
          placeholder="Date Range"
        />
      </Space>
      <Table
        {...tableProps}
        dataSource={filteredDataSource}
        rowKey="id"
        scroll={{ x: 1400 }}
      >
        <Table.Column
          dataIndex="image_url"
          title="Banner"
          width={100}
          fixed="left"
          render={(value: string, record: BaseRecord) => (
            value ? (
              <Image
                src={value}
                alt={record.title}
                width={80}
                height={50}
                style={{ objectFit: "cover", borderRadius: "4px" }}
                preview
              />
            ) : (
              <div style={{
                width: 80,
                height: 50,
                background: "#f0f0f0",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                color: "#999"
              }}>
                No image
              </div>
            )
          )}
        />
        <Table.Column
          dataIndex="title"
          title="Title"
          sorter
          width={200}
          fixed="left"
        />
        <Table.Column
          dataIndex="is_active"
          title="Status"
          width={100}
          render={(_, record: BaseRecord) => {
            const { status, color } = getStatus(record);
            return <Tag color={color}>{status}</Tag>;
          }}
        />
        <Table.Column
          title="Impressions"
          width={120}
          render={(_, record: BaseRecord) => {
            const campaignId = String(record.id);
            const analytics = campaignAnalytics[campaignId];
            if (!analytics) return <Spin size="small" />;
            if (analytics.loading) return <Spin size="small" />;
            return (
              <Statistic
                value={analytics.impressions}
                prefix={<EyeOutlined />}
                valueStyle={{ fontSize: 14 }}
              />
            );
          }}
        />
        <Table.Column
          title="Clicks"
          width={120}
          render={(_, record: BaseRecord) => {
            const campaignId = String(record.id);
            const analytics = campaignAnalytics[campaignId];
            if (!analytics) return <Spin size="small" />;
            if (analytics.loading) return <Spin size="small" />;
            return (
              <Statistic
                value={analytics.clicks}
                prefix={<InteractionOutlined />}
                valueStyle={{ fontSize: 14 }}
              />
            );
          }}
        />
        <Table.Column
          title="Redemptions"
          width={120}
          render={(_, record: BaseRecord) => {
            const campaignId = String(record.id);
            const analytics = campaignAnalytics[campaignId];
            if (!analytics) return <Spin size="small" />;
            if (analytics.loading) return <Spin size="small" />;
            return (
              <Statistic
                value={analytics.redeems}
                prefix={<GiftOutlined />}
                valueStyle={{ fontSize: 14 }}
              />
            );
          }}
        />
        <Table.Column
          title="CTR"
          width={100}
          render={(_, record: BaseRecord) => {
            const campaignId = String(record.id);
            const analytics = campaignAnalytics[campaignId];
            if (!analytics) return <Spin size="small" />;
            if (analytics.loading) return <Spin size="small" />;
            return (
              <Statistic
                value={analytics.ctr}
                suffix="%"
                precision={2}
                valueStyle={{ fontSize: 14 }}
              />
            );
          }}
        />
        <Table.Column
          title="Redemption Rate"
          width={150}
          render={(_, record: BaseRecord) => {
            const campaignId = String(record.id);
            const analytics = campaignAnalytics[campaignId];
            if (!analytics) return <Spin size="small" />;
            if (analytics.loading) return <Spin size="small" />;
            return (
              <Statistic
                value={analytics.redemption_rate}
                suffix="%"
                precision={2}
                valueStyle={{ fontSize: 14 }}
              />
            );
          }}
        />
        <Table.Column
          dataIndex="start_date"
          title="Start Date"
          width={120}
          render={(value: string) => <DateField value={value} format="ll" />}
        />
        <Table.Column
          title="Actions"
          dataIndex="actions"
          width={100}
          fixed="right"
          render={(_, record: BaseRecord) => (
            <ShowButton
              hideText
              size="small"
              recordItemId={record.id}
              resource="campaign-analytics"
            >
              View Details
            </ShowButton>
          )}
        />
      </Table>
    </List>
  );
};
