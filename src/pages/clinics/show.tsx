import React, { useEffect, useState } from "react";
import { DateField, TextField } from "@refinedev/antd";
import { Show } from "../../components/buttons";
import { useShow } from "@refinedev/core";
import { Typography, Descriptions, Tag, Space } from "antd";
import { supabaseClient } from "../../utility";

const { Title } = Typography;

export const ClinicShow: React.FC = () => {
  const { query } = useShow();
  const { data, isLoading } = query;
  const [zones, setZones] = useState<string[]>([]);

  const record = data?.data;

  useEffect(() => {
    const loadZones = async () => {
      if (!record?.id) return;

      const { data: zoneAssignments } = await supabaseClient
        .from("campaign_zone_assignments")
        .select("zone_id, campaign_zones(name)")
        .eq("clinic_id", record.id);

      if (zoneAssignments) {
        setZones(zoneAssignments.map((z: any) => z.campaign_zones?.name || "Unknown"));
      }
    };

    loadZones();
  }, [record?.id]);

  return (
    <Show isLoading={isLoading}>
      <Title level={5}>Clinic Details</Title>
      <Descriptions bordered column={1}>
        <Descriptions.Item label="Name">
          <TextField value={record?.name} />
        </Descriptions.Item>
        <Descriptions.Item label="Street Address">
          <TextField value={record?.address || "N/A"} />
        </Descriptions.Item>
        <Descriptions.Item label="Barangay">
          <TextField value={record?.barangay || "N/A"} />
        </Descriptions.Item>
        <Descriptions.Item label="City">
          <TextField value={record?.city || "N/A"} />
        </Descriptions.Item>
        <Descriptions.Item label="Province">
          <TextField value={record?.province || "N/A"} />
        </Descriptions.Item>
        <Descriptions.Item label="ZIP Code">
          <TextField value={record?.zip || "N/A"} />
        </Descriptions.Item>
        <Descriptions.Item label="Phone">
          <TextField value={record?.phone || "N/A"} />
        </Descriptions.Item>
        <Descriptions.Item label="Email">
          <TextField value={record?.email || "N/A"} />
        </Descriptions.Item>
        <Descriptions.Item label="Created">
          <DateField value={record?.created_at} />
        </Descriptions.Item>
        <Descriptions.Item label="Updated">
          <DateField value={record?.updated_at} />
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
              <Tag>No zones assigned</Tag>
            )}
          </Space>
        </Descriptions.Item>
      </Descriptions>
    </Show>
  );
};
