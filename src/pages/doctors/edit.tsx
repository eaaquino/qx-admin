import React from "react";
import { Edit, useForm, useSelect } from "@refinedev/antd";
import { Form, Input, Select } from "antd";

export const DoctorEdit: React.FC = () => {
  const { formProps, saveButtonProps, queryResult } = useForm();

  const doctorData = queryResult?.data?.data;

  const { selectProps: clinicSelectProps } = useSelect({
    resource: "clinics",
    optionLabel: "name",
    optionValue: "id",
    defaultValue: doctorData?.clinic_id,
  });

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
      </Form>
    </Edit>
  );
};
