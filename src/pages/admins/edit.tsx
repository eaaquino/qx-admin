import React, { useState } from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, Select, Switch, Card, Button, message, Divider } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { supabaseClient } from "../../utility";

export const AdminEdit: React.FC = () => {
  const { formProps, saveButtonProps, query } = useForm();
  const [passwordForm] = Form.useForm();
  const [changingPassword, setChangingPassword] = useState(false);

  const adminId = query?.data?.data?.id;

  const handlePasswordChange = async (values: { newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error("Passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        message.error("Authentication required");
        return;
      }

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/manage-admin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            action: "update_password",
            adminId,
            newPassword: values.newPassword,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to update password");
      }

      message.success(result.message || "Password updated successfully");
      passwordForm.resetFields();
    } catch (error: any) {
      console.error("Error updating password:", error);
      message.error(error.message || "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
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
          <Input disabled />
        </Form.Item>
        <Form.Item label="Phone" name={["phone"]}>
          <Input />
        </Form.Item>
        <Form.Item
          label="Role"
          name={["role"]}
          rules={[
            {
              required: true,
            },
          ]}
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
          label="Active"
          name={["is_active"]}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </Form>

      <Divider />

      <Card
        title={
          <span>
            <LockOutlined style={{ marginRight: 8 }} />
            Change Password
          </span>
        }
        size="small"
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordChange}
        >
          <Form.Item
            label="New Password"
            name="newPassword"
            rules={[
              { required: true, message: "Please enter new password" },
              { min: 6, message: "Password must be at least 6 characters" },
            ]}
          >
            <Input.Password placeholder="Enter new password" />
          </Form.Item>
          <Form.Item
            label="Confirm Password"
            name="confirmPassword"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Please confirm the password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm new password" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={changingPassword}
              icon={<LockOutlined />}
            >
              Update Password
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Edit>
  );
};
