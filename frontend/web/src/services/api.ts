import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse, BiometricMatchResult, LivenessCheckResult, SystemHealth, Patient, User, AuditLog } from '../types';

// Extend Axios config to include metadata
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: { startTime: number };
}

// Enhanced error interface
interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

class ApiService {
  private api: AxiosInstance;
  private requestCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
      (error) => Promise.reject(this.handleError(error))
    );

    // Response interceptor for enhanced error handling and logging
    this.api.interceptors.response.use(
      (response) => {
        // Log successful requests in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
        }
        return response;
      },
      (error) => {
        // Log failed requests
        if (process.env.NODE_ENV === 'development') {
          console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status || 'Network Error'}`);
        }
        
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(this.handleError(error));
      }
    );
  }

  // Enhanced error handling
  private handleError(error: AxiosError): ApiError {
    if (error.response) {
      // Server responded with error status
      const responseData = error.response.data as any;
      return {
        message: responseData?.message || responseData?.error || 'Server error occurred',
        status: error.response.status,
        code: responseData?.code,
        details: responseData
      };
    } else if (error.request) {
      // Request made but no response received
      return {
        message: 'Network error - please check your connection',
        code: 'NETWORK_ERROR'
      };
    } else {
      // Something else happened
      return {
        message: error.message || 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  // Retry mechanism for critical requests
  private async retryRequest<T>(
    requestFn: () => Promise<T>, 
    maxRetries: number = 3, 
    delay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        // Only retry on network errors or 5xx status codes
        const apiError = error as ApiError;
        if (apiError.code === 'NETWORK_ERROR' || (apiError.status && apiError.status >= 500)) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  }

  // Cache management
  private getCachedData(key: string): any | null {
    const cached = this.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    this.requestCache.delete(key);
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.requestCache.set(key, { data, timestamp: Date.now() });
  }

  // Authentication
  async getDemoToken(): Promise<{ access_token: string; user_info: any }> {
    const response = await this.api.get('/demo/token');
    return response.data;
  }

  async register(userData: any): Promise<User> {
    try {
      // Validate required fields
      const requiredFields = ['username', 'email', 'password', 'firstName', 'lastName'];
      const missingFields = requiredFields.filter(field => !userData[field]);
      
      if (missingFields.length > 0) {
        throw {
          message: `Missing required fields: ${missingFields.join(', ')}`,
          code: 'VALIDATION_ERROR'
        } as ApiError;
      }

      const response = await this.retryRequest(
        () => this.api.post('/auth/register', userData)
      );
      return response.data;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    try {
      if (!email || !password) {
        throw {
          message: 'Email and password are required',
          code: 'VALIDATION_ERROR'
        } as ApiError;
      }

      const response = await this.retryRequest(
        () => this.api.post('/auth/login', { email, password })
      );
      
      // Store token automatically
      if (response.data.access_token) {
        localStorage.setItem('auth_token', response.data.access_token);
      }
      
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
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

  // Dashboard Operations
  async getDashboardStats(): Promise<any> {
    try {
      const cacheKey = 'dashboard_stats';
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const response = await this.retryRequest(
        () => this.api.get('/dashboard/stats')
      );
      
      this.setCachedData(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      throw error;
    }
  }

  async getRecentAccesses(): Promise<any[]> {
    try {
      const response = await this.api.get('/system/recent-accesses');
      return response.data;
    } catch (error) {
      console.error('Failed to load recent accesses:', error);
      throw error;
    }
  }



  // Biometric Operations
  async extractBiometricTemplate(
    file: File, 
    patientId?: string
  ): Promise<{
    success: boolean;
    template_data: string;
    quality_score: number;
    confidence: number;
    request_id: string;
  }> {
    try {
      // Validate file
      if (!file) {
        throw {
          message: 'No image file provided',
          code: 'VALIDATION_ERROR'
        } as ApiError;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        throw {
          message: 'File must be an image',
          code: 'INVALID_FILE_TYPE'
        } as ApiError;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw {
          message: 'Image file too large (max 10MB)',
          code: 'FILE_TOO_LARGE'
        } as ApiError;
      }

      const formData = new FormData();
      formData.append('file', file);
      if (patientId) {
        formData.append('patient_id', patientId);
      }

      const response = await this.retryRequest(
        () => this.api.post('/biometric/extract-template', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 45000, // Extended timeout for biometric processing
        }),
        2 // Only retry once for file uploads
      );
      
      return response.data;
    } catch (error) {
      console.error('Biometric template extraction failed:', error);
      throw error;
    }
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
    const response = await this.api.post('/patients/register', patientData);
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