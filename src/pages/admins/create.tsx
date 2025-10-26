import React, { useState } from "react";
import { Create } from "@refinedev/antd";
import { useCreate, useNavigation } from "@refinedev/core";
import { Form, Input, Select, Switch, Alert, Button, message } from "antd";
import { supabaseClient } from "../../utility";

export const AdminCreate: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { list } = useNavigation();

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      // Get current session
      const { data: { session } } = await supabaseClient.auth.getSession();

      if (!session) {
        message.error("Authentication required");
        setLoading(false);
        return;
      }

      // Call Edge Function to create admin
      const response = await fetch(
        `${supabaseClient.supabaseUrl}/functions/v1/create-admin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: supabaseClient.supabaseKey,
          },
          body: JSON.stringify({
            email: values.email,
            password: values.password,
            first_name: values.first_name,
            last_name: values.last_name,
            phone: values.phone || null,
            role: values.role,
            is_active: values.is_active ?? true,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to create admin user");
      }

      message.success("Admin user created successfully!");
      list("admins");
    } catch (error: any) {
      console.error("Error creating admin:", error);
      message.error(error.message || "Failed to create admin user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Create
      saveButtonProps={{
        onClick: () => form.submit(),
        loading,
      }}
      footerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
        </>
      )}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          label="First Name"
          name="first_name"
          rules={[
            {
              required: true,
              message: "Please enter first name",
            },
          ]}
        >
          <Input placeholder="John" />
        </Form.Item>
        <Form.Item
          label="Last Name"
          name="last_name"
          rules={[
            {
              required: true,
              message: "Please enter last name",
            },
          ]}
        >
          <Input placeholder="Doe" />
        </Form.Item>
        <Form.Item
          label="Email"
          name="email"
          rules={[
            {
              required: true,
              type: "email",
              message: "Please enter a valid email",
            },
          ]}
        >
          <Input placeholder="admin@example.com" />
        </Form.Item>
        <Form.Item
          label="Password"
          name="password"
          rules={[
            {
              required: true,
              message: "Please enter password",
            },
            {
              min: 6,
              message: "Password must be at least 6 characters",
            },
          ]}
        >
          <Input.Password placeholder="Minimum 6 characters" />
        </Form.Item>
        <Form.Item label="Phone" name="phone">
          <Input placeholder="+1234567890" />
        </Form.Item>
        <Form.Item
          label="Role"
          name="role"
          rules={[
            {
              required: true,
              message: "Please select a role",
            },
          ]}
          initialValue="admin"
        >
          <Select>
            <Select.Option value="super_admin">
              Super Admin - Full access, can manage other admins
            </Select.Option>
            <Select.Option value="admin">
              Admin - Can manage all data except admins
            </Select.Option>
            <Select.Option value="viewer">
              Viewer - Read-only access
            </Select.Option>
          </Select>
        </Form.Item>
        <Form.Item
          label="Active Status"
          name="is_active"
          valuePropName="checked"
          initialValue={true}
        >
          <Switch defaultChecked />
        </Form.Item>
      </Form>
    </Create>
  );
};
