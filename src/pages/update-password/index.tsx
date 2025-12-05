import React, { useEffect, useState } from "react";
import { useUpdatePassword, useGo } from "@refinedev/core";
import {
  Row,
  Col,
  Layout as AntdLayout,
  Card,
  Typography,
  Form,
  Input,
  Button,
  Alert,
  Spin,
} from "antd";
import { LockOutlined } from "@ant-design/icons";
import { supabaseClient } from "../../utility";

const { Title, Text } = Typography;

interface IUpdatePasswordForm {
  password: string;
  confirmPassword: string;
}

export const UpdatePassword: React.FC = () => {
  const [form] = Form.useForm<IUpdatePasswordForm>();
  const { mutate: updatePassword } = useUpdatePassword();
  const go = useGo();
  const [submitting, setSubmitting] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<"loading" | "valid" | "invalid">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check if we have a valid recovery session from the URL hash
    const checkSession = async () => {
      try {
        // Supabase automatically picks up the tokens from the URL hash
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error) {
          console.error("Session error:", error);
          setErrorMessage(error.message);
          setSessionStatus("invalid");
          return;
        }

        if (session) {
          setSessionStatus("valid");
        } else {
          // Try to exchange the hash tokens for a session
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          const type = hashParams.get("type");

          if (type === "recovery" && accessToken && refreshToken) {
            const { error: setSessionError } = await supabaseClient.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (setSessionError) {
              console.error("Set session error:", setSessionError);
              setErrorMessage(setSessionError.message);
              setSessionStatus("invalid");
            } else {
              setSessionStatus("valid");
            }
          } else {
            setErrorMessage("Invalid or expired recovery link. Please request a new password reset.");
            setSessionStatus("invalid");
          }
        }
      } catch (err: any) {
        console.error("Check session error:", err);
        setErrorMessage(err.message || "An error occurred");
        setSessionStatus("invalid");
      }
    };

    checkSession();
  }, []);

  const onFinish = async (values: IUpdatePasswordForm) => {
    if (values.password !== values.confirmPassword) {
      form.setFields([
        {
          name: "confirmPassword",
          errors: ["Passwords do not match"],
        },
      ]);
      return;
    }

    setSubmitting(true);
    updatePassword(
      { password: values.password },
      {
        onSuccess: () => {
          setSubmitting(false);
          go({ to: "/login", type: "replace" });
        },
        onError: () => {
          setSubmitting(false);
        },
      }
    );
  };

  const CardTitle = (
    <Title level={3} className="title" style={{ textAlign: "center" }}>
      <LockOutlined style={{ marginRight: 8 }} />
      Set New Password
    </Title>
  );

  return (
    <AntdLayout className="layout">
      <Row
        justify="center"
        align="middle"
        style={{
          width: "600px",
          maxWidth: "100%",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <Col xs={22}>
          <div className="container">
            <div
              className="imageContainer"
              style={{
                textAlign: "center",
              }}
            >
              <img src="/logo.png" alt="Qx" />
            </div>
            <Card title={CardTitle} headStyle={{ borderBottom: 0 }}>
              {sessionStatus === "loading" && (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <Spin size="large" />
                  <Text style={{ display: "block", marginTop: 16 }}>
                    Verifying recovery link...
                  </Text>
                </div>
              )}

              {sessionStatus === "invalid" && (
                <div>
                  <Alert
                    type="error"
                    message="Invalid Recovery Link"
                    description={errorMessage || "This password reset link is invalid or has expired."}
                    showIcon
                    style={{ marginBottom: 24 }}
                  />
                  <Button type="primary" block size="large" onClick={() => go({ to: "/login", type: "replace" })}>
                    Back to Login
                  </Button>
                </div>
              )}

              {sessionStatus === "valid" && (
                <Form<IUpdatePasswordForm>
                  layout="vertical"
                  form={form}
                  onFinish={onFinish}
                  requiredMark={false}
                >
                  <Alert
                    type="info"
                    message="Enter your new password below"
                    showIcon
                    style={{ marginBottom: 24 }}
                  />
                  <Form.Item
                    name="password"
                    label="New Password"
                    rules={[
                      { required: true, message: "Password is required" },
                      { min: 6, message: "Password must be at least 6 characters" },
                    ]}
                  >
                    <Input.Password
                      size="large"
                      placeholder="Enter new password"
                      autoComplete="new-password"
                    />
                  </Form.Item>
                  <Form.Item
                    name="confirmPassword"
                    label="Confirm Password"
                    dependencies={["password"]}
                    rules={[
                      { required: true, message: "Please confirm your password" },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue("password") === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error("Passwords do not match"));
                        },
                      }),
                    ]}
                  >
                    <Input.Password
                      size="large"
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                    />
                  </Form.Item>
                  <Button
                    type="primary"
                    size="large"
                    htmlType="submit"
                    block
                    loading={submitting}
                  >
                    Update Password
                  </Button>
                </Form>
              )}
            </Card>
          </div>
        </Col>
      </Row>
    </AntdLayout>
  );
};
