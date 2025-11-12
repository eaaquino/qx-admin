import React, { useEffect, useState } from "react";
import { Edit, useSelect } from "@refinedev/antd";
import { useNavigation } from "@refinedev/core";
import { Form, Input, Select, message, Upload, Image, Avatar, Alert } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import { useParams } from "react-router";
import { supabaseClient } from "../../utility";

export const DoctorEdit: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string>("");
  const [newPhotoUrl, setNewPhotoUrl] = useState<string>("");
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const { list } = useNavigation();
  const { id } = useParams();

  const { selectProps: clinicSelectProps } = useSelect({
    resource: "clinics",
    optionLabel: "name",
    optionValue: "id",
  });

  const { selectProps: zoneSelectProps } = useSelect({
    resource: "campaign_zones",
    optionLabel: "name",
    optionValue: "id",
    filters: [
      {
        field: "is_active",
        operator: "eq",
        value: true,
      },
    ],
  });

  // Load doctor data and assigned zones
  useEffect(() => {
    const loadDoctor = async () => {
      if (!id) return;

      try {
        // Get doctor data
        const { data: doctor, error: doctorError } = await supabaseClient
          .from("doctors")
          .select("*")
          .eq("id", id)
          .single();

        if (doctorError) throw doctorError;

        // Get assigned zones
        const { data: zoneAssignments, error: zonesError } = await supabaseClient
          .from("campaign_zone_assignments")
          .select("zone_id")
          .eq("doctor_id", id);

        if (zonesError) throw zonesError;

        // Store current photo URL
        setCurrentPhotoUrl(doctor.profile_photo_url || "");

        // Set form values
        form.setFieldsValue({
          ...doctor,
          campaign_zones: zoneAssignments.map((z) => z.zone_id),
        });
      } catch (error: any) {
        console.error("Error loading doctor:", error);
        message.error("Failed to load doctor data");
      } finally {
        setInitialLoading(false);
      }
    };

    loadDoctor();
  }, [id, form]);

  const uploadPhoto = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("doctor-photos")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseClient.storage.from("doctor-photos").getPublicUrl(fileName);

    return publicUrl;
  };

  const handleUpload: UploadProps["customRequest"] = async ({
    file,
    onSuccess,
    onError,
  }) => {
    setUploading(true);
    try {
      const uploadedUrl = await uploadPhoto(file as File);
      setNewPhotoUrl(uploadedUrl);
      setPhotoRemoved(false);
      onSuccess?.("ok");
      message.success("Profile photo uploaded successfully!");
    } catch (error: any) {
      console.error("Upload error:", error);
      onError?.(error);
      message.error(error.message || "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setNewPhotoUrl("");
    setFileList([]);
    setPhotoRemoved(true);
    message.info("Photo will be removed when you save");
  };

  const handleSubmit = async (values: any) => {
    if (!id) return;

    setLoading(true);
    try {
      // Determine photo URL: null if removed, new photo if uploaded, or current photo
      let photoToUse = currentPhotoUrl;
      if (photoRemoved) {
        photoToUse = null;
      } else if (newPhotoUrl) {
        photoToUse = newPhotoUrl;
      }

      // Update doctor
      const { error: doctorError } = await supabaseClient
        .from("doctors")
        .update({
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          phone: values.phone,
          license_number: values.license_number,
          specialization: values.specialization,
          clinic_id: values.clinic_id,
          intake_slug: values.intake_slug,
          qr_code_url: values.qr_code_url,
          profile_photo_url: photoToUse,
        })
        .eq("id", id);

      if (doctorError) throw doctorError;

      // Delete existing zone assignments
      await supabaseClient
        .from("campaign_zone_assignments")
        .delete()
        .eq("doctor_id", id);

      // Create new zone assignments
      if (values.campaign_zones && values.campaign_zones.length > 0) {
        const assignments = values.campaign_zones.map((zoneId: string) => ({
          zone_id: zoneId,
          doctor_id: id,
        }));

        const { error: assignmentsError } = await supabaseClient
          .from("campaign_zone_assignments")
          .insert(assignments);

        if (assignmentsError) throw assignmentsError;
      }

      message.success("Doctor updated successfully!");
      list("doctors");
    } catch (error: any) {
      console.error("Error updating doctor:", error);
      message.error(error.message || "Failed to update doctor");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Edit
      saveButtonProps={{
        onClick: () => form.submit(),
        loading,
      }}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* Profile Photo Upload */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
            Profile Photo
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Avatar
              size={80}
              src={photoRemoved ? undefined : (newPhotoUrl || currentPhotoUrl || "none")}
              style={{ backgroundColor: "#004777", fontSize: "32px", fontWeight: "bold" }}
            >
              {form.getFieldValue("first_name")?.charAt(0)}
              {form.getFieldValue("last_name")?.charAt(0)}
            </Avatar>
            <div style={{ flex: 1 }}>
              {currentPhotoUrl && !newPhotoUrl && !photoRemoved && (
                <div style={{ marginBottom: "8px", fontSize: "12px", color: "#666" }}>
                  Current photo uploaded
                </div>
              )}
              {newPhotoUrl && (
                <Alert
                  message="New photo uploaded! Save to apply changes."
                  type="success"
                  showIcon
                  style={{ marginBottom: "8px" }}
                />
              )}
              {photoRemoved && (
                <Alert
                  message="Photo will be removed when you save."
                  type="warning"
                  showIcon
                  style={{ marginBottom: "8px" }}
                />
              )}
              <div style={{ display: "flex", gap: "8px" }}>
                <Upload
                  customRequest={handleUpload}
                  fileList={fileList}
                  onChange={({ fileList: newFileList }) => setFileList(newFileList)}
                  maxCount={1}
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  disabled={uploading}
                  showUploadList={false}
                >
                  <button
                    type="button"
                    style={{
                      padding: "8px 16px",
                      background: "#004777",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: uploading ? "not-allowed" : "pointer",
                      opacity: uploading ? 0.6 : 1,
                    }}
                    disabled={uploading}
                  >
                    <UploadOutlined /> {uploading ? "Uploading..." : "Upload New Photo"}
                  </button>
                </Upload>
                {(currentPhotoUrl || newPhotoUrl) && !photoRemoved && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    style={{
                      padding: "8px 16px",
                      background: "#dc2626",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Remove Photo
                  </button>
                )}
              </div>
              <div style={{ marginTop: "4px", fontSize: "12px", color: "#999" }}>
                Max size: 2MB. Formats: JPG, PNG, WEBP
              </div>
            </div>
          </div>
        </div>

        <Form.Item
          label="First Name"
          name={["first_name"]}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Last Name"
          name={["last_name"]}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Email"
          name={["email"]}
          rules={[
            {
              required: true,
              type: "email",
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="Phone" name={["phone"]}>
          <Input />
        </Form.Item>
        <Form.Item
          label="License Number"
          name={["license_number"]}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Specialization"
          name={["specialization"]}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Select>
            <Select.Option value="Pediatrics">Pediatrics</Select.Option>
            <Select.Option value="Cardiology">Cardiology</Select.Option>
            <Select.Option value="Dermatology">Dermatology</Select.Option>
            <Select.Option value="General">General</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item
          label="Clinic"
          name={["clinic_id"]}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Select {...clinicSelectProps} />
        </Form.Item>
        <Form.Item
          label="Intake Slug"
          name={["intake_slug"]}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="QR Code URL" name={["qr_code_url"]}>
          <Input />
        </Form.Item>
        <Form.Item
          label="Campaign Zones"
          name={["campaign_zones"]}
          extra="Select which ad campaign zones this doctor belongs to"
        >
          <Select
            {...zoneSelectProps}
            mode="multiple"
            placeholder="Select campaign zones"
            allowClear
          />
        </Form.Item>
      </Form>
    </Edit>
  );
};
