import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, InputNumber, Switch } from "antd";

export const SpecializationEdit: React.FC = () => {
  const { formProps, saveButtonProps } = useForm();

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item
          label="Specialization Name"
          name={["name"]}
          rules={[
            {
              required: true,
              message: "Please enter a specialization name",
            },
          ]}
        >
          <Input placeholder="e.g., General Practice, Cardiology, Pediatrics" />
        </Form.Item>
        <Form.Item
          label="Display Order"
          name={["display_order"]}
          extra="Lower numbers appear first in the dropdown. Use 0 for alphabetical ordering."
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          label="Active"
          name={["is_active"]}
          valuePropName="checked"
          extra="Inactive specializations won't appear in doctor registration"
        >
          <Switch />
        </Form.Item>
      </Form>
    </Edit>
  );
};
