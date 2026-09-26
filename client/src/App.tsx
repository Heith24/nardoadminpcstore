import { useEffect, useState } from 'react';
import { BarChartOutlined, DashboardOutlined, LaptopOutlined, LogoutOutlined, MenuOutlined, PlusOutlined, SettingOutlined, UploadOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Card, Dropdown, Empty, Form, Image, Input, InputNumber, Layout, Menu, message, Modal, Select, Space, Statistic, Table, Tag, Typography, Upload, type MenuProps } from 'antd';
import axios from 'axios';
import { api, type Category, type InventoryReport, type Product, type User } from './api';

const { Header, Sider, Content } = Layout;
type ProductFormValues = { name: string; categoryId?: number; price: number; stock: number; status: Product['status']; imageData?: string | null };
type StaffFormValues = { firstName: string; lastName: string; email: string; password: string; role: 'admin' | 'superadmin'; imageData?: string | null };
const emptyProduct: ProductFormValues = { name: '', categoryId: undefined, price: 0, stock: 0, status: 'active', imageData: null };
const getApiErrorMessage = (error: unknown, fallback: string) => axios.isAxiosError<{ message?: string }>(error) ? error.response?.data?.message ?? (error.response ? fallback : 'API connection failed. Check that the server is running and SQL Server TCP/IP is enabled.') : fallback;

function ProductImage({ src, size = 52, circle = false }: { src?: string | null; size?: number; circle?: boolean }) {
  const [imageSrc, setImageSrc] = useState<string>();
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    setImageSrc(undefined);
    if (!src) return () => { active = false; };
    if (src.startsWith('data:image/')) { setImageSrc(src); return () => { active = false; }; }
    const apiPath = src.replace(/^\/api(?=\/)/, '');
    api.get<Blob>(apiPath, { responseType: 'blob' }).then(({ data }) => {
      objectUrl = URL.createObjectURL(data);
      if (active) setImageSrc(objectUrl);
      else URL.revokeObjectURL(objectUrl!);
    }).catch(() => undefined);
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src]);
  return imageSrc ? <Image src={imageSrc} width={size} height={size} style={{ objectFit: 'cover', borderRadius: circle ? '50%' : undefined }} /> : <div className="product-image-placeholder" style={{ width: size, height: size, borderRadius: circle ? '50%' : undefined }}>{circle ? <UserOutlined /> : 'No image'}</div>;
}

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [loading, setLoading] = useState(false);
  const submit = async (values: { email: string; password: string }) => { setLoading(true); try { const { data } = await api.post<{ token: string; user: User }>('/auth/login', values); localStorage.setItem('token', data.token); onLogin(data.user); } catch { message.error('Invalid credentials'); } finally { setLoading(false); } };
  return <main className="login-page"><div className="login-card"><div className="brand-mark">Nardo Express / Admin</div><Typography.Title level={1}>Control the floor.</Typography.Title><Typography.Paragraph type="secondary">Manage products, inventory, and store performance from one workspace.</Typography.Paragraph><Form layout="vertical" onFinish={submit} initialValues={{ email: 'superadmin@example.com' }}><Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}><Input prefix={<UserOutlined />} /></Form.Item><Form.Item label="Password" name="password" rules={[{ required: true }]}><Input.Password /></Form.Item><Button type="primary" htmlType="submit" block loading={loading}>Sign in</Button></Form></div></main>;
}

