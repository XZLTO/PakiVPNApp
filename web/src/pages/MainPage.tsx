import React, { useState, useEffect } from 'react';
import { Button, Card, Tag, Modal, ConfigProvider, Layout, Typography, Space, Image, List, notification } from 'antd';
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

  const apiClient = ApiClient.getInstance(Domain)
  const [selectedServer, setSelectedServer] = useState<VPNLocation | null>(null);
  const [servers, setServers] = useState<VPNLocation[]>([])

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState<VpnStatus>("Stopped");

  const [version, setVersion] = useState<string>("0.0.0")

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status == "Connected") {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    window.NativeBridge.send("status");
    const off = window.NativeBridge.on("status", (status, msg) => {
      setStatus(status)
      if (msg) notify.error({
        message: "Ошибка sing-box",
        description: msg
      })
    })

    window.NativeBridge.getVersion().then((value) => {
      setVersion(value || "0.0.0")
    })

    updateList()
    return off;
  }, [setStatus]);

  const updateList = async () => {
    try {
      setServers(await apiClient.getLocations())
      const id = await window.NativeBridge.get("selectedServer") as number;
      if (id && servers[id]) {
        setSelectedServer(servers[id])
      }
    }
    catch (ex: any) {
      notify.error({
        message: "Ошибка",
        description: ex.toString()
      })
      navigateTo("auth")
    }
  }

  const handleConnect = async () => {
    if (status === "Idle" || status === "Stopped") {
      try {
        const { config_id } = await apiClient.generateConfig(selectedServer ? selectedServer.id : 0);
        const config = await apiClient.getConfiguration(config_id);
        setDuration(0)
        window.NativeBridge.send("start", JSON.stringify(config));
      } catch (ex: any) {
        notify.error({
          message: "Ошибка",
          description: ex.toString()
        });
        if (selectedServer != null) navigateTo("auth");
      }
    } else if (status === "Connected") {
      window.NativeBridge.send("stop");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: "transparent", padding: '16px' }}>
        <Image width={80} src={logo} preview={false} />
      </Header>

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
            danger={status == "Connected"}
            disabled={status == "Connecting" || status == "Stopping"}
            onClick={handleConnect}
          >
            <Text>{status}</Text>
          </StyledButton>
        </div>

        <Button
          style={{ marginBottom: 12 }}
          onClick={async () => {
            if (status == "Connected" || status == "Connecting")
              return notify.error({
                message: "Сначало остановите VPN!"
              })
            await updateList()
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
                  window.NativeBridge.set("selectedServer", server.id)
                  setSelectedServer(server);
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