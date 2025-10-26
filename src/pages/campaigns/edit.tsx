import React, { useEffect, useState } from "react";
import { Edit, useSelect } from "@refinedev/antd";
import { useGetIdentity, useNavigation } from "@refinedev/core";
import {
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  DatePicker,
  message,
  Upload,
  Image,
  Alert,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import { supabaseClient } from "../../utility";
import dayjs from "dayjs";
import { useParams } from "react-router";

export const CampaignEdit: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>("");
  const [newImageUrl, setNewImageUrl] = useState<string>("");
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const { list } = useNavigation();
  const { id } = useParams();

  const { selectProps: zoneSelectProps } = useSelect({
    resource: "campaign_zones",
    optionLabel: "name",
    optionValue: "id",
  });

  // Load campaign data and selected zones
  useEffect(() => {
    const loadCampaign = async () => {
      if (!id) return;

      try {
        // Get campaign data
        const { data: campaign, error: campaignError } = await supabaseClient
          .from("ad_campaigns")
          .select("*")
          .eq("id", id)
          .single();

        if (campaignError) throw campaignError;

        // Get selected zones
        const { data: zoneTags, error: tagsError } = await supabaseClient
          .from("campaign_zone_tags")
          .select("zone_id")
          .eq("campaign_id", id);

        if (tagsError) throw tagsError;

        // Store current image URL
        setCurrentImageUrl(campaign.image_url || "");

        // Set form values
        form.setFieldsValue({
          ...campaign,
          start_date: campaign.start_date ? dayjs(campaign.start_date) : null,
          end_date: campaign.end_date ? dayjs(campaign.end_date) : null,
          zones: zoneTags.map((tag) => tag.zone_id),
        });
      } catch (error: any) {
        console.error("Error loading campaign:", error);
        message.error("Failed to load campaign data");
      } finally {
        setInitialLoading(false);
      }
    };

    loadCampaign();
  }, [id, form]);

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
      const uploadedUrl = await uploadImage(file as File);
      setNewImageUrl(uploadedUrl);
      onSuccess?.("ok");
      message.success("New image uploaded successfully!");
    } catch (error: any) {
      console.error("Upload error:", error);
      onError?.(error);
      message.error(error.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    if (!id) return;

    setLoading(true);
    try {
      // Update campaign
      // Use new image if uploaded, otherwise keep current
      const imageToUse = newImageUrl || currentImageUrl;

      const { error: campaignError } = await supabaseClient
        .from("ad_campaigns")
        .update({
          title: values.title,
          description: values.description,
          image_url: imageToUse,
          link_url: values.link_url,
          start_date: values.start_date
            ? dayjs(values.start_date).toISOString()
            : null,
          end_date: values.end_date
            ? dayjs(values.end_date).toISOString()
            : null,
          is_active: values.is_active,
          display_duration_seconds: values.display_duration_seconds,
          priority: values.priority,
        })
        .eq("id", id);

      if (campaignError) throw campaignError;

      // Delete existing zone tags
      await supabaseClient
        .from("campaign_zone_tags")
        .delete()
        .eq("campaign_id", id);

      // Create new zone tags
      if (values.zones && values.zones.length > 0) {
        const zoneTags = values.zones.map((zoneId: string) => ({
          campaign_id: id,
          zone_id: zoneId,
        }));

        const { error: tagsError } = await supabaseClient
          .from("campaign_zone_tags")
          .insert(zoneTags);

        if (tagsError) throw tagsError;
      }

      message.success("Campaign updated successfully!");
      list("ad_campaigns");
    } catch (error: any) {
      console.error("Error updating campaign:", error);
      message.error(error.message || "Failed to update campaign");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Edit
      saveButtonProps={{
        onClick: () => form.submit(),
        loading,
      }}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          label="Campaign Title"
          name="title"
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item label="Description" name="description">
          <Input.TextArea rows={3} />
        </Form.Item>

        <Form.Item label="Current Banner Image">
          {currentImageUrl ? (
            <Image
              src={currentImageUrl}
              alt="Current banner"
              style={{ maxWidth: "300px", borderRadius: "8px" }}
            />
          ) : (
            <div style={{
              padding: "20px",
              background: "#f0f0f0",
              borderRadius: "8px",
              textAlign: "center",
              color: "#999"
            }}>
              No image uploaded
            </div>
          )}
        </Form.Item>

        <Form.Item
          label="Upload New Banner Image"
          name="image_upload"
          extra="Upload a new banner image to replace the current one (JPG, PNG, WebP, GIF - Max 5MB)"
        >
          <Upload
            customRequest={handleUpload}
            listType="picture-card"
            fileList={fileList}
            onChange={({ fileList: newFileList }) => setFileList(newFileList)}
            maxCount={1}
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            onRemove={() => {
              setNewImageUrl("");
              setFileList([]);
            }}
          >
            {fileList.length === 0 && (
              <div>
                <UploadOutlined />
                <div style={{ marginTop: 8 }}>Upload New</div>
              </div>
            )}
          </Upload>
        </Form.Item>
        {newImageUrl && (
          <Alert
            message="New image uploaded"
            description="The new image will replace the current one when you save"
            type="info"
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item label="Link URL" name="link_url">
          <Input />
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
            placeholder="Select zones"
          />
        </Form.Item>

        <Form.Item label="Start Date" name="start_date">
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item label="End Date" name="end_date">
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item label="Display Duration (seconds)" name="display_duration_seconds">
          <InputNumber min={3} max={60} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item label="Priority" name="priority">
          <InputNumber min={0} max={10} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item label="Active" name="is_active" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Edit>
  );
};
