import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, Typography } from "antd";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const { Text } = Typography;

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
};

// Custom styles for Quill editor to match frontend rendering
const editorStyles = `
  .legal-editor.quill .ql-editor {
    min-height: 400px;
    font-size: 14px;
    line-height: 1.6;
  }
  .legal-editor.quill .ql-editor h1 {
    font-size: 2rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    margin-top: 1rem;
  }
  .legal-editor.quill .ql-editor h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
  }
  .legal-editor.quill .ql-editor h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }
  .legal-editor.quill .ql-editor p {
    margin-bottom: 1rem;
  }
  .legal-editor.quill .ql-editor ul,
  .legal-editor.quill .ql-editor ol {
    margin-bottom: 1rem;
    padding-left: 1.5rem;
  }
  .legal-editor.quill .ql-editor li {
    margin-bottom: 0.25rem;
  }
`;

export const LegalPageEdit: React.FC = () => {
  const { formProps, saveButtonProps, queryResult } = useForm({
    resource: "legal_pages",
  });

  const pageId = queryResult?.data?.data?.id;

  return (
    <Edit saveButtonProps={saveButtonProps} canDelete={false}>
      <style>{editorStyles}</style>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Page Title" name="title">
          <Input disabled />
        </Form.Item>

        <Form.Item label="Public URL">
          <Text code>
            /{pageId === "terms" ? "terms-and-conditions" : "privacy-policy"}
          </Text>
        </Form.Item>

        <Form.Item
          label="Content"
          name="content"
          rules={[{ required: true, message: "Content is required" }]}
          getValueFromEvent={(value) => value}
        >
          <ReactQuill
            theme="snow"
            modules={quillModules}
            className="legal-editor"
          />
        </Form.Item>
      </Form>
    </Edit>
  );
};
