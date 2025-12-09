import React, { useEffect, useState } from "react";
import { Edit, useSelect } from "@refinedev/antd";
import { useNavigation } from "@refinedev/core";
import { Form, Input, Select, message } from "antd";
import { useParams } from "react-router";
import { supabaseClient } from "../../utility";

export const ClinicEdit: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { list } = useNavigation();
  const { id } = useParams();

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

  useEffect(() => {
    const loadClinic = async () => {
      if (!id) return;

      try {
        const { data: clinic, error: clinicError } = await supabaseClient
          .from("clinics")
          .select("*")
          .eq("id", id)
          .single();

        if (clinicError) throw clinicError;

        const { data: zoneAssignments, error: zonesError } = await supabaseClient
          .from("campaign_zone_assignments")
          .select("zone_id")
          .eq("clinic_id", id);

        if (zonesError) throw zonesError;

        form.setFieldsValue({
          ...clinic,
          campaign_zones: zoneAssignments.map((z) => z.zone_id),
        });
      } catch (error: any) {
        console.error("Error loading clinic:", error);
        message.error("Failed to load clinic data");
      } finally {
        setInitialLoading(false);
      }
    };

    loadClinic();
  }, [id, form]);

  const handleSubmit = async (values: any) => {
    if (!id) return;

    setLoading(true);
    try {
      const { error: clinicError } = await supabaseClient
        .from("clinics")
        .update({
          name: values.name,
          address: values.address || null,
          barangay: values.barangay || null,
          city: values.city || null,
          province: values.province || null,
          zip: values.zip || null,
          phone: values.phone,
          email: values.email,
        })
        .eq("id", id);

      if (clinicError) throw clinicError;

      await supabaseClient
        .from("campaign_zone_assignments")
        .delete()
        .eq("clinic_id", id);

      if (values.campaign_zones && values.campaign_zones.length > 0) {
        const assignments = values.campaign_zones.map((zoneId: string) => ({
          zone_id: zoneId,
          clinic_id: id,
        }));

        const { error: assignmentsError } = await supabaseClient
          .from("campaign_zone_assignments")
          .insert(assignments);

        if (assignmentsError) throw assignmentsError;
      }

      message.success("Clinic updated successfully!");
      list("clinics");
    } catch (error: any) {
      console.error("Error updating clinic:", error);
      message.error(error.message || "Failed to update clinic");
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
        <Form.Item
          label="Name"
          name={["name"]}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="Street Address" name={["address"]}>
          <Input placeholder="e.g., 123 Main St., Unit 5B" />
        </Form.Item>
        <Form.Item label="Barangay" name={["barangay"]}>
          <Input placeholder="e.g., Barangay San Antonio" />
        </Form.Item>
        <Form.Item label="City" name={["city"]}>
          <Input placeholder="e.g., Makati, Quezon City, Cebu" />
        </Form.Item>
        <Form.Item label="Province" name={["province"]}>
          <Input placeholder="e.g., Metro Manila, Cebu" />
        </Form.Item>
        <Form.Item label="ZIP Code" name={["zip"]}>
          <Input placeholder="e.g., 1234" />
        </Form.Item>
        <Form.Item label="Phone" name={["phone"]}>
          <Input />
        </Form.Item>
        <Form.Item
          label="Email"
          name={["email"]}
          rules={[
            {
              type: "email",
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Campaign Zones"
          name={["campaign_zones"]}
          extra="Select which ad campaign zones this clinic belongs to"
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
