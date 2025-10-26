import React, { useEffect, useState } from "react";
import { DateField, Show, TextField } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import { Typography, Descriptions, Tag, Space, Avatar } from "antd";
import { supabaseClient } from "../../utility";

const { Title } = Typography;

export const DoctorShow: React.FC = () => {
  const { queryResult } = useShow();
  const { data, isLoading } = queryResult;
  const [zones, setZones] = useState<string[]>([]);

  const record = data?.data;

  useEffect(() => {
    const loadZones = async () => {
      if (!record?.id) return;

      const { data: zoneAssignments } = await supabaseClient
        .from("campaign_zone_assignments")
        .select("zone_id, campaign_zones(name)")
        .eq("doctor_id", record.id);

      if (zoneAssignments) {
        setZones(zoneAssignments.map((z: any) => z.campaign_zones?.name || "Unknown"));
      }
    };

    loadZones();
  }, [record?.id]);

  return (
    <Show isLoading={isLoading}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Avatar
          size={80}
          src={record?.profile_photo_url}
          style={{ backgroundColor: '#004777', fontSize: '32px', fontWeight: 'bold' }}
        >
          {record?.first_name?.charAt(0)}{record?.last_name?.charAt(0)}
        </Avatar>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Dr. {record?.first_name} {record?.last_name}
          </Title>
          <Tag color="blue" style={{ marginTop: '8px' }}>{record?.specialization}</Tag>
        </div>
      </div>
      <Title level={5}>Doctor Details</Title>
      <Descriptions bordered column={1}>
        <Descriptions.Item label="Name">
          <TextField value={`${record?.first_name} ${record?.last_name}`} />
        </Descriptions.Item>
        <Descriptions.Item label="Email">
          <TextField value={record?.email} />
        </Descriptions.Item>
        <Descriptions.Item label="Phone">
          <TextField value={record?.phone || "N/A"} />
        </Descriptions.Item>
        <Descriptions.Item label="License Number">
          <TextField value={record?.license_number} />
        </Descriptions.Item>
        <Descriptions.Item label="Specialization">
          <Tag color="blue">{record?.specialization}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Clinic">
          <TextField value={record?.clinics?.name || "N/A"} />
        </Descriptions.Item>
        <Descriptions.Item label="Intake Slug">
          <Tag>{record?.intake_slug}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="QR Code URL">
          <TextField value={record?.qr_code_url || "Not generated"} />
        </Descriptions.Item>
        <Descriptions.Item label="Created At">
          <DateField value={record?.created_at} />
        </Descriptions.Item>
        <Descriptions.Item label="Updated At">
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
