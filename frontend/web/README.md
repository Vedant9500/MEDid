# MedID Frontend - Modern React Web Application

A comprehensive, production-ready React TypeScript application for the MedID Biometric Health Passport System. Features real-time emergency access, patient registration, admin dashboard, and secure biometric processing.

## 🚀 Features

### 🏥 Emergency Dashboard
- **Real-time biometric scanning** with live webcam feed
- **Instant patient identification** with confidence scoring
- **Break-glass emergency access** with audit logging
- **Critical medical alerts** display
- **Quality-guided image capture** with feedback
- **Live system health monitoring**

### 👤 Patient Registration Portal
- **Multi-step enrollment wizard** with validation
- **Webcam-based biometric capture** with quality assessment
- **Medical history management** with severity tracking
- **Medication tracking** with dosage information
- **Allergy management** with visual indicators
- **Consent management** with legal compliance

### 🔧 Admin Management Interface
- **User role management** with permissions
- **System metrics dashboard** with real-time data
- **Audit log viewing** with filtering
- **Template management** for biometric data
- **Security settings** configuration
- **Performance monitoring** with alerts

### 📱 Responsive Design Features
- **Mobile-first design** with touch-friendly interfaces
- **WCAG 2.1 AA compliance** for accessibility
- **Dark/light theme support** with system preference detection
- **Multi-language support** with i18n
- **Progressive Web App** capabilities
- **Offline functionality** for emergency scenarios

## 🛠️ Technology Stack

### Core Framework
- **React 18** with TypeScript for type safety
- **Material-UI 5** for consistent design system
- **React Router 6** for navigation
- **React Hook Form** with Yup validation
- **Framer Motion** for smooth animations

### State Management & API
- **React Query** for server state management
- **Axios** for API communication with interceptors
- **WebSocket** support for real-time features
- **Local Storage** for offline capabilities

### Biometric & Media
- **React Webcam** for camera integration
- **Canvas API** for image processing
- **WebRTC** for real-time video streams
- **File API** for image upload handling

### Development Tools
- **ESLint** with TypeScript rules
- **Prettier** for code formatting
- **Jest & React Testing Library** for testing
- **Storybook** for component documentation

## 📁 Project Structure

```
frontend/web/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── Emergency/        # Emergency dashboard components
│   │   ├── Patient/          # Patient management components
│   │   ├── Admin/            # Admin interface components
│   │   ├── Auth/             # Authentication components
│   │   └── Layout/           # Layout and navigation
│   ├── pages/                # Page-level components
│   │   ├── Emergency/        # Emergency dashboard pages
│   │   ├── Patient/          # Patient registration pages
│   │   ├── Admin/            # Admin management pages
│   │   └── Auth/             # Login and authentication
│   ├── services/             # API and external services
│   │   ├── api.ts            # Main API service with interceptors
│   │   ├── websocket.ts      # WebSocket service for real-time
│   │   └── storage.ts        # Local storage utilities
│   ├── hooks/                # Custom React hooks
│   │   ├── useAuth.tsx       # Authentication hook
│   │   ├── useBiometric.ts   # Biometric processing hook
│   │   └── useWebSocket.ts   # WebSocket connection hook
│   ├── types/                # TypeScript type definitions
│   │   └── index.ts          # All interfaces and types
│   ├── utils/                # Utility functions
│   │   ├── validation.ts     # Form validation schemas
│   │   ├── formatting.ts     # Data formatting utilities
│   │   └── constants.ts      # Application constants
│   └── themes/               # Material-UI theme configuration
└── public/                   # Static assets
```

## 🚀 Getting Started

### Prerequisites

- **Node.js 16+** (recommended: 18.x LTS)
- **npm 8+** or **yarn 1.22+**
- **Modern browser** with webcam support
- **MedID Biometric Service** running on localhost:8001

### Installation

1. **Navigate to frontend directory:**
   ```bash
   cd frontend/web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Configuration:**
   Create `.env` file in `frontend/web/`:
   ```env
   REACT_APP_API_URL=http://localhost:8001
   REACT_APP_WEBSOCKET_URL=ws://localhost:8001/ws
   REACT_APP_VERSION=1.0.0
   REACT_APP_ENV=development
   ```

4. **Start development server:**
   ```bash
   npm start
   # or
   yarn start
   ```

5. **Open application:**
   Navigate to `http://localhost:3000`

