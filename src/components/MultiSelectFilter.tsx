import React from "react";
import { Card, Select, Space } from "antd";

export interface FilterOption {
  label: string;
  value: string;
}

export interface MultiSelectFilterProps {
  label: string;
  options: FilterOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = "Select filters...",
}) => {
  return (
    <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: "12px 16px" }}>
      <Space>
        <span style={{ fontWeight: 500 }}>{label}:</span>
        <Select
          mode="multiple"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{ minWidth: 300 }}
          options={options}
          maxTagCount="responsive"
          allowClear
        />
      </Space>
    </Card>
  );
};
