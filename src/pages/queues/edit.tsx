import React from "react";
import { Edit, useForm, useSelect } from "@refinedev/antd";
import { Form, Input, InputNumber, Select } from "antd";

export const QueueEdit: React.FC = () => {
  const { formProps, saveButtonProps, queryResult } = useForm();

  const queueData = queryResult?.data?.data;

  const { selectProps: doctorSelectProps } = useSelect({
    resource: "doctors",
    optionLabel: (item) => `Dr. ${item.first_name} ${item.last_name}`,
    optionValue: "id",
    defaultValue: queueData?.doctor_id,
  });

  const { selectProps: patientSelectProps } = useSelect({
    resource: "patients",
    optionLabel: "name",
    optionValue: "id",
    defaultValue: queueData?.patient_id,
  });

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item
          label="Queue Position"
          name={["queue_position"]}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <InputNumber min={1} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          label="Patient"
          name={["patient_id"]}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Select {...patientSelectProps} />
        </Form.Item>
        <Form.Item
          label="Doctor"
          name={["doctor_id"]}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Select {...doctorSelectProps} />
        </Form.Item>
        <Form.Item
          label="Status"
          name={["status"]}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Select>
            <Select.Option value="waiting">Waiting</Select.Option>
            <Select.Option value="called">Called</Select.Option>
            <Select.Option value="in_progress">In Progress</Select.Option>
            <Select.Option value="completed">Completed</Select.Option>
            <Select.Option value="cancelled">Cancelled</Select.Option>
            <Select.Option value="no_show">No Show</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item
          label="Reason for Visit"
          name={["reason_for_visit"]}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Select>
            <Select.Option value="consult">Consultation</Select.Option>
            <Select.Option value="follow-up">Follow-up</Select.Option>
            <Select.Option value="medcert">Medical Certificate</Select.Option>
            <Select.Option value="prescription">Prescription</Select.Option>
            <Select.Option value="checkup">Check-up</Select.Option>
            <Select.Option value="emergency">Emergency</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item
          label="Estimated Wait Time (minutes)"
          name={["estimated_wait_time"]}
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
      </Form>
    </Edit>
  );
};
