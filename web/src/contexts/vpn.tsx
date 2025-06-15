import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useNotification } from './notification';
import { apiClientInstance, VPNLocation } from '../api/ClientApi';
import { useNavigation } from '../router/routerContext';
import { VpnStatus } from '../types/Vpn';

interface VpnContextType {
    status: VpnStatus;
    duration: number;
    servers: VPNLocation[];
    logs: string[];
    selectedServer: VPNLocation | null;
    connect: () => Promise<void>;
    disconnect: () => void;
    setServer: (server: VPNLocation | null) => void;
    refreshServers: () => Promise<void>;
    canToggle: () => boolean;
    isActive: () => boolean;
}

const VpnContext = createContext<VpnContextType | undefined>(undefined);


export const VpnProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const notify = useNotification();
    const { navigateTo } = useNavigation();
    const apiClient = apiClientInstance;

    const [status, setStatus] = useState<VpnStatus>("Stopped");
    const [duration, setDuration] = useState(0);
    const [servers, setServers] = useState<VPNLocation[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [selectedServer, setSelectedServer] = useState<VPNLocation | null>(null);

    // Helper methods
    const canToggle = useMemo(() => () => {
        return !(status === "Connecting" || status === "Stopping");
    }, [status]);

    const isActive = useMemo(() => () => {
        return status === "Connected";
    }, [status]);

    useEffect(() => {
        window.NativeBridge.send("status");

        const statusListener = (newStatus: VpnStatus, msg?: string) => {
            setStatus(newStatus);
            if (msg) {
                notify.error({
                    message: "Ошибка sing-box",
                    description: msg
                });
            }
        };

        const off = window.NativeBridge.on("status", statusListener);
        const offLogs = window.NativeBridge.on("log", (log)=>{
            setLogs(prevLogs => [...prevLogs, log]);
        });

        return () => {
            off()
            offLogs()
        };
    }, [notify]);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (status === "Connected") {
            interval = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else if (status === "Stopped") {
            setDuration(0);
        }

        return () => clearInterval(interval);
    }, [status]);

    const refreshServers = async () => {
        try {
            const serverList = await apiClient.getLocations();
            setServers(serverList);
            const savedServerId = await window.NativeBridge.get("selectedServer");

            if (savedServerId !== null && savedServerId !== undefined) {
                const serverId = Number(savedServerId);
                const foundServer = serverList.find(server => server.id === serverId);
                if (foundServer) {
                    setSelectedServer(foundServer);
                }
            }
        } catch (ex: any) {
            disconnect();
            notify.error({
                message: "Ошибка",
                description: ex.toString()
            });
            navigateTo("auth");
        }
    };

    const connect = async () => {
        if (!canToggle()) return;
        if (!selectedServer)
            return notify.error({
                message: "Нету сервера!",
            });

        try {
            const { config_id } = await apiClient.generateConfig(selectedServer.id || 0);
            const config = await apiClient.getConfiguration(config_id);
            window.NativeBridge.send("start", JSON.stringify(config));
        } catch (ex: any) {
            disconnect();
            notify.error({
                message: "Ошибка",
                description: ex.toString()
            });
            if (selectedServer) navigateTo("auth");
        }
    };

    const disconnect = () => {
        if (isActive()) {
            setStatus("Stopping");
            window.NativeBridge.send("stop");
        }
    };
    const setServer = (server: VPNLocation | null) => {
        if (server)
            window.NativeBridge.set("selectedServer", server.id)
        setSelectedServer(server)
    }


    return (
        <VpnContext.Provider value={{
            status,
            duration,
            servers,
            logs,
            selectedServer,
            connect,
            disconnect,
            setServer,
            refreshServers,
            canToggle,
            isActive
        }}>
            {children}
        </VpnContext.Provider>
    );
};

export const useVpn = () => {
    const context = useContext(VpnContext);
    if (!context) {
        throw new Error('useVpn must be used within a VpnProvider');
    }
    return context;
};