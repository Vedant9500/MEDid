// Enhanced API service for DeepFace biometric integration
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  User, 
  Patient, 
  BiometricMatchResult, 
  LivenessCheckResult, 
  SystemHealth,
  EmergencyAccess,
  AuditLog
} from '../types';

// DeepFace-specific types
export interface DeepFaceBiometricTemplate {
  success: boolean;
  template_data: string;
  model_used: string;
  face_confidence: number;
  face_location: [number, number, number, number];
  quality_score: number;
  anti_spoofing_passed: boolean;
  processing_time_ms: number;
  request_id: string;
  algorithm_version: string;
}

export interface DeepFaceVerificationResult {
  is_match: boolean;
  confidence: number;
  distance: number;
  threshold_used: number;
  model_used: string;
  processing_time_ms: number;
  request_id: string;
}

export interface DeepFaceTemplateRequest {
  image_quality_check?: boolean;
  anti_spoofing_check?: boolean;
  model_name?: string;
}

export interface DeepFaceVerificationRequest {
  template1: string;
  template2: string;
  model_name?: string;
  threshold?: number;
}

export interface AvailableModels {
  models: string[];
  detectors: string[];
  distance_metrics: string[];
  current_config: {
    model: string;
    detector: string;
    metric: string;
    anti_spoofing: boolean;
  };
}

class APIService {
  private api: AxiosInstance;
  private baseURL: string;
  private biometricURL: string;

  constructor() {
    this.baseURL = (process.env.REACT_APP_API_BASE_URL as string) || 'http://localhost:8001';
    this.biometricURL = (process.env.REACT_APP_BIOMETRIC_API_URL as string) || 'http://localhost:8002';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle 401 responses
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

  // Biometric Service API calls (DeepFace)
  private async callBiometricAPI(endpoint: string, data?: any, options?: any): Promise<AxiosResponse> {
    const token = localStorage.getItem('auth_token');
    
    return axios({
      method: options?.method || 'POST',
      url: `${this.biometricURL}${endpoint}`,
      data,
      headers: {
        'Authorization': `Bearer ${token}`,
        ...options?.headers,
      },
      timeout: 30000,
      ...options
    });
  }

  // Authentication
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const response = await this.api.post('/auth/login', { email, password });
    const { access_token } = response.data;
    localStorage.setItem('auth_token', access_token);
    return response.data;
  }