function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [imagePreview, setImagePreview] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form] = Form.useForm<ProductFormValues>();
  const load = async () => { setLoading(true); try { setProducts((await api.get<Product[]>('/products')).data); } catch (error) { message.error(getApiErrorMessage(error, 'Could not load products')); } finally { setLoading(false); } };
  useEffect(() => { void load(); api.get<Category[]>('/categories').then(({ data }) => setCategories(data)).catch(() => message.error('Could not load product categories')); }, []);
  const save = async (values: ProductFormValues) => {
    setSaving(true);
    try {
      const product = { ...values, categoryId: values.categoryId!, imageData: values.imageData ?? null };
      if (editing) await api.put(`/products/${editing.id}`, product);
      else await api.post('/products', product);
      message.success(editing ? 'Product updated' : 'Product created');
      setOpen(false); setEditing(null); setImagePreview(undefined); form.resetFields(); await load();
    } catch (error) { message.error(getApiErrorMessage(error, error instanceof Error ? error.message : 'Could not save product')); }
    finally { setSaving(false); }
  };
  const remove = (product: Product) => Modal.confirm({ title: 'Delete product?', content: `This will remove ${product.name} from the catalog.`, okText: 'Delete', okButtonProps: { danger: true }, onOk: async () => { try { await api.delete(`/products/${product.id}`); message.success('Product deleted'); await load(); } catch (error) { message.error(getApiErrorMessage(error, 'Could not delete product')); } } });
  const openForm = (product?: Product) => { setEditing(product ?? null); form.setFieldsValue(product ? { ...product, imageData: undefined } : emptyProduct); setImagePreview(product?.imageUrl ?? undefined); setOpen(true); };
  const readUpload = (file: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { message.error('Choose a PNG, JPG, WebP, or GIF image'); return false; }
    if (file.size > 5 * 1024 * 1024) { message.error('Product images must be 5 MB or smaller'); return false; }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') { form.setFieldsValue({ imageData: reader.result }); setImagePreview(reader.result); } };
    reader.onerror = () => message.error('Could not read image file');
    reader.readAsDataURL(file);
    return false;
  };
  return <>
    <div className="page-heading"><div><Typography.Title level={2}>Products</Typography.Title><Typography.Text type="secondary">Keep the catalog and stock position current.</Typography.Text></div><Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>Add product</Button></div>
    <Table loading={loading} rowKey="id" dataSource={products} columns={[{ title: 'Image', dataIndex: 'imageUrl', render: (value: string | null) => <ProductImage src={value} /> }, { title: 'Product', dataIndex: 'name' }, { title: 'Category', dataIndex: 'category' }, { title: 'Price', dataIndex: 'price', render: (value: number) => `$${value.toLocaleString()}` }, { title: 'Stock', dataIndex: 'stock' }, { title: 'Status', dataIndex: 'status', render: (value: string) => <Tag color={value === 'active' ? 'green' : 'default'}>{value}</Tag> }, { title: 'Action', render: (_: unknown, item: Product) => <Space><Button onClick={() => openForm(item)}>Edit</Button><Button danger onClick={() => remove(item)}>Delete</Button></Space> }]} locale={{ emptyText: <Empty description="No products yet" /> }} />
    <Modal title={editing ? 'Edit product' : 'New product'} open={open} confirmLoading={saving} onCancel={() => setOpen(false)} onOk={() => form.submit()}>
      <Form form={form} layout="vertical" onFinish={save}>
        <Form.Item label="Product image">
          <Space direction="vertical" size="middle">
            <Upload accept="image/png,image/jpeg,image/webp,image/gif" maxCount={1} showUploadList={false} beforeUpload={readUpload}><Button icon={<UploadOutlined />}>Upload image</Button></Upload>
            <ProductImage src={imagePreview} size={144} />
            {imagePreview && <Button onClick={() => { form.setFieldsValue({ imageData: null }); setImagePreview(undefined); }}>Remove image</Button>}
          </Space>
        </Form.Item>
        <Form.Item name="imageData" hidden><Input /></Form.Item>
        <Form.Item label="Name" name="name" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item label="Category" name="categoryId" rules={[{ required: true }]}><Select options={categories.map((category) => ({ label: category.name, value: category.id }))} /></Form.Item>
        <Form.Item label="Price" name="price" rules={[{ required: true, type: 'number', min: 0 }]}><InputNumber min={0} precision={2} style={{ width: '100%' }} /></Form.Item>
        <Form.Item label="Stock" name="stock" rules={[{ required: true, type: 'number', min: 0 }]}><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item label="Status" name="status"><Select options={[{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }]} /></Form.Item>
      </Form>
    </Modal>
  </>;
}

