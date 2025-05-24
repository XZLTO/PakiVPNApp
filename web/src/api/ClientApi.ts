export type LocationBadge = {
    text: string;
    action: 'error' | 'warning' | 'success' | 'info' | 'muted';
    iconName: string | null;
};

export type VPNLocation = {
    id: number;
    name:string;
    location: string;
    badges: LocationBadge[];
};

export type MyInfo = {
    chat_id:string|null;
    is_anmin:boolean;
    is_ban:boolean;
}

class ApiClient {
    private static instance: ApiClient;
    private baseUrl: string;
    private token: string | null = null;

    private constructor(baseUrl: string = '') {
        this.baseUrl = baseUrl;
    }

    public static getInstance(baseUrl?: string): ApiClient {
        if (!ApiClient.instance) {
            if (!baseUrl) {
                throw new Error('Base URL is required for the first initialization');
            }
            ApiClient.instance = new ApiClient(baseUrl);
        }
        return ApiClient.instance;
    }

    public initialize(baseUrl: string): void {
        if (this.baseUrl && this.baseUrl !== baseUrl) {
            console.warn('ApiClient is already initialized with a different base URL');
        }
        this.baseUrl = baseUrl;
    }

    public setToken(token: string): void {
        this.token = token;
    }

    public clearToken(): void {
        this.token = null;
    }

    public hasToken(): boolean {
        return this.token !== null;
    }

    public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        if (!this.baseUrl) {
            throw new Error('ApiClient not initialized - base URL is missing');
        }

        const url = `${this.baseUrl}${endpoint}`;
        
        const headers = new Headers(options.headers || {});
        if (this.token) {
            headers.append('Authorization', `Bearer ${this.token}`);
        }
        headers.append('Content-Type', 'application/json');

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(endpoint+":"+errorData.error || `HTTP error! status: ${response.status}`);
        }

        return response.json() as Promise<T>;
    }
    

    public async getLocations(): Promise<VPNLocation[]> {
        return this.request<VPNLocation[]>('/user/locations');
    }

    public async getMyInfo(){
        return this.request<MyInfo>('/user/me')
    }

    public async validateToken(): Promise<boolean> {
        try{
            const info = await this.getMyInfo()
            return !info.is_ban 
        } catch(ex)
        {
            console.log(ex);
            return false;
        }
    }

    public async generateConfig(serverId: number): Promise<{ config_id: string }> {
        return this.request<{ config_id: string }>(`/user/config/generate/${serverId}`, {
            method: 'POST'
        });
    }

    public async getConfiguration(configId: string): Promise<Record<string, any>> {
        return this.request<Record<string, any>>(`/configuration/${configId}`);
    }
}

export default ApiClient;

const apiClientInstance = ApiClient.getInstance('https://api.paki-vpn.com');

export { ApiClient,apiClientInstance };