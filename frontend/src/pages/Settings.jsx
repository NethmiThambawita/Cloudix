import React, { useEffect, useMemo, useState } from "react";
import {
  Layout,
  Card,
  Menu,
  Form,
  Input,
  Button,
  Upload,
  Row,
  Col,
  message,
  Image,
  Space,
  InputNumber,
  Typography,
} from "antd";
import {
  UploadOutlined,
  SaveOutlined,
  DeleteOutlined,
  SettingOutlined,
  ApartmentOutlined,
  PictureOutlined,
  DollarOutlined,
  FilePdfOutlined,
  FundOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import api from "../api/axios";
import { useSelector } from "react-redux";

const { Content, Sider } = Layout;
const { TextArea } = Input;

export default function Settings() {
  const { token } = useSelector((s) => s.auth);
  const authHeaders = useMemo(() => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  const [activeKey, setActiveKey] = useState("company");
  const [loading, setLoading] = useState(false);

  const [companyForm] = Form.useForm();
  const [currencyForm] = Form.useForm();
  const [pdfForm] = Form.useForm();
  const [financeForm] = Form.useForm();
  const [templateForm] = Form.useForm();

  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async () => {
    try {
      // FIXED: Use correct endpoint /settings
      const res = await api.get("/settings", { headers: authHeaders });
      
      if (res?.data?.success) {
        const data = res.data.result || {};
        
        // Load company settings
        companyForm.setFieldsValue({
          name: data.name,
          email: data.email,
          phone: data.phone,
          website: data.website,
          address: data.address,
          state: data.state,
          country: data.country,
          taxNumber: data.taxNumber,
          vatNumber: data.vatNumber,
          regNumber: data.regNumber,
        });

        // Load logo
        if (data.logoUrl) setLogoUrl(data.logoUrl);
        else if (data.logo) setLogoUrl(data.logo);

        // Load currency
        currencyForm.setFieldsValue({
          currency: data.currency,
          currencySymbol: data.currencySymbol,
        });

        // Load PDF settings
        pdfForm.setFieldsValue({
          invoiceFooter: data.invoiceFooter || "",
          quoteFooter: data.quoteFooter || "",
          offerFooter: data.offerFooter || "",
        });

        // Load finance settings
        financeForm.setFieldsValue({
          lastInvoiceNumber: data.lastInvoiceNumber,
          lastQuoteNumber: data.lastQuoteNumber,
          lastOfferNumber: data.lastOfferNumber,
          lastPaymentNumber: data.lastPaymentNumber,
        });

        // Load templates
        templateForm.setFieldsValue({
          defaultNotes: data.defaultNotes || "",
          defaultTerms: data.defaultTerms || "",
        });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      message.error("Failed to load settings");
    }
  };

  const saveSettings = async (payload) => {
    setLoading(true);
    try {
      // FIXED: Use correct endpoint /settings (without /api/v1 prefix)
      const res = await api.put("/settings", payload, {
        headers: authHeaders,
      });
      
      if (res?.data?.success) {
        message.success("Settings saved successfully");
        await loadAll(); // Reload to confirm
      } else {
        message.error("Failed to save settings");
      }
    } catch (error) {
      console.error("Save error:", error);
      message.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async ({ file, onSuccess, onError }) => {
    try {
      const formData = new FormData();
      formData.append("logo", file);

      // Backend endpoint is /settings/upload-logo
      const res = await api.post("/settings/upload-logo", formData, {
        headers: {
          ...authHeaders,
          "Content-Type": "multipart/form-data",
        },
      });

      if (res?.data?.success) {
        message.success("Logo uploaded successfully");
        setLogoUrl(res.data.result?.logoUrl || "");
        onSuccess();
      } else {
        message.error("Logo upload failed");
        onError();
      }
    } catch (error) {
      message.error("Logo upload failed");
      onError(error);
    }
  };

  const handleLogoDelete = async () => {
    try {
      const res = await api.delete("/settings/logo", { headers: authHeaders });
      if (res?.data?.success) {
        message.success("Logo deleted successfully");
        setLogoUrl("");
      } else {
        message.error("Failed to delete logo");
      }
    } catch (error) {
      message.error("Failed to delete logo");
    }
  };

  const menuItems = [
    {
      key: "general",
      icon: <SettingOutlined />,
      label: "General Settings",
    },
    {
      key: "company",
      icon: <ApartmentOutlined />,
      label: "Company Settings",
    },
    {
      key: "logo",
      icon: <PictureOutlined />,
      label: "Company Logo",
    },
    {
      key: "currency",
      icon: <DollarOutlined />,
      label: "Currency Settings",
    },
    {
      key: "pdf",
      icon: <FilePdfOutlined />,
      label: "PDF Settings",
    },
    {
      key: "finance",
      icon: <FundOutlined />,
      label: "Finance Settings",
    },
    {
      key: "templates",
      icon: <FileTextOutlined />,
      label: "Templates",
    },
  ];

  const CompanySection = (
    <Card title="Company Settings" bordered={false}>
      <Form
        form={companyForm}
        layout="vertical"
        onFinish={(v) => saveSettings(v)}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Company Name" name="name">
              <Input placeholder="Velora Solution (Pvt) Ltd" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Company Email" name="email">
              <Input placeholder="info@company.lk" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item label="Company Phone" name="phone">
              <Input placeholder="+94 11 234 5678" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Company Website" name="website">
              <Input placeholder="www.company.lk" />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item label="Company Address" name="address">
              <Input placeholder="Colombo, Sri Lanka" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item label="Company State/Province" name="state">
              <Input placeholder="Western Province" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Company Country" name="country">
              <Input placeholder="Sri Lanka" />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item label="Company Tax Number" name="taxNumber">
              <Input placeholder="234346536" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Company VAT Number" name="vatNumber">
              <Input placeholder="VAT123456" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Company Reg Number" name="regNumber">
              <Input placeholder="REG123456" />
            </Form.Item>
          </Col>
        </Row>

        <Button
          type="primary"
          htmlType="submit"
          icon={<SaveOutlined />}
          loading={loading}
        >
          Save Company Settings
        </Button>
      </Form>
    </Card>
  );

  const LogoSection = (
    <Card title="Company Logo" bordered={false}>
      <Space direction="vertical" style={{ width: "100%" }}>
        {logoUrl ? (
          <div style={{ textAlign: "center" }}>
            <Image
              src={logoUrl}
              alt="Company Logo"
              style={{ maxWidth: 220, maxHeight: 220 }}
            />
          </div>
        ) : (
          <Typography.Text type="secondary">No logo uploaded</Typography.Text>
        )}

        <Upload
          accept="image/*"
          showUploadList={false}
          customRequest={handleLogoUpload}
        >
          <Button icon={<UploadOutlined />}>
            {logoUrl ? "Change Logo" : "Upload Logo"}
          </Button>
        </Upload>

        {logoUrl && (
          <Button danger icon={<DeleteOutlined />} onClick={handleLogoDelete}>
            Delete Logo
          </Button>
        )}
      </Space>
    </Card>
  );

  const CurrencySection = (
    <Card title="Currency Settings" bordered={false}>
      <Form
        form={currencyForm}
        layout="vertical"
        onFinish={(v) => saveSettings(v)}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Currency" name="currency">
              <Input placeholder="LKR" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Currency Symbol" name="currencySymbol">
              <Input placeholder="Rs." />
            </Form.Item>
          </Col>
        </Row>

        <Button
          type="primary"
          htmlType="submit"
          icon={<SaveOutlined />}
          loading={loading}
        >
          Save Currency Settings
        </Button>
      </Form>
    </Card>
  );

  const PdfSection = (
    <Card title="PDF Settings" bordered={false}>
      <Form form={pdfForm} layout="vertical" onFinish={(v) => saveSettings(v)}>
        <Form.Item 
          label="Invoice PDF Footer" 
          name="invoiceFooter"
          tooltip="This text will appear at the bottom of all invoice PDFs"
        >
          <TextArea 
            rows={3} 
            placeholder="This invoice was created on a computer and is valid without the signature and seal"
          />
        </Form.Item>
        
        <Form.Item 
          label="Quotation PDF Footer" 
          name="quoteFooter"
          tooltip="This text will appear at the bottom of all quotation PDFs"
        >
          <TextArea 
            rows={3} 
            placeholder="This quotation was created on a computer and is valid without the signature and seal"
          />
        </Form.Item>
        
        <Form.Item 
          label="Offer PDF Footer" 
          name="offerFooter"
          tooltip="This text will appear at the bottom of all offer PDFs"
        >
          <TextArea 
            rows={3} 
            placeholder="This offer was created on a computer and is valid without the signature and seal"
          />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          icon={<SaveOutlined />}
          loading={loading}
        >
          Save PDF Settings
        </Button>
      </Form>
    </Card>
  );

  const FinanceSection = (
    <Card title="Finance Settings" bordered={false}>
      <Form
        form={financeForm}
        layout="vertical"
        onFinish={(v) => saveSettings(v)}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Last Invoice Number (SI-)" name="lastInvoiceNumber">
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Last Quotation Number (SQ-)" name="lastQuoteNumber">
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Last Offer Number" name="lastOfferNumber">
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Last Payment Number (PAY-)" name="lastPaymentNumber">
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
          </Col>
        </Row>

        <Button
          type="primary"
          htmlType="submit"
          icon={<SaveOutlined />}
          loading={loading}
        >
          Save Finance Settings
        </Button>
      </Form>
    </Card>
  );

  const TemplateSection = (
    <Card title="Templates (Notes & Terms)" bordered={false}>
      <Typography.Paragraph type="secondary">
        These templates will be pre-filled when creating new quotations and invoices.
        You can edit them for each individual document.
      </Typography.Paragraph>
      
      <Form
        form={templateForm}
        layout="vertical"
        onFinish={(v) => saveSettings(v)}
      >
        <Form.Item 
          label="Default Notes" 
          name="defaultNotes"
          tooltip="Default notes that will appear on quotations and invoices"
        >
          <TextArea 
            rows={4} 
            placeholder="Thank you for your business!"
          />
        </Form.Item>
        
        <Form.Item 
          label="Default Terms & Conditions" 
          name="defaultTerms"
          tooltip="Default terms that will appear on quotations and invoices"
        >
          <TextArea 
            rows={6} 
            placeholder="Payment terms: 50% advance, 50% on delivery&#10;Delivery: 2-3 weeks&#10;Prices valid for 30 days"
          />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          icon={<SaveOutlined />}
          loading={loading}
        >
          Save Templates
        </Button>
      </Form>
    </Card>
  );

  const renderContent = () => {
    switch (activeKey) {
      case "company":
        return CompanySection;
      case "logo":
        return LogoSection;
      case "currency":
        return CurrencySection;
      case "pdf":
        return PdfSection;
      case "finance":
        return FinanceSection;
      case "templates":
        return TemplateSection;
      default:
        return <Card title="Settings" bordered={false}>
          <Typography.Paragraph>
            Select a category from the sidebar to configure your ERP/CRM system.
          </Typography.Paragraph>
        </Card>;
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <Sider width={250} style={{ background: "#fff" }}>
        <div style={{ padding: "20px", borderBottom: "1px solid #f0f0f0" }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Settings
          </Typography.Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          items={menuItems}
          onClick={(e) => setActiveKey(e.key)}
          style={{ border: "none" }}
        />
      </Sider>
      <Layout>
        <Content style={{ margin: "24px 16px" }}>
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
}