function Reports() { const [report, setReport] = useState<InventoryReport>(); const [loading, setLoading] = useState(true); useEffect(() => { api.get<InventoryReport>('/reports/inventory').then(({ data }) => setReport(data)).catch(() => message.error('Could not load report')).finally(() => setLoading(false)); }, []); return <><div className="page-heading"><div><Typography.Title level={2}>Inventory report</Typography.Title><Typography.Text type="secondary">A simple stock and inventory value snapshot.</Typography.Text></div></div>{report && <Space size="large" wrap><Card className="metric-card"><Statistic title="Products" value={report.totalProducts} /></Card><Card className="metric-card"><Statistic title="Units in stock" value={report.totalStock} /></Card><Card className="metric-card"><Statistic title="Inventory value" value={report.inventoryValue} prefix="$" /></Card><Card title="Stock by category" style={{ minWidth: 320 }}><Table loading={loading} pagination={false} rowKey="category" dataSource={report.byCategory} columns={[{ title: 'Category', dataIndex: 'category' }, { title: 'Units', dataIndex: 'stock' }]} /></Card></Space>}{loading && !report && <Card loading />}</>; }

function Dashboard() { const [report, setReport] = useState<InventoryReport>(); useEffect(() => { api.get<InventoryReport>('/reports/inventory').then(({ data }) => setReport(data)).catch(() => message.error('Could not load overview')); }, []); return <><div className="page-heading"><div><Typography.Title level={2}>Overview</Typography.Title><Typography.Text type="secondary">A quick read on your current store inventory.</Typography.Text></div></div>{report ? <div className="dashboard-counters"><Card className="dashboard-counter dashboard-counter--products"><Statistic title="Products" value={report.totalProducts} /></Card><Card className="dashboard-counter dashboard-counter--active"><Statistic title="Active products" value={report.activeProducts} /></Card><Card className="dashboard-counter dashboard-counter--stock"><Statistic title="Units in stock" value={report.totalStock} /></Card><Card className="dashboard-counter dashboard-counter--value"><Statistic title="Inventory value" value={report.inventoryValue} prefix="$" precision={2} /></Card></div> : <div className="dashboard-counters"><Card className="dashboard-counter" loading /><Card className="dashboard-counter" loading /><Card className="dashboard-counter" loading /><Card className="dashboard-counter" loading /></div>}</>; }

function Settings({ currentUser }: { currentUser: User }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>();
  const [form] = Form.useForm<StaffFormValues>();
  const load = async () => { setLoading(true); try { setUsers((await api.get<User[]>('/users')).data); } catch (error) { message.error(getApiErrorMessage(error, 'Could not load users')); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const readUpload = (file: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { message.error('Choose a PNG, JPG, WebP, or GIF image'); return false; }
    if (file.size > 5 * 1024 * 1024) { message.error('Profile images must be 5 MB or smaller'); return false; }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') { form.setFieldsValue({ imageData: reader.result }); setImagePreview(reader.result); } };
    reader.onerror = () => message.error('Could not read image file');
    reader.readAsDataURL(file);
    return false;
  };
  const save = async (values: StaffFormValues) => {
    setSaving(true);
    try {
      await api.post('/users', { ...values, imageData: values.imageData ?? null });
      message.success('Staff account created');
      setOpen(false); setImagePreview(undefined); form.resetFields(); await load();
    } catch (error) { message.error(getApiErrorMessage(error, 'Could not create staff account')); }
    finally { setSaving(false); }
  };
  return <>
    <div className="page-heading"><div><Typography.Title level={2}>Settings</Typography.Title><Typography.Text type="secondary">Staff accounts and access roles.</Typography.Text></div>{currentUser.role === 'superadmin' && <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setImagePreview(undefined); setOpen(true); }}>Add staff</Button>}</div>
    <Table loading={loading} rowKey="id" dataSource={users} columns={[{ title: 'Image', dataIndex: 'imageUrl', render: (value: string | null) => <ProductImage src={value} size={44} circle /> }, { title: 'Firstname', dataIndex: 'firstName' }, { title: 'Lastname', dataIndex: 'lastName' }, { title: 'Email', dataIndex: 'email' }, { title: 'Role', dataIndex: 'role', render: (value: User['role']) => <Tag color={value === 'superadmin' ? 'purple' : value === 'admin' ? 'blue' : 'default'}>{value}</Tag> }]} locale={{ emptyText: <Empty description="No staff accounts" /> }} />
    {currentUser.role === 'superadmin' && <Modal title="Add staff" open={open} confirmLoading={saving} onCancel={() => setOpen(false)} onOk={() => form.submit()}>
      <Form form={form} layout="vertical" initialValues={{ role: 'admin' }} onFinish={save}>
        <Form.Item label="Profile image">
          <Space direction="vertical" size="middle">
            <Upload accept="image/png,image/jpeg,image/webp,image/gif" maxCount={1} showUploadList={false} beforeUpload={readUpload}><Button icon={<UploadOutlined />}>Upload image</Button></Upload>
            <ProductImage src={imagePreview} size={112} circle />
            {imagePreview && <Button onClick={() => { form.setFieldsValue({ imageData: null }); setImagePreview(undefined); }}>Remove image</Button>}
          </Space>
        </Form.Item>
        <Form.Item name="imageData" hidden><Input /></Form.Item>
        <Form.Item label="Firstname" name="firstName" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item label="Lastname" name="lastName" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
        <Form.Item label="Temporary password" name="password" rules={[{ required: true, min: 8 }]}><Input.Password /></Form.Item>
        <Form.Item label="Role" name="role" rules={[{ required: true }]}><Select options={[{ label: 'Admin', value: 'admin' }, { label: 'Superadmin', value: 'superadmin' }]} /></Form.Item>
      </Form>
    </Modal>}
  </>;
}

