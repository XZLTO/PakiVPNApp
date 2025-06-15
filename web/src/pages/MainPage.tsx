import React, { useState, useEffect } from 'react';
import { Button, Card, Tag, Modal, ConfigProvider, Layout, Typography, Space, Image, List, notification, Drawer } from 'antd';
import { ThunderboltOutlined, DisconnectOutlined, GlobalOutlined } from '@ant-design/icons';
import styled, { keyframes } from 'styled-components';
import logo from "./LOGO_PAKI_TEXT.png";
import { config } from '../config';
import { Domain, VpnStatus } from '../types/Vpn';
import { stat } from 'fs';
import { ApiClient, apiClientInstance, VPNLocation } from '../api/ClientApi';
import { codes_ru } from '../types/codes';
import { NotificationInstance } from 'antd/es/notification/interface';
import { useNotification } from '../contexts/notification';
import { useNavigation } from '../router/routerContext';
import { useVpn } from '../contexts/vpn';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

interface Server {
  id: string;
  name: string;
  countryCode: string;
  status: ServerTag[];
  ping: number;
}

interface ServerTag {
  text: string;
  color: string;
}

interface StatusWaveProps {
  $connected: boolean;
}

const wave = keyframes`
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
`;

const ConnectionStatus = styled.div<StatusWaveProps>`
  position: absolute;
  width: 100%;
  height: 100%;
  display: ${props => props.$connected ? 'block' : 'none'};
`;

const Wave = styled.div<{ $delay: number }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 2px solid #ffb600;
  border-radius: 50%;
  animation: ${wave} 1s infinite;
  animation-delay: ${props => props.$delay}s;
`;

const StyledButton = styled(Button)`
  width: 150px;
  height: 150px;
  font-size: 18px;
  border-radius: 50%;
  transition: all 0.3s ease;

  @media (max-width: 768px) {
    width: 100px;
    height: 100px;
  }
`;

const MainPage: React.FC = () => {
  const notify = useNotification();
  const { navigateTo } = useNavigation();
  const {
    selectedServer,
    servers,
    logs,
    duration,
    status,
    connect,
    disconnect,
    isActive,
    canToggle,
    refreshServers,
    setServer
  } = useVpn();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [version, setVersion] = useState<string>("0.0.0")

  useEffect(() => {
    window.NativeBridge.getVersion().then((value) => {
      setVersion(value || "0.0.0")
    })


  },[]);

  const handleConnect = async () => {
    if (isActive()) {
      disconnect()
    } else {
      connect()
    }
  };

  const [open, setOpen] = useState(false);
  const showDrawer = () => {
    setOpen(true);
  };

  const onClose = () => {
    setOpen(false);
  };

  const copyLogsToClipboard = () => {
    const logsText = logs
      .map(log => `${log}`)
      .join('\n');
    
    navigator.clipboard.writeText(logsText)
      .then(() => {
        notify.success({message:'Логи скопированы в буфер обмена'});
      })
      .catch(err => {
        notify.error({message:'Не удалось скопировать логи'});
      });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: "transparent", padding: '16px' }}>
        <Image onClick={showDrawer} width={80} src={logo} preview={false} />
      </Header>

      <Drawer
        title="Системные логи"
        placement={"right"}
        width={500}
        onClose={onClose}
        open={open}
        extra={
          <Button type="primary" onClick={copyLogsToClipboard}>
            Скопировать логи
          </Button>
        }
      >
        <pre>
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </pre>
      </Drawer>

      <Content style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {
          selectedServer && (
            <Title level={3} style={{ marginBottom: 20 }}>
              <img
                src={`https://flagcdn.com/24x18/${selectedServer.location}.png`}
                alt={selectedServer.location}
              />
              {`${selectedServer.name}`}
            </Title>
          )
        }
        <div style={{ position: 'relative', marginBottom: 40 }}>
          {status == "Connected" &&
            <ConnectionStatus $connected={true}>
              <Wave $delay={0} />
            </ConnectionStatus>}
          <StyledButton
            type="primary"
            danger={isActive()}
            disabled={!canToggle()}
            onClick={handleConnect}
          >
            <Text>{status}</Text>
          </StyledButton>
        </div>

        <Button
          style={{ marginBottom: 12 }}
          onClick={() => {
            if (isActive())
              return notify.error({
                message: "Сначало остановите VPN!"
              })
            refreshServers()
            setIsModalOpen(true)
          }}
          icon={<GlobalOutlined />}
        >
          Выбрать сервер
        </Button>

        <Modal
          title="Select Server"
          open={isModalOpen}
          onCancel={() => {
            setIsModalOpen(false)
          }}
          footer={null}
        >
          <List>
            {servers.map(server => (
              <Card
                key={server.id}
                hoverable
                style={{ padding: 2, marginBottom: 8, position: 'relative' }}
                onClick={() => {
                  setServer(server);
                  setIsModalOpen(false);
                }}
              >
                <Space>
                  <img
                    src={`https://flagcdn.com/24x18/${server.location}.png`}
                    alt={server.location}
                  />
                  <Text strong>{`${server.name}`}</Text>
                </Space>
                <div>
                  {server.badges.map(tag => ((
                    <Tag color={tag.action} >{tag.text}</Tag>
                  )))}
                </div>
                <div style={{
                  position: 'absolute',
                  right: 16,
                  bottom: 16,
                }}>
                  <Text>&gt;</Text>
                </div>
              </Card>
            ))}
          </List>
        </Modal>
      </Content>

      <Footer style={{ background: 'transparent', textAlign: 'center' }}>
        <Space direction="vertical">
          {status == "Connected" && (
            <Text type="secondary" >
              • {formatTime(duration)} •
            </Text>
          )}
          <Text type="secondary">
            Version {version}
          </Text>
        </Space>
      </Footer>
    </Layout>
  );
};

export default MainPage;