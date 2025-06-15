import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';

import { NativeBridge } from './NativeBridge';
import MainPage from './pages/MainPage';
import { App, ConfigProvider, notification, theme } from 'antd';
import { RouterProvider } from './router/routerContext';
import { PageRouter } from './router/pageRouter';
import AuthPage from './pages/AuthPage';
import { NotificationProvider, useNotification } from './contexts/notification';
import { VpnProvider } from './contexts/vpn';

const bridge = NativeBridge.getInstance()
bridge.ping();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

const pages = {
  main: MainPage,
  auth: AuthPage,
};

export type NotificationType = 'success' | 'info' | 'warning' | 'error';

const Main: React.FC = () => {
  const api = useNotification();

  React.useEffect(() => {
    const off = window.NativeBridge.on("notification", (type: NotificationType, message: string, description: string) => {
      api[type]({
        message,
        description,
      });
    })
    return () => { off() }
  }, [api])

  return (
    <App>
      <PageRouter pages={pages} defaultPageId="auth" />
    </App>
  )
}


root.render(
  <React.StrictMode>
    <RouterProvider>
      <ConfigProvider theme={{
        token: {
          colorBgBase: '#141414',
          colorTextBase: '#ffffff',
          colorPrimary: '#ffb600',
        },
        algorithm: theme.darkAlgorithm,
      }}>
        <NotificationProvider>
          <VpnProvider>
            <Main />
          </VpnProvider>
        </NotificationProvider>
      </ConfigProvider>
    </RouterProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
