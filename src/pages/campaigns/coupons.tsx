import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { useGo } from "@refinedev/core";
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Typography,
  Statistic,
  Row,
  Col,
  Upload,
  Alert,
} from "antd";
import type { UploadFile } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  DownloadOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { supabaseClient } from "../../utility";

const { Title, Text } = Typography;

interface Coupon {
  id: string;
  code: string;
  is_active: boolean;
  created_at: string;
  is_redeemed?: boolean;
}

interface Campaign {
  id: string;
  title: string;
}

interface Redemption {
  id: string;
  redeemed_at: string;
  coupon_code: string;
  patient_name: string;
  doctor_name: string;
}

export const CampaignCoupons: React.FC = () => {
  const { id: campaignId } = useParams<{ id: string }>();
  const go = useGo();
  const [form] = Form.useForm();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [importFileList, setImportFileList] = useState<UploadFile[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    redeemed: 0,
    available: 0,
  });
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(false);

  useEffect(() => {
    loadCampaign();
    loadCoupons();
    loadRedemptions();
  }, [campaignId]);

  const loadCampaign = async () => {
    if (!campaignId) return;

    const { data, error } = await supabaseClient
      .from("ad_campaigns")
      .select("id, title")
      .eq("id", campaignId)
      .single();

    if (error) {
      message.error("Failed to load campaign");
      return;
    }

    setCampaign(data);
  };

  const loadCoupons = async () => {
    if (!campaignId) return;

    setLoading(true);
    try {
      // Get all coupons for this campaign
      const { data: couponsData, error: couponsError } = await supabaseClient
        .from("campaign_coupons")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (couponsError) throw couponsError;

      // Get redemptions to mark which coupons are redeemed
      const { data: redemptionsData, error: redemptionsError } =
        await supabaseClient
          .from("coupon_redemptions")
          .select("coupon_id")
          .eq("campaign_id", campaignId);

      if (redemptionsError) throw redemptionsError;

      const redeemedCouponIds = new Set(
        redemptionsData.map((r) => r.coupon_id)
      );

      const couponsWithStatus = (couponsData || []).map((coupon) => ({
        ...coupon,
        is_redeemed: redeemedCouponIds.has(coupon.id),
      }));

      setCoupons(couponsWithStatus);

      // Calculate stats
      const total = couponsWithStatus.length;
      const redeemed = redemptionsData.length;
      const available = total - redeemed;

      setStats({ total, redeemed, available });
    } catch (error: any) {
      message.error(error.message || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  const loadRedemptions = async () => {
    if (!campaignId) return;

    setRedemptionsLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from("coupon_redemptions")
        .select(
          `
          id,
          redeemed_at,
          campaign_coupons (code),
          patients (first_name, last_name),
          doctors (first_name, last_name)
        `
        )
        .eq("campaign_id", campaignId)
        .order("redeemed_at", { ascending: false });

      if (error) throw error;

      const formattedRedemptions: Redemption[] = (data || []).map((r: any) => ({
        id: r.id,
        redeemed_at: r.redeemed_at,
        coupon_code: r.campaign_coupons?.code || "N/A",
        patient_name: r.patients
          ? `${r.patients.first_name} ${r.patients.last_name}`
          : "Unknown",
        doctor_name: r.doctors
          ? `Dr. ${r.doctors.first_name} ${r.doctors.last_name}`
          : "N/A",
      }));

      setRedemptions(formattedRedemptions);
    } catch (error: any) {
      message.error(error.message || "Failed to load redemptions");
    } finally {
      setRedemptionsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCoupon(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    form.setFieldsValue(coupon);
    setIsModalOpen(true);
  };

  const handleDelete = async (couponId: string) => {
    try {
      const { error } = await supabaseClient
        .from("campaign_coupons")
        .delete()
        .eq("id", couponId);

      if (error) throw error;

      message.success("Coupon deleted successfully");
      loadCoupons();
    } catch (error: any) {
      if (error.code === "23503") {
        message.error(
          "Cannot delete coupon that has been redeemed. Consider deactivating it instead."
        );
      } else {
        message.error(error.message || "Failed to delete coupon");
      }
    }
  };

  const handleSubmit = async (values: any) => {
    if (!campaignId) return;

    try {
      if (editingCoupon) {
        // Update existing coupon
        const { error } = await supabaseClient
          .from("campaign_coupons")
          .update({
            code: values.code,
            is_active: true,
          })
          .eq("id", editingCoupon.id);

        if (error) throw error;
        message.success("Coupon updated successfully");
      } else {
        // Create new coupon
        const { error } = await supabaseClient
          .from("campaign_coupons")
          .insert({
            campaign_id: campaignId,
            code: values.code,
            is_active: true,
          });

        if (error) throw error;
        message.success("Coupon created successfully");
      }

      setIsModalOpen(false);
      form.resetFields();
      loadCoupons();
    } catch (error: any) {
      if (error.code === "23505") {
        message.error("A coupon with this code already exists");
      } else {
        message.error(error.message || "Failed to save coupon");
      }
    }
  };

  const parseCsvFile = (file: File): Promise<Array<{ code: string }>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());

          if (lines.length < 1) {
            reject(new Error("CSV file is empty"));
            return;
          }

          // Check if first line is a header (contains 'code')
          const firstLine = lines[0].toLowerCase();
          const hasHeader = firstLine.includes('code');
          const startLine = hasHeader ? 1 : 0;

          if (lines.length <= startLine) {
            reject(new Error("CSV file must contain at least one coupon code"));
            return;
          }

          const coupons: Array<{ code: string }> = [];

          for (let i = startLine; i < lines.length; i++) {
            const code = lines[i].split(',')[0].trim();

            if (!code) {
              continue; // Skip empty lines
            }

            // Validate code format
            if (!/^[A-Za-z0-9-]+$/.test(code)) {
              reject(new Error(`Invalid code format at line ${i + 1}: "${code}". Use only letters, numbers, and hyphens.`));
              return;
            }

            coupons.push({ code });
          }

          if (coupons.length === 0) {
            reject(new Error("No valid coupons found in CSV file"));
            return;
          }

          resolve(coupons);
        } catch (error: any) {
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsText(file);
    });
  };

  const handleImportCsv = async (file: File) => {
    if (!campaignId) return;

    setImportLoading(true);
    setImportResults(null);

    try {
      const coupons = await parseCsvFile(file);

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Import coupons one by one to collect individual errors
      for (const coupon of coupons) {
        try {
          const { error } = await supabaseClient
            .from("campaign_coupons")
            .insert({
              campaign_id: campaignId,
              code: coupon.code,
              is_active: true,
            });

          if (error) throw error;
          successCount++;
        } catch (error: any) {
          failedCount++;
          if (error.code === "23505") {
            errors.push(`${coupon.code}: Already exists`);
          } else {
            errors.push(`${coupon.code}: ${error.message}`);
          }
        }
      }

      setImportResults({
        success: successCount,
        failed: failedCount,
        errors: errors.slice(0, 10), // Show max 10 errors
      });

      if (successCount > 0) {
        message.success(`Successfully imported ${successCount} coupon(s)`);
        loadCoupons();
      }

      if (failedCount > 0) {
        message.warning(`${failedCount} coupon(s) failed to import`);
      }
    } catch (error: any) {
      message.error(error.message || "Failed to import coupons");
      setImportResults({
        success: 0,
        failed: 0,
        errors: [error.message],
      });
    } finally {
      setImportLoading(false);
    }

    return false; // Prevent default upload behavior
  };

  const handleImportModalClose = () => {
    setIsImportModalOpen(false);
    setImportFileList([]);
    setImportResults(null);
  };

  const handleExportCsv = () => {
    if (coupons.length === 0) {
      message.warning("No coupons to export");
      return;
    }

    try {
      // Create CSV header
      const header = "code,status,created_at\n";

      // Create CSV rows
      const rows = coupons.map((coupon) => {
        const code = coupon.code;
        const status = coupon.is_redeemed ? "Redeemed" : "Available";
        const createdAt = new Date(coupon.created_at).toLocaleDateString();

        return `${code},${status},${createdAt}`;
      });

      // Combine header and rows
      const csvContent = header + rows.join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `coupons-${campaign?.title || "export"}-${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success("Coupons exported successfully");
    } catch (error: any) {
      message.error("Failed to export coupons");
      console.error("Export error:", error);
    }
  };

  const columns = [
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: "Status",
      key: "status",
      render: (_: any, record: Coupon) => (
        <Space>
          {record.is_redeemed ? (
            <Text type="success">Redeemed</Text>
          ) : (
            <Text>Available</Text>
          )}
          {!record.is_active && <Text type="secondary">(Inactive)</Text>}
        </Space>
      ),
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: Coupon) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this coupon?"
            description={
              record.is_redeemed
                ? "This coupon has been redeemed and cannot be deleted."
                : "This action cannot be undone."
            }
            onConfirm={() => handleDelete(record.id)}
            disabled={record.is_redeemed}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
              disabled={record.is_redeemed}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const redemptionColumns = [
    {
      title: "Coupon Code",
      dataIndex: "coupon_code",
      key: "coupon_code",
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: "Patient",
      dataIndex: "patient_name",
      key: "patient_name",
    },
    {
      title: "Doctor",
      dataIndex: "doctor_name",
      key: "doctor_name",
    },
    {
      title: "Redeemed At",
      dataIndex: "redeemed_at",
      key: "redeemed_at",
      render: (date: string) =>
        new Date(date).toLocaleString("en-US", {
          dateStyle: "short",
          timeStyle: "short",
        }),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => go({ to: `/campaigns/edit/${campaignId}` })}
        style={{ marginBottom: 16 }}
      >
        Back to Campaign
      </Button>

      <Title level={2}>
        Coupons for "{campaign?.title || "Loading..."}"
      </Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic title="Total Coupons" value={stats.total} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Redeemed"
              value={stats.redeemed}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Available"
              value={stats.available}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add Coupon
          </Button>
          <Button icon={<UploadOutlined />} onClick={() => setIsImportModalOpen(true)}>
            Import CSV
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExportCsv} disabled={coupons.length === 0}>
            Export CSV
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={coupons}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Card style={{ marginTop: 24 }}>
        <Title level={3}>Redemption Reports</Title>
        <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
          View all coupon redemptions for this campaign
        </Text>

        {redemptions.length === 0 && !redemptionsLoading ? (
          <Alert
            message="No Redemptions Yet"
            description="Coupons will appear here once patients redeem them"
            type="info"
            showIcon
          />
        ) : (
          <Table
            columns={redemptionColumns}
            dataSource={redemptions}
            loading={redemptionsLoading}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      <Modal
        title={editingCoupon ? "Edit Coupon" : "Add New Coupon"}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText={editingCoupon ? "Update" : "Create"}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Coupon Code"
            name="code"
            rules={[
              { required: true, message: "Please enter a coupon code" },
              {
                pattern: /^[A-Za-z0-9-]+$/,
                message: "Use only letters, numbers, and hyphens",
              },
            ]}
          >
            <Input placeholder="e.g., EO2025-001 or test1234" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Import Coupons from CSV"
        open={isImportModalOpen}
        onCancel={handleImportModalClose}
        footer={[
          <Button key="close" onClick={handleImportModalClose}>
            Close
          </Button>,
        ]}
      >
        <Alert
          message="CSV Format"
          description={
            <div>
              <p>Your CSV file should contain one coupon code per line:</p>
              <pre style={{ background: "#f5f5f5", padding: "8px", borderRadius: "4px" }}>
                code{"\n"}
                EO2025-001{"\n"}
                EO2025-002{"\n"}
                test1234
              </pre>
              <p>
                <strong>Requirements:</strong>
              </p>
              <ul>
                <li>One coupon code per line</li>
                <li>Codes can use letters (upper or lowercase), numbers, and hyphens</li>
                <li>Header row is optional</li>
              </ul>
            </div>
          }
          type="info"
          style={{ marginBottom: 16 }}
        />

        <Upload
          beforeUpload={handleImportCsv}
          fileList={importFileList}
          onChange={({ fileList: newFileList }) => setImportFileList(newFileList)}
          maxCount={1}
          accept=".csv"
          onRemove={() => {
            setImportFileList([]);
            setImportResults(null);
          }}
        >
          <Button icon={<UploadOutlined />} loading={importLoading} disabled={importLoading}>
            Select CSV File
          </Button>
        </Upload>

        {importResults && (
          <Alert
            message="Import Results"
            description={
              <div>
                <p>
                  <Text strong>Success:</Text> {importResults.success} coupon(s)
                </p>
                <p>
                  <Text strong>Failed:</Text> {importResults.failed} coupon(s)
                </p>
                {importResults.errors.length > 0 && (
                  <div>
                    <Text strong>Errors:</Text>
                    <ul style={{ marginTop: 8, marginBottom: 0 }}>
                      {importResults.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {importResults.failed > 10 && (
                        <li>... and {importResults.failed - 10} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            }
            type={importResults.success > 0 ? "success" : "error"}
            style={{ marginTop: 16 }}
          />
        )}
      </Modal>
    </div>
  );
};
