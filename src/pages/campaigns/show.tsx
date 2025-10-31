import React, { useEffect, useState } from "react";
import { DateField, Show, TextField } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import { Typography, Descriptions, Tag, Space, Image } from "antd";
import { supabaseClient } from "../../utility";

const { Title } = Typography;

interface ZoneTag {
  zone_id: string;
  campaign_zones: {
    name: string;
  } | null;
}

export const CampaignShow: React.FC = () => {
  const { query } = useShow();
  const { data, isLoading } = query;
  const [zones, setZones] = useState<string[]>([]);

  const record = data?.data;

  useEffect(() => {
    const loadZones = async () => {
      if (!record?.id) return;

      const { data: zoneTags } = await supabaseClient
        .from("campaign_zone_tags")
        .select("zone_id, campaign_zones(name)")
        .eq("campaign_id", record.id);

      if (zoneTags) {
        setZones((zoneTags as unknown as ZoneTag[]).map((tag) => tag.campaign_zones?.name || "Unknown"));
      }
    };

    loadZones();
  }, [record?.id]);

  const getStatus = () => {
    if (!record) return { status: "Unknown", color: "default" };

    const now = new Date();
    const startDate = new Date(record.start_date);
    const endDate = record.end_date ? new Date(record.end_date) : null;

    // Disabled campaigns
    if (!record.is_active) {
      return { status: "Disabled", color: "red" };
    }

    // Expired campaigns
    if (endDate && endDate < now) {
      return { status: "Inactive", color: "red" };
    }

    // Future/scheduled campaigns
    if (startDate > now) {
      return { status: "Scheduled", color: "blue" };
    }

    // Active campaigns
    return { status: "Active", color: "green" };
  };

  return (
    <Show isLoading={isLoading}>
      <Title level={5}>Campaign Details</Title>
      <Descriptions bordered column={1}>
        <Descriptions.Item label="Title">
          <TextField value={record?.title} />
        </Descriptions.Item>
        <Descriptions.Item label="Description">
          <TextField value={record?.description || "N/A"} />
        </Descriptions.Item>
        <Descriptions.Item label="Image">
          {record?.image_url ? (
            <Image src={record.image_url} alt={record.title} width={200} />
          ) : (
            "No image"
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Link URL">
          {record?.link_url ? (
            <a href={record.link_url} target="_blank" rel="noreferrer">
              {record.link_url}
            </a>
          ) : (
            "No link"
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Campaign Zones">
          <Space>
            {zones.length > 0 ? (
              zones.map((zone, idx) => (
                <Tag key={idx} color="blue">
                  {zone}
                </Tag>
              ))
            ) : (
              <Tag>No zones</Tag>
            )}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Start Date">
          <DateField value={record?.start_date} />
        </Descriptions.Item>
        <Descriptions.Item label="End Date">
          {record?.end_date ? (
            <DateField value={record.end_date} />
          ) : (
            "No end date"
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Display Duration">
          {record?.display_duration_seconds} seconds
        </Descriptions.Item>
        <Descriptions.Item label="Priority">
          <Tag color={record?.priority > 5 ? "red" : record?.priority > 0 ? "orange" : "default"}>
            {record?.priority}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          {(() => {
            const { status, color } = getStatus();
            return <Tag color={color}>{status}</Tag>;
          })()}
        </Descriptions.Item>
        <Descriptions.Item label="Created">
          <DateField value={record?.created_at} />
        </Descriptions.Item>
      </Descriptions>
    </Show>
  );
};
