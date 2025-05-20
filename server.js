const express = require('express');
const mongoose = require('mongoose');
const winston = require('winston');
const promClient = require('prom-client');

// Initialize Prometheus metrics collection
const collectDefaultMetrics = promClient.collectDefaultMetrics;
const Registry = promClient.Registry;
const register = new Registry();
collectDefaultMetrics({ register });

// Create custom metrics for Google Cloud Monitoring integration
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'code', 'status']
});

// Additional metrics for system monitoring
const memoryUsageGauge = new promClient.Gauge({
  name: 'nodejs_memory_usage_bytes',
  help: 'Memory usage of the Node.js process',
  labelNames: ['type']
});

const cpuUsageCounter = new promClient.Counter({
  name: 'nodejs_cpu_usage_seconds_total',
  help: 'Total CPU usage of the Node.js process in seconds',
});

const activeConnectionsGauge = new promClient.Gauge({
  name: 'nodejs_active_connections',
  help: 'Number of active connections',
});

const mongoDbOperationsCounter = new promClient.Counter({
  name: 'mongodb_operations_total',
  help: 'Total MongoDB operations',
  labelNames: ['operation', 'status']
});

// Register all metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestCounter);
register.registerMetric(memoryUsageGauge);
register.registerMetric(cpuUsageCounter);
register.registerMetric(activeConnectionsGauge);
register.registerMetric(mongoDbOperationsCounter);

// Configure Winston logger for Google Cloud Logging integration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'cloud-native-app',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.VERSION || '1.0.0'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          // Format for Google Cloud Logging
          return JSON.stringify({
            severity: level.toUpperCase(),
            time: timestamp,
            message,
            ...meta
          });
        })
      )
    })
  ]
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to track request duration and count with enhanced metrics for Google Cloud Monitoring
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path === '/' ? 'root' : req.path;
  
  // Update active connections gauge
  activeConnectionsGauge.inc();
  
  // Update memory usage metrics every request
  const memoryUsage = process.memoryUsage();
  memoryUsageGauge.labels('rss').set(memoryUsage.rss);
  memoryUsageGauge.labels('heapTotal').set(memoryUsage.heapTotal);
  memoryUsageGauge.labels('heapUsed').set(memoryUsage.heapUsed);
  memoryUsageGauge.labels('external').set(memoryUsage.external);
  
  // Track CPU usage
  const startCpuUsage = process.cpuUsage();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode < 400 ? 'success' : 'error';
    
    // Record HTTP metrics
    httpRequestDurationMicroseconds
      .labels(req.method, path, res.statusCode, status)
      .observe(duration / 1000);
    
    httpRequestCounter
      .labels(req.method, path, res.statusCode, status)
      .inc();
    
    // Record CPU usage for this request
    const cpuUsage = process.cpuUsage(startCpuUsage);
    const totalCpuUsageInSeconds = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    cpuUsageCounter.inc(totalCpuUsageInSeconds);
    
    // Decrement active connections
    activeConnectionsGauge.dec();
    
    // Enhanced logging for Google Cloud Logging
    logger.info({
      message: `${req.method} ${req.path}`,
      httpRequest: {
        requestMethod: req.method,
        requestUrl: req.path,
        requestSize: req.headers['content-length'] || 0,
        status: res.statusCode,
        responseSize: res.getHeader('content-length') || 0,
        userAgent: req.headers['user-agent'],
        remoteIp: req.ip || req.connection.remoteAddress,
        latency: `${duration}ms`
      },
      metadata: {
        service: 'cloud-native-app',
        trace: req.headers['x-cloud-trace-context'] || '',
      }
    });
  });
  
  next();
});

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/cloudapp';
mongoose.connect(MONGO_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
  })
  .catch(err => {
    logger.error('Failed to connect to MongoDB', { error: err.message });
  });

// Define a simple schema
const TaskSchema = new mongoose.Schema({
  title: String,
  completed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Task = mongoose.model('Task', TaskSchema);

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Cloud Native Monitoring App' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// API endpoints with MongoDB operation tracking for monitoring
app.get('/api/tasks', async (req, res) => {
  const startTime = Date.now();
  try {
    // Track MongoDB operation
    mongoDbOperationsCounter.labels('find', 'pending').inc();
    
    const tasks = await Task.find();
    
    // Record successful operation
    mongoDbOperationsCounter.labels('find', 'success').inc();
    
    // Log the operation with timing information
    logger.info({
      message: 'MongoDB find operation completed',
      operation: 'find',
      collection: 'tasks',
      count: tasks.length,
      duration: `${Date.now() - startTime}ms`
    });
    
    res.json(tasks);
  } catch (err) {
    // Record failed operation
    mongoDbOperationsCounter.labels('find', 'error').inc();
    
    logger.error({
      message: 'Error fetching tasks',
      operation: 'find',
      collection: 'tasks',
      error: err.message,
      stack: err.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.post('/api/tasks', express.json(), async (req, res) => {
  const startTime = Date.now();
  try {
    // Track MongoDB operation
    mongoDbOperationsCounter.labels('insert', 'pending').inc();
    
    const task = new Task(req.body);
    await task.save();
    
    // Record successful operation
    mongoDbOperationsCounter.labels('insert', 'success').inc();
    
    // Log the operation with timing information
    logger.info({
      message: 'MongoDB insert operation completed',
      operation: 'insert',
      collection: 'tasks',
      documentId: task._id.toString(),
      duration: `${Date.now() - startTime}ms`
    });
    
    res.status(201).json(task);
  } catch (err) {
    // Record failed operation
    mongoDbOperationsCounter.labels('insert', 'error').inc();
    
    logger.error({
      message: 'Error creating task',
      operation: 'insert',
      collection: 'tasks',
      data: req.body,
      error: err.message,
      stack: err.stack,
      duration: `${Date.now() - startTime}ms`
    });
    
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Start the server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Shutting down gracefully.');
  mongoose.connection.close();
  process.exit(0);
});
