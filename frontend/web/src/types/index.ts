// TypeScript definitions for MedID application

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'doctor' | 'nurse' | 'admin' | 'patient';
  hospital?: string;
  permissions: string[];
  lastLogin?: Date;
  avatar?: string;
}

export interface Patient {
  id: string;
  name: string;
  dateOfBirth: string;
  gender: 'M' | 'F' | 'O' | 'U';
  bloodGroup: string;
  emergencyContact: string;
  medicalHistory: MedicalRecord[];
  allergies: string[];
  medications: Medication[];
  biometricEnrolled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicalRecord {
  id: string;
  type: 'diagnosis' | 'procedure' | 'allergy' | 'medication' | 'vital_signs';
  description: string;
  date: Date;
  doctor: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'chronic';
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  prescribedBy: string;
  notes?: string;
}

export interface BiometricTemplate {
  id: string;
  patientId: string;
  templateData: string; // Base64 encrypted
  qualityScore: number;
  algorithmVersion: string;
  createdAt: Date;
}

export interface BiometricMatchResult {
  patientId?: string;
  confidence: number;
  matchFound: boolean;
  processingTimeMs: number;
  algorithmVersion: string;
  requestId: string;
}

export interface LivenessCheckResult {
  isLive: boolean;
  confidence: number;
  checksPassed: string[];
  checksFailed: string[];
  processingTimeMs: number;
  requestId: string;
}

export interface EmergencyAccess {
  id: string;
  patientId: string;
  accessedBy: string;
  accessReason: string;
  location: string;
  emergencyType: 'cardiac_arrest' | 'trauma' | 'unconscious' | 'allergic_reaction' | 'other';
  timestamp: Date;
  duration: number; // in minutes
}

export interface AuditLog {
  id: string;
  operationType: string;
  operationResult: 'success' | 'failure';
  userId: string;
  patientId?: string;
  confidenceScore?: number;
  processingTimeMs?: number;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  details: Record<string, any>;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  timestamp: Date;
  dependencies: Record<string, string>;
  uptimeSeconds: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  requestId?: string;
  timestamp: Date;
}

export interface BiometricScanState {
  isScanning: boolean;
  hasCamera: boolean;
  cameraError?: string;
  lastScanResult?: BiometricMatchResult;
  processingTime?: number;
  qualityFeedback?: string;
}

export interface EmergencyDashboardState {
  currentPatient?: Patient;
  isSearching: boolean;
  searchResults: BiometricMatchResult[];
  recentAccesses: EmergencyAccess[];
  systemStatus: SystemHealth;
}

export interface AdminDashboardState {
  totalPatients: number;
  totalTemplates: number;
  recentAccessLogs: AuditLog[];
  systemMetrics: SystemMetrics;
  userManagement: UserManagementState;
}

export interface SystemMetrics {
  avgResponseTime: number;
  successRate: number;
  totalRequests: number;
  activeUsers: number;
  storageUsed: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface UserManagementState {
  users: User[];
  roles: string[];
  permissions: string[];
  isLoading: boolean;
}

export interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

export interface FormErrors {
  [key: string]: string | undefined;
}

export interface WebcamConfig {
  width: number;
  height: number;
  facingMode: 'user' | 'environment';
  audio: boolean;
  video: boolean;
}