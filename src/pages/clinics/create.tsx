import React from "react";
import { Create, useForm } from "@refinedev/antd";
import { Form, Input } from "antd";

export const ClinicCreate: React.FC = () => {
  const { formProps, saveButtonProps } = useForm();

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
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
      </Form>
    </Create>
  );
};
