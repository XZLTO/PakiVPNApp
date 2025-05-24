import React from 'react';
import { NotificationInstance } from 'antd/es/notification/interface';
import { notification } from 'antd';

const NotificationContext = React.createContext<NotificationInstance | null>(null);

export const useNotification = () => {
  const api = React.useContext(NotificationContext);
  if (!api) throw new Error('NotificationContext not found!');
  return api;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [api, contextHolder] = notification.useNotification();
  
  return (
    <NotificationContext.Provider value={api}>
      {contextHolder}
      {children}
    </NotificationContext.Provider>
  );
};