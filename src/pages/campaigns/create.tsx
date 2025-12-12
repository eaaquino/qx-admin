import React, { useState } from "react";
import { Create, useSelect } from "@refinedev/antd";
import { useCreate, useNavigation } from "@refinedev/core";
import {
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  DatePicker,
  Alert,
  message,
  Upload,
  Button,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import { supabaseClient } from "../../utility";
import dayjs from "dayjs";

// Banner image specs: 2:1 aspect ratio (600x300 standard, 1200x600 retina)
const BANNER_ASPECT_RATIO = 2;
const ASPECT_RATIO_TOLERANCE = 0.1; // Allow 10% variance

const validateImageDimensions = (file: File): Promise<{ valid: boolean; width: number; height: number; message?: string }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      const aspectRatio = width / height;
      const isValidRatio = Math.abs(aspectRatio - BANNER_ASPECT_RATIO) <= ASPECT_RATIO_TOLERANCE;

      if (!isValidRatio) {
        resolve({
          valid: false,
          width,
          height,
          message: `Image aspect ratio should be 2:1. Your image is ${width}x${height} (${aspectRatio.toFixed(2)}:1). Recommended: 600x300 or 1200x600 pixels.`
        });
      } else {
        resolve({ valid: true, width, height });
      }
    };
    img.onerror = () => {
      resolve({ valid: false, width: 0, height: 0, message: "Failed to load image" });
    };
    img.src = URL.createObjectURL(file);
  });
};

export const CampaignCreate: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const { list } = useNavigation();

  const { selectProps: zoneSelectProps } = useSelect({
    resource: "campaign_zones",
    optionLabel: "name",
    optionValue: "id",
    filters: [
      {
        field: "is_active",
        operator: "eq",
        value: true,
      },
    ],
  });

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabaseClient.storage
      .from("banner-ads")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseClient.storage.from("banner-ads").getPublicUrl(filePath);

    return publicUrl;
  };

  const handleUpload: UploadProps["customRequest"] = async ({
    file,
    onSuccess,
    onError,
  }) => {
    setUploading(true);
    try {
      // Check image dimensions and warn if not optimal
      const validation = await validateImageDimensions(file as File);
      if (!validation.valid) {
        message.warning(validation.message + " The image will be cropped to fit.", 6);
      }

      const uploadedUrl = await uploadImage(file as File);
      setImageUrl(uploadedUrl);
      onSuccess?.("ok");
      message.success("Image uploaded successfully!");
    } catch (error: any) {
      console.error("Upload error:", error);
      onError?.(error);
      message.error(error.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    if (!imageUrl) {
      message.error("Please upload a banner image");
      return;
    }

    setLoading(true);
    try {
      // Get current admin user
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      // Get admin ID from admins table
      let createdBy = null;
      if (user) {
        const { data: adminData } = await supabaseClient
          .from("admins")
          .select("id")
          .eq("auth_user_id", user.id)
          .single();

        createdBy = adminData?.id || null;
      }

      // Create campaign
      const { data: campaign, error: campaignError } = await supabaseClient
        .from("ad_campaigns")
        .insert({
          title: values.title,
          description: values.description,
          image_url: imageUrl, // Use uploaded image URL
          link_url: values.link_url,
          start_date: values.start_date
            ? dayjs(values.start_date).toISOString()
            : new Date().toISOString(),
          end_date: values.end_date
            ? dayjs(values.end_date).toISOString()
            : null,
          is_active: values.is_active ?? true,
          display_duration_seconds: values.display_duration_seconds || 5,
          priority: values.priority || 0,
          created_by: createdBy,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Create zone tags if zones selected
      if (values.zones && values.zones.length > 0) {
        const zoneTags = values.zones.map((zoneId: string) => ({
          campaign_id: campaign.id,
          zone_id: zoneId,
        }));

        const { error: tagsError } = await supabaseClient
          .from("campaign_zone_tags")
          .insert(zoneTags);

        if (tagsError) throw tagsError;
      }

      message.success("Campaign created successfully!");
      list("ad_campaigns");
    } catch (error: any) {
      console.error("Error creating campaign:", error);
      message.error(error.message || "Failed to create campaign");
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
    >
      <Alert
        message="Campaign Targeting"
        description="Select campaign zones to target specific doctors/clinics. If no zones are selected, the campaign won't be shown anywhere."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          label="Campaign Title"
          name="title"
          rules={[
            {
              required: true,
              message: "Please enter campaign title",
            },
          ]}
        >
          <Input placeholder="e.g., Summer Health Checkup Discount" />
        </Form.Item>

        <Form.Item label="Description" name="description">
          <Input.TextArea rows={3} placeholder="Campaign description" />
        </Form.Item>

        <Form.Item
          label="Banner Image"
          name="image_upload"
          rules={[
            {
              required: true,
              message: "Please upload a banner image",
            },
          ]}
          extra="Recommended size: 600x300px (or 1200x600px for retina). Aspect ratio must be 2:1. Accepted formats: JPG, PNG, WebP, GIF (Max 5MB)"
        >
          <Upload
            customRequest={handleUpload}
            listType="picture-card"
            fileList={fileList}
            onChange={({ fileList: newFileList }) => setFileList(newFileList)}
            maxCount={1}
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            onRemove={() => {
              setImageUrl("");
              setFileList([]);
            }}
          >
            {fileList.length === 0 && (
              <div>
                <UploadOutlined />
                <div style={{ marginTop: 8 }}>Upload</div>
              </div>
            )}
          </Upload>
        </Form.Item>
        {imageUrl && (
          <Alert
            message="Image uploaded successfully"
            description={imageUrl}
            type="success"
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item
          label="Link URL"
          name="link_url"
          extra="Where to redirect when clicked (optional)"
        >
          <Input placeholder="https://example.com/promo" />
        </Form.Item>

        <Form.Item
          label="Target Campaign Zones"
          name="zones"
          rules={[
            {
              required: true,
              message: "Please select at least one zone",
            },
          ]}
        >
          <Select
            {...zoneSelectProps}
            mode="multiple"
            placeholder="Select zones to target"
          />
        </Form.Item>

        <Form.Item
          label="Start Date"
          name="start_date"
          initialValue={dayjs()}
        >
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item label="End Date" name="end_date" extra="Leave empty for no end date">
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          label="Display Duration (seconds)"
          name="display_duration_seconds"
          initialValue={5}
          rules={[
            {
              type: "number",
              min: 3,
              max: 60,
              message: "Duration must be between 3-60 seconds",
            },
          ]}
        >
          <InputNumber min={3} max={60} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          label="Priority"
          name="priority"
          initialValue={0}
          extra="Higher priority campaigns are shown first (0-10)"
        >
          <InputNumber min={0} max={10} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          label="Active"
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
