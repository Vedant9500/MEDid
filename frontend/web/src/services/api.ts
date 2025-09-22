import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, BiometricMatchResult, LivenessCheckResult, SystemHealth, Patient, User, AuditLog } from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8001',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Token ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async getDemoToken(): Promise<{ access_token: string; user_info: any }> {
    const response = await this.api.get('/demo/token');
    return response.data;
  }

  async register(userData: any): Promise<User> {
    const response = await this.api.post('/auth/register', userData);
    return response.data;
  }

  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const response = await this.api.post('/auth/login', { email, password });
    return response.data;
  }

  async getProfile(): Promise<User> {
    const response = await this.api.get('/auth/profile');
    return response.data;
  }

  async logout(): Promise<void> {
    await this.api.post('/auth/logout');
    localStorage.removeItem('auth_token');
  }

  // Health & System Status
  async getSystemHealth(): Promise<SystemHealth> {
    const response = await this.api.get('/health');
    return response.data;
  }

  async getSystemMetrics(): Promise<any> {
    const response = await this.api.get('/metrics');
    return response.data;
  }

  async getDemoStats(): Promise<any> {
    const response = await this.api.get('/demo/stats');
    return response.data;
  }

  // Biometric Operations
  async extractBiometricTemplate(
    file: File, 
    patientId?: string
  ): Promise<{
    success: boolean;
    template_data: string;
    quality_metrics: any;
    face_location: number[];
    processing_time_ms: number;
    request_id: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    if (patientId) {
      formData.append('patient_id', patientId);
    }

    const response = await this.api.post('/biometric/extract-template', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async matchBiometric(templateData: string, threshold: number = 0.6): Promise<BiometricMatchResult> {
    const response = await this.api.post('/biometric/scan', {
      face_image_base64: templateData,
      confidence_threshold: threshold,
    });
    return response.data;
  }

  async checkLiveness(file: File): Promise<LivenessCheckResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.api.post('/biometric/liveness-check', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Patient Management
  async getPatient(patientId: string): Promise<Patient> {
    const response = await this.api.get(`/patients/${patientId}`);
    return response.data;
  }

  async searchPatients(query: string): Promise<Patient[]> {
    const response = await this.api.get(`/patients/search?q=${encodeURIComponent(query)}`);
    return response.data;
  }

  async createPatient(patientData: Partial<Patient>): Promise<Patient> {
    const response = await this.api.post('/patients', patientData);
    return response.data;
  }

  async updatePatient(patientId: string, patientData: Partial<Patient>): Promise<Patient> {
    const response = await this.api.put(`/patients/${patientId}`, patientData);
    return response.data;
  }

  // Emergency Access
  async requestEmergencyAccess(
    faceImageBase64: string,
    reason: string,
    location: string,
    accessingDeviceId?: string,
    accessingUser?: string,
    organization?: string,
    confidenceThreshold?: number
  ): Promise<any> {
    const response = await this.api.post('/emergency/access', {
      face_image_base64: faceImageBase64,
      emergency_reason: reason,
      accessing_device_id: accessingDeviceId || 'EMERGENCY_DEVICE_001',
      accessing_user: accessingUser || 'Emergency Medical Staff',
      organization: organization || 'Emergency Department',
      location,
      confidence_threshold: confidenceThreshold || 0.5,
    });
    return response.data;
  }

  async getEmergencyAccessLogs(patientId?: string): Promise<any[]> {
    const url = patientId ? `/emergency/access?patient_id=${patientId}` : '/emergency/access';
    const response = await this.api.get(url);
    return response.data;
  }

  // Audit & Compliance
  async getAuditLogs(filters?: {
    fromDate?: Date;
    toDate?: Date;
    userId?: string;
    patientId?: string;
    actionCategory?: string;
    limit?: number;
  }): Promise<AuditLog[]> {
    const params = new URLSearchParams();
    if (filters?.fromDate) params.append('from_date', filters.fromDate.toISOString());
    if (filters?.toDate) params.append('to_date', filters.toDate.toISOString());
    if (filters?.userId) params.append('actor_id', filters.userId);
    if (filters?.patientId) params.append('patient_id', filters.patientId);
    if (filters?.actionCategory) params.append('action_category', filters.actionCategory);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await this.api.get(`/audit/logs?${params}`);
    return response.data;
  }

  // User Management
  async getUsers(): Promise<User[]> {
    const response = await this.api.get('/users');
    return response.data;
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const response = await this.api.post('/users', userData);
    return response.data;
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    const response = await this.api.put(`/users/${userId}`, userData);
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.api.delete(`/users/${userId}`);
  }

  // File Upload Utilities
  async uploadImage(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Error Handling Utility
  handleApiError(error: any): string {
    if (error.response?.data?.detail) {
      return error.response.data.detail;
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }
}

export const apiService = new ApiService();
export default apiService;