function Profile({ currentUser }: { currentUser: User }) {
  return <>
    <div className="page-heading"><div><Typography.Title level={2}>Profile</Typography.Title></div></div>
    <Space align="center" size="large">
      <ProductImage src={currentUser.imageUrl} size={96} circle />
      <div><Typography.Title level={3}>{currentUser.firstName} {currentUser.lastName}</Typography.Title><Typography.Text>{currentUser.email}</Typography.Text><br /><Tag color={currentUser.role === 'superadmin' ? 'purple' : currentUser.role === 'admin' ? 'blue' : 'default'}>{currentUser.role}</Tag></div>
    </Space>
  </>;
}

function Admin({ currentUser, onLogout }: { currentUser: User; onLogout: () => void }) {
  const [page, setPage] = useState('dashboard');
  const content = page === 'products' ? <Products /> : page === 'reports' ? <Reports /> : page === 'settings' ? <Settings currentUser={currentUser} /> : page === 'profile' ? <Profile currentUser={currentUser} /> : <Dashboard />;
  const accountMenuItems: MenuProps['items'] = [
    { key: 'profile', icon: <UserOutlined />, label: 'Profile' },
    { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
    { type: 'divider' },
    { key: 'signout', icon: <LogoutOutlined />, label: 'Sign out' }
  ];
  return <Layout className="app-layout"><Sider breakpoint="lg" collapsedWidth="0"><div className="sidebar-brand">NARDO / STORE</div><Menu theme="dark" mode="inline" selectedKeys={[page]} onClick={({ key }) => setPage(key)} items={[{ key: 'dashboard', icon: <DashboardOutlined />, label: 'Overview' }, { key: 'products', icon: <LaptopOutlined />, label: 'Products' }, { key: 'reports', icon: <BarChartOutlined />, label: 'Reports' }]} /></Sider><Layout><Header className="app-header"><Space align="center"><ProductImage src={currentUser.imageUrl} size={36} circle /><Typography.Text>{currentUser.firstName} {currentUser.lastName}</Typography.Text><Dropdown menu={{ items: accountMenuItems, onClick: ({ key }) => key === 'signout' ? onLogout() : setPage(key) }} trigger={['click']} placement="bottomRight"><Button type="text" icon={<MenuOutlined />} aria-label="Open account menu" title="Account menu" /></Dropdown></Space></Header><Content className="app-content">{content}</Content></Layout></Layout>;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(Boolean(localStorage.getItem('token')));
  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api.get<User>('/auth/me').then(({ data }) => setCurrentUser(data)).catch(() => localStorage.removeItem('token')).finally(() => setChecking(false));
  }, []);
  if (checking) return <main className="login-page"><Card loading /></main>;
  if (!currentUser) return <Login onLogin={setCurrentUser} />;
  return <Admin currentUser={currentUser} onLogout={() => { localStorage.removeItem('token'); setCurrentUser(null); }} />;
}