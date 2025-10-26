import React from "react";
import { Create, useForm } from "@refinedev/antd";
import { Form, Input, Switch } from "antd";

export const CampaignZoneCreate: React.FC = () => {
  const { formProps, saveButtonProps } = useForm();

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item
          label="Zone Name"
          name={["name"]}
          rules={[
            {
              required: true,
              message: "Please enter zone name",
            },
          ]}
        >
          <Input placeholder="e.g., Pediatrics, Downtown Clinics" />
        </Form.Item>
        <Form.Item label="Description" name={["description"]}>
          <Input.TextArea
            rows={3}
            placeholder="Description of this targeting zone"
          />
        </Form.Item>
        <Form.Item
          label="Universal Zone"
          name={["is_universal"]}
          valuePropName="checked"
          initialValue={false}
          extra="Universal zones show campaigns to ALL doctors automatically (no assignment needed)"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="Active"
          name={["is_active"]}
          valuePropName="checked"
          initialValue={true}
        >
          <Switch defaultChecked />
        </Form.Item>
      </Form>
    </Create>
  );
};