### Development Scripts

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type checking
npm run type-check
```

## 🔧 Configuration

### API Integration

The frontend connects to the MedID Biometric Service API. Ensure the service is running:

```bash
# Start biometric service
cd biometric-service
python main_demo.py
```

### Camera Permissions

For biometric scanning, users need to grant camera permissions:
- **Chrome**: Allow camera access when prompted
- **Firefox**: Grant permission in browser settings
- **Safari**: Enable camera in Privacy & Security settings

### WebSocket Configuration

Real-time features require WebSocket connection:
```typescript
// services/websocket.ts
const WS_URL = process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:8001/ws';
```

## 🎨 Theming & Customization

### Material-UI Theme

Located in `src/themes/`, the theme includes:
- **Color palette** with medical-appropriate colors
- **Typography** with accessibility-focused sizing
- **Component overrides** for consistent styling
- **Responsive breakpoints** for mobile-first design

### Custom Colors

```typescript
const theme = {
  primary: '#667eea',    // Medical blue
  secondary: '#764ba2',  // Professional purple
  error: '#f44336',      // Emergency red
  warning: '#ff9800',    // Caution orange
  success: '#4caf50',    // Health green
  info: '#2196f3',       // Information blue
}
```

## 🔒 Security Features

### Authentication
- **JWT token management** with automatic refresh
- **Role-based access control** (RBAC)
- **Session timeout** with warning notifications
- **Secure token storage** with encryption

### Biometric Security
- **End-to-end encryption** for biometric data
- **Template validation** with quality scoring
- **Liveness detection** to prevent spoofing
- **Audit logging** for all biometric operations

### HIPAA Compliance
- **Data encryption** at rest and in transit
- **Access logging** for audit trails
- **User consent** management
- **Privacy controls** with data retention policies

## 📱 Mobile Responsiveness

### Breakpoints
- **Mobile**: 0-640px (primary target)
- **Tablet**: 641-1024px
- **Desktop**: 1025px+ (enhanced features)

### Touch Optimization
- **Large touch targets** (44px minimum)
- **Gesture support** for common actions
- **Haptic feedback** where available
- **Voice input** for accessibility

## ♿ Accessibility Features

### WCAG 2.1 AA Compliance
- **Keyboard navigation** support
- **Screen reader** compatibility
- **High contrast** mode support
- **Focus management** for modals
- **ARIA labels** throughout interface

### Internationalization (i18n)
- **Multi-language** support ready
- **RTL layout** support
- **Date/time localization**
- **Number formatting** by locale

## 🧪 Testing Strategy

### Unit Tests
```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage
```

### Integration Tests
```bash
# Test API integration
npm run test:integration

# Test user workflows
npm run test:e2e
```

### Accessibility Tests
```bash
# Run accessibility audits
npm run test:a11y
```

## 🚀 Deployment

### Production Build
```bash
# Create optimized build
npm run build

# Serve locally for testing
npx serve -s build
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY build ./build
EXPOSE 3000
CMD ["npx", "serve", "-s", "build", "-l", "3000"]
```

### Environment Variables
```env
REACT_APP_API_URL=https://api.medid.example.com
REACT_APP_WEBSOCKET_URL=wss://api.medid.example.com/ws
REACT_APP_ENV=production
REACT_APP_SENTRY_DSN=your_sentry_dsn_here
```

## 📊 Performance Optimization

### Code Splitting
- **Lazy loading** for page components
- **Dynamic imports** for heavy libraries
- **Route-based splitting** for optimal loading

### Caching Strategy
- **Service Worker** for offline functionality
- **API response caching** with React Query
- **Asset caching** with long-term headers

### Bundle Analysis
```bash
# Analyze bundle size
npm run analyze

# Check performance metrics
npm run lighthouse
```

## 🐛 Troubleshooting

### Common Issues

**Camera not working:**
- Check browser permissions
- Ensure HTTPS in production
- Verify camera hardware connection

**API connection failed:**
- Verify biometric service is running
- Check CORS configuration
- Confirm network connectivity

**WebSocket disconnection:**
- Check firewall settings
- Verify proxy configuration
- Monitor connection stability

### Debug Mode
```bash
# Start with debug logging
REACT_APP_DEBUG=true npm start
```

## 🤝 Contributing

### Development Workflow
1. **Fork repository** and create feature branch
2. **Follow coding standards** with ESLint/Prettier
3. **Write tests** for new functionality
4. **Update documentation** as needed
5. **Submit pull request** with detailed description

### Code Standards
- **TypeScript strict mode** enabled
- **Functional components** with hooks
- **Custom hooks** for reusable logic
- **Error boundaries** for fault tolerance

## 📄 License

This project is part of the MedID Biometric Health Passport System and is intended for healthcare applications with appropriate security and compliance requirements.

---

## 🔗 Related Documentation

- [MedID API Documentation](../docs/api/)
- [Biometric Service Guide](../biometric-service/README.md)
- [Deployment Guide](../docs/deployment/)
- [Security Architecture](../docs/security/)