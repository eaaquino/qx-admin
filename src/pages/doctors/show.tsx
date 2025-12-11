import React, { useEffect, useState } from "react";
import { DateField, TextField } from "@refinedev/antd";
import { Show } from "../../components/buttons";
import { useShow } from "@refinedev/core";
import { Typography, Descriptions, Tag, Space, Avatar, Button, Image, Spin, Switch, message } from "antd";
import { CalendarOutlined, BarChartOutlined, HistoryOutlined, FileImageOutlined, FilePdfOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router";
import { supabaseClient } from "../../utility";

const { Title } = Typography;

export const DoctorShow: React.FC = () => {
  const navigate = useNavigate();
  const { query, result } = useShow({
    resource: "doctors",
    meta: {
      select: "*, clinics(name, address, barangay, city, province, zip)",
    },
  });

  const { isLoading, refetch } = query;
  const [zones, setZones] = useState<string[]>([]);
  const [prcIdUrl, setPrcIdUrl] = useState<string | null>(null);
  const [prcIdLoading, setPrcIdLoading] = useState(false);
  const [isActiveLoading, setIsActiveLoading] = useState(false);

  const record = result;

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

  // Load PRC ID signed URL
  useEffect(() => {
    const loadPrcId = async () => {
      console.log("PRC ID URL from record:", record?.prc_id_url);

      if (!record?.prc_id_url) {
        setPrcIdUrl(null);
        return;
      }

      setPrcIdLoading(true);
      try {
        // Generate a signed URL for the private bucket (valid for 1 hour)
        console.log("Requesting signed URL for:", record.prc_id_url);
        const { data, error } = await supabaseClient.storage
          .from("prc-ids")
          .createSignedUrl(record.prc_id_url, 3600);

        console.log("Signed URL response:", { data, error });

        if (error) {
          console.error("Failed to get PRC ID URL:", error);
          setPrcIdUrl(null);
        } else {
          setPrcIdUrl(data.signedUrl);
        }
      } catch (err) {
        console.error("PRC ID URL error:", err);
        setPrcIdUrl(null);
      } finally {
        setPrcIdLoading(false);
      }
    };

    loadPrcId();
  }, [record?.prc_id_url]);

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Handle is_active toggle
  const handleIsActiveToggle = async (checked: boolean) => {
    if (!record?.id) return;

    setIsActiveLoading(true);
    try {
      const { error } = await supabaseClient
        .from("doctors")
        .update({ is_active: checked })
        .eq("id", record.id);

      if (error) throw error;

      message.success(`Doctor ${checked ? "enabled" : "disabled"} successfully`);
      refetch();
    } catch (error: any) {
      console.error("Error updating doctor status:", error);
      message.error(error.message || "Failed to update doctor status");
    } finally {
      setIsActiveLoading(false);
    }
  };

  return (
    <Show isLoading={isLoading}>
      {/* Header Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Avatar
            size={80}
            src={record?.profile_photo_url}
            style={{ backgroundColor: '#004777', fontSize: '32px', fontWeight: 'bold' }}
          >
            {record?.first_name?.charAt(0)}{record?.last_name?.charAt(0)}
          </Avatar>
          <div>
            <Space align="center">
              <Title level={3} style={{ margin: 0 }}>
                Dr. {record?.first_name} {record?.last_name}
              </Title>
              {record?.is_active === false && (
                <Tag color="red">Inactive</Tag>
              )}
            </Space>
            <Space style={{ marginTop: '8px' }}>
              <Tag color="blue">{record?.specialization}</Tag>
              {record?.sub_specialization && (
                <Tag color="cyan">{record?.sub_specialization}</Tag>
              )}
            </Space>
          </div>
          <div style={{ marginLeft: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Switch
              checked={record?.is_active !== false}
              onChange={handleIsActiveToggle}
              loading={isActiveLoading}
              checkedChildren="Active"
              unCheckedChildren="Inactive"
            />
          </div>
        </div>
        <Space>
          <Button
            icon={<BarChartOutlined />}
            onClick={() => navigate(`/doctors/analytics/performance/${record?.id}`)}
          >
            Performance
          </Button>
          <Button
            icon={<HistoryOutlined />}
            onClick={() => navigate(`/doctors/analytics/history/${record?.id}`)}
          >
            History
          </Button>
          <Button
            type="primary"
            icon={<CalendarOutlined />}
            onClick={() => navigate(`/doctors/schedule/${record?.id}`)}
          >
            Manage Schedule
          </Button>
        </Space>
      </div>

      {/* Personal Information */}
      <Title level={5}>Personal Information</Title>
      <Descriptions bordered column={1} style={{ marginBottom: '24px' }} labelStyle={{ width: '200px' }}>
        <Descriptions.Item label="Full Name">
          <TextField value={`${record?.first_name} ${record?.last_name}`} />
        </Descriptions.Item>
        <Descriptions.Item label="Email">
          <TextField value={record?.email} />
        </Descriptions.Item>
        <Descriptions.Item label="Phone">
          <TextField value={record?.phone || "N/A"} />
        </Descriptions.Item>
        <Descriptions.Item label="Date of Birth">
          <TextField value={formatDate(record?.date_of_birth)} />
        </Descriptions.Item>
        <Descriptions.Item label="Civil Status">
          <TextField value={record?.civil_status || "N/A"} />
        </Descriptions.Item>
        <Descriptions.Item label="License Number (PRC)">
          <Tag color="green">{record?.license_number || "N/A"}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="PRC ID Document">
          {prcIdLoading ? (
            <Spin size="small" />
          ) : prcIdUrl ? (
            record?.prc_id_url?.toLowerCase().endsWith('.pdf') ? (
              <a href={prcIdUrl} target="_blank" rel="noopener noreferrer">
                <Button icon={<FilePdfOutlined />} size="small">
                  View PDF
                </Button>
              </a>
            ) : (
              <Image
                src={prcIdUrl}
                alt="PRC ID"
                style={{ maxWidth: '200px', maxHeight: '150px' }}
                placeholder={
                  <div style={{ width: 200, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' }}>
                    <FileImageOutlined style={{ fontSize: 32, color: '#999' }} />
                  </div>
                }
              />
            )
          ) : (
            <Tag color="default">Not uploaded</Tag>
          )}
        </Descriptions.Item>
      </Descriptions>

      {/* Professional Information */}
      <Title level={5}>Professional Information</Title>
      <Descriptions bordered column={1} style={{ marginBottom: '24px' }} labelStyle={{ width: '200px' }}>
        <Descriptions.Item label="Specialization">
          <Tag color="blue">{record?.specialization}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Sub-Specialization">
          {record?.sub_specialization ? (
            <Tag color="cyan">{record?.sub_specialization}</Tag>
          ) : (
            <TextField value="N/A" />
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Medical Society">
          <TextField value={record?.society || "N/A"} />
        </Descriptions.Item>
        <Descriptions.Item label="Intake Slug">
          <Tag>{record?.intake_slug}</Tag>
        </Descriptions.Item>
      </Descriptions>

      {/* Clinic Information */}
      <Title level={5}>Clinic Information</Title>
      <Descriptions bordered column={1} style={{ marginBottom: '24px' }} labelStyle={{ width: '200px' }}>
        <Descriptions.Item label="Clinic Name">
          <TextField value={record?.clinics?.name || "N/A"} />
        </Descriptions.Item>
        <Descriptions.Item label="Clinic Address">
          <TextField value={
            record?.clinics ? [
              record.clinics.address,
              record.clinics.barangay,
              record.clinics.city,
              [record.clinics.province, record.clinics.zip].filter(Boolean).join(' ')
            ].filter(Boolean).join(', ') || "N/A" : "N/A"
          } />
        </Descriptions.Item>
        <Descriptions.Item label="Room Number">
          <TextField value={record?.room_number || "N/A"} />
        </Descriptions.Item>
        <Descriptions.Item label="Floor Number">
          <TextField value={record?.floor_number || "N/A"} />
        </Descriptions.Item>
        <Descriptions.Item label="Shared Clinic">
          <Tag color={record?.is_shared_clinic ? "orange" : "default"}>
            {record?.is_shared_clinic ? "Yes" : "No"}
          </Tag>
        </Descriptions.Item>
      </Descriptions>

      {/* Secretary Information */}
      {record?.has_secretary && (
        <>
          <Title level={5}>Secretary Information</Title>
          <Descriptions bordered column={1} style={{ marginBottom: '24px' }} labelStyle={{ width: '200px' }}>
            <Descriptions.Item label="Secretary Name">
              <TextField value={record?.secretary_name || "N/A"} />
            </Descriptions.Item>
            <Descriptions.Item label="Secretary Contact">
              <TextField value={record?.secretary_contact || "N/A"} />
            </Descriptions.Item>
            <Descriptions.Item label="Secretary Email">
              <TextField value={record?.secretary_email || "N/A"} />
            </Descriptions.Item>
          </Descriptions>
        </>
      )}

      {/* Campaign Zones & System Info */}
      <Title level={5}>Additional Information</Title>
      <Descriptions bordered column={1} labelStyle={{ width: '200px' }}>
        <Descriptions.Item label="Campaign Zones">
          <Space wrap>
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
        <Descriptions.Item label="Created At">
          <DateField value={record?.created_at} format="LLL" />
        </Descriptions.Item>
        <Descriptions.Item label="Updated At">
          <DateField value={record?.updated_at} format="LLL" />
        </Descriptions.Item>
      </Descriptions>
    </Show>
  );
};
