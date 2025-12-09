import React, { useEffect, useState } from "react";
import { Edit, useSelect } from "@refinedev/antd";
import { useNavigation } from "@refinedev/core";
import { Form, Input, Select, message, Upload, Avatar, Alert, DatePicker, Switch, Divider } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import { useParams } from "react-router";
import { supabaseClient } from "../../utility";
import { ClinicAutocomplete } from "../../components/ClinicAutocomplete";
import dayjs from "dayjs";

interface Clinic {
  id: string;
  name: string;
  address?: string;
  barangay?: string;
  city?: string;
  province?: string;
  zip?: string;
}

const CIVIL_STATUS_OPTIONS = ["Single", "Married", "Widowed", "Separated", "Divorced"];

export const DoctorEdit: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string>("");
  const [newPhotoUrl, setNewPhotoUrl] = useState<string>("");
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [subSpecializations, setSubSpecializations] = useState<any[]>([]);
  const [hasSecretary, setHasSecretary] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [clinicName, setClinicName] = useState("");
  const { list } = useNavigation();
  const { id } = useParams();

  // Handle clinic selection from autocomplete
  const handleClinicSelect = (clinic: Clinic | null) => {
    setSelectedClinic(clinic);
    if (clinic) {
      form.setFieldsValue({
        clinic_address: clinic.address || "",
        clinic_barangay: clinic.barangay || "",
        clinic_city: clinic.city || "",
        clinic_province: clinic.province || "",
        clinic_zip: clinic.zip || "",
      });
    }
  };

  // Handle address field changes - disconnect from linked clinic when user edits any address field
  const handleAddressFieldChange = (fieldName: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    // Update the form field
    form.setFieldValue(fieldName, e.target.value);

    // If editing address fields while a clinic is selected, disconnect from the clinic
    if (selectedClinic) {
      setSelectedClinic(null);
    }
  };

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

  // Load specializations
  useEffect(() => {
    const loadSpecializations = async () => {
      const { data, error } = await supabaseClient.rpc("get_specializations_with_subs");
      if (!error && data) {
        const uniqueSpecs: any[] = [];
        const seen = new Set();
        data.forEach((row: any) => {
          if (!seen.has(row.specialization_id)) {
            seen.add(row.specialization_id);
            uniqueSpecs.push({
              id: row.specialization_id,
              name: row.specialization_name,
            });
          }
        });
        setSpecializations(uniqueSpecs);
        setSubSpecializations(data.filter((row: any) => row.sub_specialization_id));
      }
    };
    loadSpecializations();
  }, []);

  // Get filtered sub-specializations based on selected specialization
  const getFilteredSubSpecs = () => {
    const selectedSpec = form.getFieldValue("specialization");
    if (!selectedSpec) return [];
    const spec = specializations.find((s) => s.name === selectedSpec);
    if (!spec) return [];
    return subSpecializations.filter((s: any) => s.specialization_id === spec.id);
  };

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

        // Set secretary state
        setHasSecretary(doctor.has_secretary || false);

        // Fetch and set clinic data
        if (doctor.clinic_id) {
          const { data: clinic } = await supabaseClient
            .from("clinics")
            .select("id, name, address, barangay, city, province, zip")
            .eq("id", doctor.clinic_id)
            .single();

          if (clinic) {
            setSelectedClinic(clinic);
            setClinicName(clinic.name);
            form.setFieldsValue({
              clinic_address: clinic.address || "",
              clinic_barangay: clinic.barangay || "",
              clinic_city: clinic.city || "",
              clinic_province: clinic.province || "",
              clinic_zip: clinic.zip || "",
            });
          }
        }

        // Set form values with date conversion
        form.setFieldsValue({
          ...doctor,
          date_of_birth: doctor.date_of_birth ? dayjs(doctor.date_of_birth) : null,
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
        photoToUse = "";
      } else if (newPhotoUrl) {
        photoToUse = newPhotoUrl;
      }

      // Update existing clinic or create new one with dedicated columns
      let clinicId = selectedClinic?.id || null;

      if (clinicId) {
        // Update existing clinic with dedicated columns
        const { error: clinicError } = await supabaseClient
          .from("clinics")
          .update({
            name: clinicName,
            address: values.clinic_address || null,
            barangay: values.clinic_barangay || null,
            city: values.clinic_city || null,
            province: values.clinic_province || null,
            zip: values.clinic_zip || null,
          })
          .eq("id", clinicId);

        if (clinicError) {
          throw new Error(`Failed to update clinic: ${clinicError.message}`);
        }
      } else if (clinicName) {
        // Create new clinic with dedicated columns
        const { data: newClinic, error: clinicError } = await supabaseClient
          .from("clinics")
          .insert({
            name: clinicName,
            address: values.clinic_address || null,
            barangay: values.clinic_barangay || null,
            city: values.clinic_city || null,
            province: values.clinic_province || null,
            zip: values.clinic_zip || null,
            phone: values.phone || "",
            email: `clinic-${Date.now()}@default.com`,
          })
          .select()
          .single();

        if (clinicError) {
          throw new Error(`Failed to create clinic: ${clinicError.message}`);
        }
        clinicId = newClinic.id;
      }

      if (!clinicId) {
        throw new Error("Please enter a clinic name");
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
          sub_specialization: values.sub_specialization || null,
          society: values.society || null,
          date_of_birth: values.date_of_birth ? values.date_of_birth.format("YYYY-MM-DD") : null,
          civil_status: values.civil_status || null,
          clinic_id: clinicId,
          room_number: values.room_number || null,
          floor_number: values.floor_number || null,
          is_shared_clinic: values.is_shared_clinic || false,
          has_secretary: values.has_secretary || false,
          secretary_name: values.has_secretary ? values.secretary_name : null,
          secretary_contact: values.has_secretary ? values.secretary_contact : null,
          secretary_email: values.has_secretary ? values.secretary_email : null,
          intake_slug: values.intake_slug,
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
          label="License Number (PRC)"
          name={["license_number"]}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Divider>Personal Information</Divider>

        <Form.Item label="Date of Birth" name={["date_of_birth"]}>
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="Civil Status" name={["civil_status"]}>
          <Select placeholder="Select civil status" allowClear>
            {CIVIL_STATUS_OPTIONS.map((status) => (
              <Select.Option key={status} value={status}>
                {status}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Divider>Professional Information</Divider>

        <Form.Item
          label="Specialization"
          name={["specialization"]}
          rules={[{ required: true }]}
        >
          <Select
            placeholder="Select specialization"
            onChange={() => form.setFieldValue("sub_specialization", null)}
          >
            {specializations.map((spec) => (
              <Select.Option key={spec.id} value={spec.name}>
                {spec.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          label="Sub-Specialization"
          name={["sub_specialization"]}
          dependencies={["specialization"]}
        >
          <Select placeholder="Select sub-specialization" allowClear>
            {getFilteredSubSpecs().map((sub: any) => (
              <Select.Option key={sub.sub_specialization_id} value={sub.sub_specialization_name}>
                {sub.sub_specialization_name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          label="Medical Society"
          name={["society"]}
          extra="e.g., Philippine Medical Association"
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Intake Slug"
          name={["intake_slug"]}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Divider>Clinic Information</Divider>

        <Form.Item
          label="Clinic Name"
          required
        >
          <ClinicAutocomplete
            value={clinicName}
            onChange={setClinicName}
            onClinicSelect={handleClinicSelect}
            selectedClinic={selectedClinic}
          />
        </Form.Item>
        <Form.Item
          label="Street Address"
          name={["clinic_address"]}
          rules={[{ required: true, message: "Address is required" }]}
        >
          <Input
            placeholder="e.g., 123 Main Street"
            style={selectedClinic ? { borderColor: "#1890ff", borderWidth: "2px" } : undefined}
            onChange={handleAddressFieldChange("clinic_address")}
          />
        </Form.Item>
        <Form.Item label="Room Number" name={["room_number"]}>
          <Input placeholder="e.g., 305" />
        </Form.Item>
        <Form.Item label="Floor Number" name={["floor_number"]}>
          <Input placeholder="e.g., 3" />
        </Form.Item>
        <Form.Item
          label="Barangay"
          name={["clinic_barangay"]}
          rules={[{ required: true, message: "Barangay is required" }]}
        >
          <Input
            placeholder="e.g., Barangay San Antonio"
            style={selectedClinic ? { borderColor: "#1890ff", borderWidth: "2px" } : undefined}
            onChange={handleAddressFieldChange("clinic_barangay")}
          />
        </Form.Item>
        <Form.Item
          label="City"
          name={["clinic_city"]}
          rules={[{ required: true, message: "City is required" }]}
        >
          <Input
            placeholder="e.g., Makati City"
            style={selectedClinic ? { borderColor: "#1890ff", borderWidth: "2px" } : undefined}
            onChange={handleAddressFieldChange("clinic_city")}
          />
        </Form.Item>
        <Form.Item
          label="Province"
          name={["clinic_province"]}
          rules={[{ required: true, message: "Province is required" }]}
        >
          <Input
            placeholder="e.g., Metro Manila"
            style={selectedClinic ? { borderColor: "#1890ff", borderWidth: "2px" } : undefined}
            onChange={handleAddressFieldChange("clinic_province")}
          />
        </Form.Item>
        <Form.Item
          label="ZIP Code"
          name={["clinic_zip"]}
          rules={[{ required: true, message: "ZIP code is required" }]}
        >
          <Input
            placeholder="e.g., 1200"
            style={selectedClinic ? { borderColor: "#1890ff", borderWidth: "2px" } : undefined}
            onChange={handleAddressFieldChange("clinic_zip")}
          />
        </Form.Item>
        <Form.Item
          label="Shared Clinic"
          name={["is_shared_clinic"]}
          valuePropName="checked"
          extra="Is this clinic space shared with other doctors?"
        >
          <Switch />
        </Form.Item>

        <Divider>Secretary Information</Divider>

        <Form.Item
          label="Has Secretary"
          name={["has_secretary"]}
          valuePropName="checked"
        >
          <Switch onChange={(checked) => setHasSecretary(checked)} />
        </Form.Item>
        {hasSecretary && (
          <>
            <Form.Item
              label="Secretary Name"
              name={["secretary_name"]}
              rules={[{ required: hasSecretary, message: "Secretary name is required" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item label="Secretary Contact" name={["secretary_contact"]}>
              <Input placeholder="e.g., 09171234567" />
            </Form.Item>
            <Form.Item label="Secretary Email" name={["secretary_email"]}>
              <Input type="email" />
            </Form.Item>
          </>
        )}

        <Divider>Campaign Settings</Divider>

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
