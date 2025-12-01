import React from "react";
import { useLogin } from "@refinedev/core";
import {
    Row,
    Col,
    Layout as AntdLayout,
    Card,
    Typography,
    Form,
    Input,
    Button,
    Checkbox,
} from "antd";

const { Title } = Typography;

export interface ILoginForm {
    username: string;
    password: string;
    remember: boolean;
}

export const Login: React.FC = () => {
    const [form] = Form.useForm<ILoginForm>();
    
    const { mutate: login } = useLogin<ILoginForm>();
    
    const CardTitle = (
        <Title level={3} className="title" style={{textAlign: "center"}}>
            Sign in your account
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
                    marginRight: "auto"
                }}
                >
                <Col xs={22}>
                    <div className="container">
                        <div className="imageContainer" style={{
                            textAlign: "center"
                        }}>
                            <img src="/logo.png" alt="Qx" />
                        </div>
                        <Card title={CardTitle} headStyle={{ borderBottom: 0 }}>
                            <Form<ILoginForm>
                                layout="vertical"
                                form={form}
                                onFinish={(values) => {
                                    login(values);
                                }}
                                requiredMark={false}
                                initialValues={{
                                    remember: false,
                            }}>
                                <Form.Item
                                    name="email"
                                    label="Email"
                                    rules={[
                                    {
                                        required: true,
                                        message: "Email is required",
                                    },
                                    {
                                        type: "email",
                                        message: "Invalid email address",
                                    }
                                ]}>
                                    <Input size="large" placeholder="Username" autoComplete="email" />
                                </Form.Item>
                                <Form.Item
                                    name="password"
                                    label="Password"
                                    rules={[{ required: true }]}
                                    style={{ marginBottom: "12px"
                                }}>
                                    <Input type="password" placeholder="●●●●●●●●" size="large" autoComplete="current-password" />
                                </Form.Item>
                                <div style={{ marginBottom: "12px" }}>
                                    <Form.Item name="remember" valuePropName="checked" noStyle>
                                        <Checkbox
                                            style={{
                                                fontSize: "12px",
                                         }}>
                                            Remember me
                                        </Checkbox>
                                    </Form.Item>
                                </div>
                                <Button type="primary" size="large" htmlType="submit" block>
                                    Sign in
                                </Button>
                            </Form>
                        </Card>
                    </div>
                </Col>
            </Row>
        </AntdLayout>
    );
};