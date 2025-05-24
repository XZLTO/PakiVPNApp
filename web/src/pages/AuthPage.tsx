import React from 'react';
import { CloseCircleOutlined } from '@ant-design/icons';
import { Button, Layout, Result, Typography, Spin } from 'antd';
import { useNavigation } from '../router/routerContext';
import { apiClientInstance } from '../api/ClientApi';
import { Content } from 'antd/es/layout/layout';
import { useNotification } from '../contexts/notification';

const { Paragraph, Text } = Typography;

const AuthPage: React.FC = () => {
    const notify = useNotification()

    const { navigateTo } = useNavigation();
    const [isCheckingToken, setIsCheckingToken] = React.useState(true);
    const [tokenReceived, setTokenReceived] = React.useState(false);
    const [token, setToken] = React.useState("")

    React.useEffect(() => {
        window.NativeBridge.send("stop")

        const checkTokenValidity = async () => {
            const token = await window.NativeBridge.get("token");
            setToken(token)
            if (token == null) {
                console.error('Token validation error:', "token is null");
                setIsCheckingToken(false);
                return;
            }

            apiClientInstance.setToken(token)

            try {
                const isValid = await apiClientInstance.validateToken();
                if (isValid) {
                    navigateTo("main");
                } else {
                    setIsCheckingToken(false);
                }
            } catch (error: any) {
                console.error('Token validation error:', error);
                notify.error({
                    message: "Проверка токена провалена",
                    description: error.toString()
                })
                setIsCheckingToken(false);
            }
        };

        checkTokenValidity();

        const off = window.NativeBridge.on("deeplink", async (url) => {
            notify.info({
                message: url
            })
            const token = await extractTokenFromUrl(url);
            if (token) {
                window.NativeBridge.set("token", token)
                apiClientInstance.setToken(token);
                setTokenReceived(true);
                setIsCheckingToken(true);
                checkTokenValidity();
            }
        });

        return () => {
            off();
        };
    }, [navigateTo, notify]);

    const extractTokenFromUrl = async (url: string): Promise<string | null> => {
        try {
            let id: string | null = null;

            // "paki://auth/{id}"
            const pakiProtocolMatch = url.match(/^paki:\/\/auth\/([a-f0-9-]+)/i);
            if (pakiProtocolMatch) {
                id = pakiProtocolMatch[1];
            }
            // "https://api.paki-vpn.com/app/auth/{id}"
            else {
                const httpsMatch = url.match(/^https:\/\/api\.paki-vpn\.com\/app\/auth\/([a-f0-9-]+)/i);
                if (httpsMatch) {
                    id = httpsMatch[1];
                }
            }

            if (!id) {
                notify.warning({ message: "не найден индификатор в ссылке протокола" })
                return null;
            }

            const response = await fetch(`https://api.paki-vpn.com/app/token/${id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            return data.token || null;

        } catch (error) {
            notify.error({ message: 'Error extracting token from URL:' + error });
            return null;
        }
    };

    if (isCheckingToken) {
        return (
            <Layout style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Spin size="large" />
                <Text>{tokenReceived ? "Проверка нового токена..." : "Проверка токена..."}</Text>
            </Layout>
        );
    }

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Result
                status="error"
                title={"Требуется аутентификация"}
                subTitle="Пожалуйста, авторизуйтесь в телегараме для доступа к приложению."
                extra={[
                    <Button type="primary" key="retry" onClick={() => window.location.reload()}>
                        Повторить
                    </Button>,
                    <Button type="default" key="redirect" onClick={() => window.NativeBridge.send("open", "https://t.me/PakiVPN_Bot")}>
                        Перейти в телеграм
                    </Button>,
                ]}
            >
                <div className="desc">
                    <Paragraph>
                        <Text strong style={{ fontSize: 16 }}>
                            Проверка токена не выполнена. Возможные причины:
                        </Text>
                    </Paragraph>
                    <Paragraph>
                        <CloseCircleOutlined className="site-result-demo-error-icon" /> Токен не найден или недействителен
                    </Paragraph>
                    <Paragraph>
                        <CloseCircleOutlined className="site-result-demo-error-icon" /> Сервис временно недоступен
                    </Paragraph>
                    <Paragraph>
                        <Text>
                            Если ошибка повторяется, обратитесь в техническую поддержку
                        </Text>
                    </Paragraph>
                </div>
            </Result>
        </Layout>
    );
};

export default AuthPage;