  async register(userData: {
    email: string;
    password: string;
    full_name: string;
    role: string;
  }): Promise<User> {
    const response = await this.api.post('/auth/register', userData);
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

  // Enhanced Biometric Operations with DeepFace
  async extractBiometricTemplate(
    file: File,
    patientId?: string,
    options?: DeepFaceTemplateRequest
  ): Promise<DeepFaceBiometricTemplate> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (patientId) {
      formData.append('patient_id', patientId);
    }

    // Add configuration options as query parameters
    const params = new URLSearchParams();
    if (options?.image_quality_check !== undefined) {
      params.append('image_quality_check', options.image_quality_check.toString());
    }
    if (options?.anti_spoofing_check !== undefined) {
      params.append('anti_spoofing_check', options.anti_spoofing_check.toString());
    }
    if (options?.model_name) {
      params.append('model_name', options.model_name);
    }

    const queryString = params.toString();
    const endpoint = `/biometric/extract-template${queryString ? `?${queryString}` : ''}`;

    const response = await this.callBiometricAPI(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  async verifyBiometricMatch(
    request: DeepFaceVerificationRequest
  ): Promise<DeepFaceVerificationResult> {
    const response = await this.callBiometricAPI('/biometric/verify', request);
    return response.data;
  }

  async getBiometricServiceHealth(): Promise<{
    status: string;
    service: string;
    version: string;
    model: string;
    detector: string;
    timestamp: string;
    dependencies: Record<string, string>;
    uptime_seconds: number;
  }> {
    const response = await this.callBiometricAPI('/health', null, { method: 'GET' });
    return response.data;
  }

  async getAvailableModels(): Promise<AvailableModels> {
    const response = await this.callBiometricAPI('/models/available', null, { method: 'GET' });
    return response.data;
  }

  // Enhanced Emergency Access with DeepFace
  async requestEmergencyAccess(
    faceImageBase64: string,
    reason: string,
    location: string,
    accessingDeviceId?: string,
    accessingUser?: string,
    organization?: string,
    confidenceThreshold?: number,
    biometricModel?: string
  ): Promise<EmergencyAccess> {
    // First, convert base64 image to File object for DeepFace processing
    const base64Data = faceImageBase64.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const imageFile = new File([byteArray], 'emergency-scan.jpg', { type: 'image/jpeg' });

    // Extract biometric template using DeepFace
    const templateResult = await this.extractBiometricTemplate(imageFile, undefined, {
      anti_spoofing_check: true,
      image_quality_check: true,
      model_name: biometricModel || 'ArcFace'
    });

    if (!templateResult.success || !templateResult.anti_spoofing_passed) {
      throw new Error('Biometric authentication failed - liveness check failed or low quality image');
    }

    // Send emergency access request with enhanced biometric data
    const response = await this.api.post('/emergency/access', {
      face_image_base64: faceImageBase64,
      biometric_template: templateResult.template_data,
      biometric_confidence: templateResult.face_confidence,
      quality_score: templateResult.quality_score,
      emergency_reason: reason,
      accessing_device_id: accessingDeviceId || 'EMERGENCY_DEVICE_001',
      accessing_user: accessingUser || 'Emergency Medical Staff',
      organization: organization || 'Emergency Department',
      location: location,
      confidence_threshold: confidenceThreshold || 0.65,
      biometric_model: biometricModel || 'ArcFace',
      algorithm_version: templateResult.algorithm_version
    });

    return response.data;
  }

  // Legacy biometric method for backward compatibility
  async matchBiometric(templateData: string, threshold: number = 0.65): Promise<BiometricMatchResult> {
    const response = await this.api.post('/biometric/scan', {
      face_image_base64: templateData,
      confidence_threshold: threshold,
    });
    return response.data;
  }

  async checkLiveness(file: File): Promise<LivenessCheckResult> {
    // Use DeepFace template extraction with anti-spoofing
    const templateResult = await this.extractBiometricTemplate(file, undefined, {
      anti_spoofing_check: true,
      image_quality_check: true
    });

    return {
      isLive: templateResult.anti_spoofing_passed,
      confidence: templateResult.face_confidence,
      checksPassed: templateResult.anti_spoofing_passed ? ['face_detection', 'anti_spoofing', 'quality_assessment'] : ['face_detection'],
      checksFailed: templateResult.anti_spoofing_passed ? [] : ['anti_spoofing'],
      processingTimeMs: templateResult.processing_time_ms,
      requestId: templateResult.request_id
    };
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

  // Audit Logs
  async getAuditLogs(
    filters?: {
      patient_id?: string;
      action_type?: string;
      start_date?: string;
      end_date?: string;
      limit?: number;
    }
  ): Promise<AuditLog[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await this.api.get(`/audit-logs?${params.toString()}`);
    return response.data;
  }

  async getEmergencyAccessLogs(patientId?: string): Promise<any[]> {
    const endpoint = patientId 
      ? `/emergency/access-logs?patient_id=${patientId}`
      : '/emergency/access-logs';
    
    const response = await this.api.get(endpoint);
    return response.data;
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

  // Enhanced system status with biometric service
  async getCompleteSystemHealth(): Promise<{
    backend: SystemHealth;
    biometric: any;
    integration_status: 'healthy' | 'degraded' | 'error';
  }> {
    try {
      const [backendHealth, biometricHealth] = await Promise.all([
        this.getSystemHealth(),
        this.getBiometricServiceHealth()
      ]);

      const integration_status = 
        backendHealth.status === 'healthy' && biometricHealth.status === 'healthy' 
          ? 'healthy' 
          : 'degraded';

      return {
        backend: backendHealth,
        biometric: biometricHealth,
        integration_status
      };
    } catch (error) {
      const errorHealth: SystemHealth = {
        status: 'unhealthy',
        service: 'unknown',
        version: '0.0.0',
        timestamp: new Date(),
        dependencies: {},
        uptimeSeconds: 0
      };
      
      return {
        backend: errorHealth,
        biometric: errorHealth,
        integration_status: 'error'
      };
    }
  }
}

export const apiService = new APIService();
export default apiService;