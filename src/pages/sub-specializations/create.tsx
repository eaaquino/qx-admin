import React from "react";
import { Create, useForm, useSelect } from "@refinedev/antd";
import { Form, Input, InputNumber, Switch, Select } from "antd";
import { useSearchParams } from "react-router";

export const SubSpecializationCreate: React.FC = () => {
  const [searchParams] = useSearchParams();
  const preselectedSpecializationId = searchParams.get("specialization_id");

  const { formProps, saveButtonProps } = useForm();

  const { selectProps: specializationSelectProps } = useSelect({
    resource: "specializations",
    optionLabel: "name",
    optionValue: "id",
    filters: [
      {
        field: "is_active",
        operator: "eq",
        value: true,
      },
    ],
    sorters: [
      {
        field: "display_order",
        order: "asc",
      },
    ],
  });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form
        {...formProps}
        layout="vertical"
        initialValues={{
          is_active: true,
          display_order: 0,
          specialization_id: preselectedSpecializationId || undefined,
        }}
      >
        <Form.Item
          label="Parent Specialization"
          name={["specialization_id"]}
          rules={[
            {
              required: true,
              message: "Please select a parent specialization",
            },
          ]}
        >
          <Select
            {...specializationSelectProps}
            placeholder="Select parent specialization"
          />
        </Form.Item>
        <Form.Item
          label="Sub-Specialization Name"
          name={["name"]}
          rules={[
            {
              required: true,
              message: "Please enter a sub-specialization name",
            },
          ]}
        >
          <Input placeholder="e.g., Interventional Cardiology, Neonatology" />
        </Form.Item>
        <Form.Item
          label="Display Order"
          name={["display_order"]}
          extra="Lower numbers appear first in the dropdown within the parent specialization."
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          label="Active"
          name={["is_active"]}
          valuePropName="checked"
          extra="Inactive sub-specializations won't appear in doctor registration"
        >
          <Switch />
        </Form.Item>
      </Form>
    </Create>
  );
};
