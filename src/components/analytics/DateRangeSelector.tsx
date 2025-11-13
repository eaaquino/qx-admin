import React from "react";
import { Radio, Space, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

interface DateRangeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  value,
  onChange,
  onRefresh,
  loading
}) => {
  return (
    <Space>
      <Radio.Group value={value} onChange={(e) => onChange(e.target.value)} buttonStyle="solid">
        <Radio.Button value="today">Today</Radio.Button>
        <Radio.Button value="7days">7 Days</Radio.Button>
        <Radio.Button value="1month">1 Month</Radio.Button>
        <Radio.Button value="1year">1 Year</Radio.Button>
        <Radio.Button value="lifetime">Lifetime</Radio.Button>
      </Radio.Group>
      {onRefresh && (
        <Button
          onClick={onRefresh}
          disabled={loading}
          icon={<ReloadOutlined spin={loading} />}
        >
          Refresh
        </Button>
      )}
    </Space>
  );
};
