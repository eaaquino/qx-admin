import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, Switch, theme } from "antd";

export const CampaignZoneEdit: React.FC = () => {
  const { formProps, saveButtonProps, query } = useForm();
  const { token } = theme.useToken();
  const isUniversal = query?.data?.data?.is_universal;

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item
          label="Zone Name"
          name={["name"]}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="Description" name={["description"]}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item
          label="Universal Zone"
          name={["is_universal"]}
          valuePropName="checked"
          extra="Universal zones show campaigns to ALL doctors automatically (no assignment needed)"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="Active"
          name={["is_active"]}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        {isUniversal && (
          <div style={{
            padding: '12px',
            background: token.colorBgContainer,
            border: `1px solid ${token.colorBorder}`,
            borderRadius: token.borderRadiusLG,
            marginTop: '16px'
          }}>
            ℹ️ Universal zones cannot be deleted, only deactivated.
          </div>
        )}
      </Form>
    </Edit>
  );
};
