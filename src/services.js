// ─── AWS Service Config ───────────────────────────────────────────────────────

export const SERVICES = {
  apigw:        { label: 'API Gateway',       sub: 'External Trigger',   icon: '/icons/apigateway.png',    color: '#a855f7' },
  lambda:       { label: 'Lambda',            sub: 'Trigger Handler',    icon: '/icons/lambda.png',        color: '#f97316' },
  kms:          { label: 'KMS',               sub: 'Token Encryption',   icon: '/icons/kms.png',           color: '#ef4444' },
  dynamo:       { label: 'DynamoDB',          sub: 'Token Store',        icon: '/icons/dynamodb.png',      color: '#dc2626' },
  sfn:          { label: 'Step Functions',    sub: 'Multi-Action Flow',  icon: '/icons/stepfunctions.png', color: '#ec4899' },
  cloudwatch:   { label: 'CloudWatch',        sub: 'Monitoring',         icon: '/icons/cloudwatch.png',    color: '#ec4899' },
  cloudtrail:   { label: 'CloudTrail',        sub: 'Audit Logs',         icon: '/icons/cloudtrail.png',    color: '#ec4899' },
  user:         { label: 'User',              sub: 'Client',             color: '#3b82f6', emoji: '👤' },
  client:       { label: 'Client',            sub: 'Browser / App',      color: '#3b82f6', emoji: '💻' },
  oauth:        { label: 'OAuth Provider',    sub: 'Auth Service',       color: '#22c55e', emoji: '🔐' },
  auth:         { label: 'Auth Service',      sub: 'Authentication',     color: '#22c55e', emoji: '🔑' },
  cdn:          { label: 'CDN',               sub: 'Open Connect',        icon: '/icons/cloudfront.png',  color: '#8C4FFF' },
  cloudfront:   { label: 'CloudFront',        sub: 'CDN',                 icon: '/icons/cloudfront.png',  color: '#8C4FFF' },
  loadbalancer: { label: 'Load Balancer',     sub: 'Traffic Distribution',icon: '/icons/elb.png',         color: '#8C4FFF' },
  elb:          { label: 'Elastic LB',        sub: 'Load Balancer',       icon: '/icons/elb.png',         color: '#8C4FFF' },
  nginx:        { label: 'Nginx',             sub: 'Reverse Proxy',       icon: '/icons/nginx.svg',       color: '#22c55e' },
  zuul:         { label: 'Zuul Proxy',        sub: 'API Proxy',           color: '#a855f7', emoji: '🔀' },
  gateway:      { label: 'API Gateway',       sub: 'Entry Point',         icon: '/icons/apigateway.png',  color: '#a855f7' },
  eureka:       { label: 'Eureka',            sub: 'Service Discovery',   color: '#f59e0b', emoji: '🔍' },
  consul:       { label: 'Consul',            sub: 'Service Discovery',   color: '#f59e0b', emoji: '🗺️' },
  ec2:          { label: 'EC2',               sub: 'Virtual Servers',     icon: '/icons/ec2.png',         color: '#f97316' },
  microservices:{ label: 'Microservices',     sub: 'Business Logic',      color: '#6366f1', emoji: '⚙️' },
  service:      { label: 'Service',           sub: 'Microservice',        color: '#6366f1', emoji: '⚙️' },
  encoder:      { label: 'Encoding Pipeline', sub: 'Media Processing',    color: '#f97316', emoji: '🎬' },
  cassandra:    { label: 'Cassandra',         sub: 'NoSQL DB',            icon: '/icons/keyspaces.png',   color: '#1d4ed8' },
  keyspaces:    { label: 'Keyspaces',         sub: 'Cassandra-compat',    icon: '/icons/keyspaces.png',   color: '#1d4ed8' },
  postgres:     { label: 'PostgreSQL',        sub: 'Relational DB',       icon: '/icons/rds.png',         color: '#1d4ed8' },
  mysql:        { label: 'MySQL',             sub: 'Relational DB',       icon: '/icons/rds.png',         color: '#1d4ed8' },
  rds:          { label: 'RDS',               sub: 'Relational DB',       icon: '/icons/rds.png',         color: '#1d4ed8' },
  mongodb:      { label: 'MongoDB',           sub: 'Document DB',         icon: '/icons/mongodb.svg',  color: '#22c55e' },
  redis:        { label: 'Redis',             sub: 'Cache / Session',     icon: '/icons/redis-si.svg',    color: '#ef4444' },
  memcached:    { label: 'Memcached',         sub: 'EVCache',             icon: '/icons/elasticache.png', color: '#ef4444' },
  elasticache:  { label: 'ElastiCache',       sub: 'Cache Layer',         icon: '/icons/elasticache.png', color: '#ef4444' },
  s3:           { label: 'S3',               sub: 'Object Storage',       icon: '/icons/aws-s3.svg',      color: '#16a34a' },
  storage:      { label: 'Storage',          sub: 'Object Store',         color: '#16a34a', emoji: '💾' },
  kafka:        { label: 'Kafka',            sub: 'Event Streaming',      icon: '/icons/kafka.png',       color: '#1d4ed8' },
  msk:          { label: 'MSK',             sub: 'Managed Kafka',         icon: '/icons/kafka.png',       color: '#1d4ed8' },
  sqs:          { label: 'SQS',             sub: 'Message Queue',         icon: '/icons/sqs.png',         color: '#f59e0b' },
  sns:          { label: 'SNS',             sub: 'Notifications',         icon: '/icons/sns.png',         color: '#f59e0b' },
  eventbridge:  { label: 'EventBridge',     sub: 'Event Bus',             icon: '/icons/eventbridge.png', color: '#f59e0b' },
  rabbitmq:     { label: 'RabbitMQ',        sub: 'Message Broker',        icon: '/icons/rabbitmq.svg',    color: '#f97316' },
  flink:        { label: 'Apache Flink',    sub: 'Stream Processing',     icon: '/icons/flink.svg',       color: '#6366f1' },
  spark:        { label: 'Apache Spark',    sub: 'Batch Processing',      color: '#f97316', emoji: '✨' },
  ml:           { label: 'ML Platform',     sub: 'Recommendations',       icon: '/icons/sagemaker.png',   color: '#8b5cf6' },
  sagemaker:    { label: 'SageMaker',       sub: 'ML Training',           icon: '/icons/sagemaker.png',   color: '#8b5cf6' },
  elasticsearch:{ label: 'Elasticsearch',  sub: 'Logs & Search',         icon: '/icons/opensearch.png',  color: '#f59e0b' },
  opensearch:   { label: 'OpenSearch',      sub: 'Search & Analytics',    icon: '/icons/opensearch.png',  color: '#f59e0b' },
  atlas:        { label: 'Atlas',          sub: 'Monitoring',             color: '#ec4899', emoji: '📊' },
  grafana:      { label: 'Grafana',        sub: 'Dashboards',             icon: '/icons/grafana.svg',     color: '#f97316' },
  prometheus:   { label: 'Prometheus',     sub: 'Metrics',                icon: '/icons/prometheus.svg',  color: '#ef4444' },
  // AWS — extended
  ecs:          { label: 'ECS',            sub: 'Container Service',      icon: '/icons/aws-ecs.svg',     color: '#f97316' },
  eks:          { label: 'EKS',            sub: 'Kubernetes',             icon: '/icons/aws-eks.svg',     color: '#f97316' },
  fargate:      { label: 'Fargate',        sub: 'Serverless Compute',     icon: '/icons/aws-fargate.svg', color: '#f97316' },
  route53:      { label: 'Route 53',       sub: 'DNS',                    icon: '/icons/aws-route53.svg', color: '#8C4FFF' },
  waf:          { label: 'WAF',            sub: 'Web App Firewall',       icon: '/icons/aws-waf.svg',     color: '#ef4444' },
  shield:       { label: 'Shield',         sub: 'DDoS Protection',        icon: '/icons/aws-shield.svg',  color: '#ef4444' },
  cognito:      { label: 'Cognito',        sub: 'User Auth',              icon: '/icons/aws-cognito.svg', color: '#ef4444' },
  iam:          { label: 'IAM',            sub: 'Identity & Access',      icon: '/icons/aws-iam.svg',     color: '#ef4444' },
  secretsmanager:{ label: 'Secrets Manager',sub: 'Secret Store',          icon: '/icons/aws-secrets-manager.svg', color: '#ef4444' },
  aurora:       { label: 'Aurora',         sub: 'Managed MySQL/Postgres', icon: '/icons/aws-aurora.svg',  color: '#1d4ed8' },
  redshift:     { label: 'Redshift',       sub: 'Data Warehouse',         icon: '/icons/aws-redshift.svg',color: '#1d4ed8' },
  kinesis:      { label: 'Kinesis',        sub: 'Real-time Streaming',    icon: '/icons/aws-kinesis.svg', color: '#6366f1' },
  glue:         { label: 'Glue',           sub: 'ETL Service',            icon: '/icons/aws-glue.svg',    color: '#6366f1' },
  athena:       { label: 'Athena',         sub: 'Serverless Query',       icon: '/icons/aws-athena.svg',  color: '#6366f1' },
  cloudformation:{ label: 'CloudFormation',sub: 'IaC',                    icon: '/icons/aws-cloudformation.svg', color: '#ec4899' },
  codepipeline: { label: 'CodePipeline',   sub: 'CI/CD Pipeline',         icon: '/icons/aws-codepipeline.svg', color: '#22c55e' },
  codebuild:    { label: 'CodeBuild',      sub: 'Build Service',          icon: '/icons/aws-codebuild.svg',    color: '#22c55e' },
  codedeploy:   { label: 'CodeDeploy',     sub: 'Deployment',             icon: '/icons/aws-codedeploy.svg',   color: '#22c55e' },
  ecr:          { label: 'ECR',            sub: 'Container Registry',     icon: '/icons/aws-ecr.svg',     color: '#f97316' },
  vpc:          { label: 'VPC',            sub: 'Virtual Network',        icon: '/icons/aws-vpc.svg',     color: '#8C4FFF' },
  acm:          { label: 'ACM',            sub: 'Certificate Manager',    icon: '/icons/aws-acm.svg',     color: '#ef4444' },
  ses:          { label: 'SES',            sub: 'Email Service',          icon: '/icons/aws-ses.svg',     color: '#f59e0b' },
  amplify:      { label: 'Amplify',        sub: 'Frontend Hosting',       icon: '/icons/aws-amplify.svg', color: '#f97316' },
  appsync:      { label: 'AppSync',        sub: 'GraphQL API',            icon: '/icons/aws-appsync.svg', color: '#a855f7' },
  dynamostreams:{ label: 'DynamoDB Streams',sub: 'Change Data Capture',   icon: '/icons/aws-dynamodb-streams.svg', color: '#dc2626' },
  elasticbeanstalk:{ label: 'Elastic Beanstalk',sub: 'App Platform',      icon: '/icons/aws-elasticbeanstalk.svg', color: '#f97316' },
  // GCP
  cloudrun:     { label: 'Cloud Run',      sub: 'Serverless Containers',  icon: '/icons/gcp-cloud-run.svg',      color: '#4285f4' },
  gke:          { label: 'GKE',            sub: 'Kubernetes Engine',      icon: '/icons/gcp-gke.svg',            color: '#4285f4' },
  cloudfunctions:{ label: 'Cloud Functions',sub: 'Serverless Functions',   icon: '/icons/gcp-cloud-functions.svg',color: '#4285f4' },
  cloudstorage: { label: 'Cloud Storage',  sub: 'Object Storage',         icon: '/icons/gcp-cloud-storage.svg',  color: '#4285f4' },
  bigquery:     { label: 'BigQuery',       sub: 'Data Warehouse',         icon: '/icons/gcp-bigquery.svg',       color: '#4285f4' },
  cloudsql:     { label: 'Cloud SQL',      sub: 'Managed SQL',            icon: '/icons/gcp-cloud-sql.svg',      color: '#4285f4' },
  pubsub:       { label: 'Pub/Sub',        sub: 'Message Queue',          icon: '/icons/gcp-pubsub.svg',         color: '#4285f4' },
  cloudcdn:     { label: 'Cloud CDN',      sub: 'Content Delivery',       icon: '/icons/gcp-cloud-cdn.svg',      color: '#4285f4' },
  gcplb:        { label: 'Cloud LB',       sub: 'Load Balancing',         icon: '/icons/gcp-cloud-load-balancing.svg', color: '#4285f4' },
  firestore:    { label: 'Firestore',      sub: 'Document DB',            icon: '/icons/gcp-firestore.svg',      color: '#f59e0b' },
  spanner:      { label: 'Spanner',        sub: 'Global SQL',             icon: '/icons/gcp-spanner.svg',        color: '#4285f4' },
  memorystore:  { label: 'Memorystore',    sub: 'Managed Redis',          icon: '/icons/gcp-cloud-memorystore.svg', color: '#ef4444' },
  cloudtasks:   { label: 'Cloud Tasks',    sub: 'Task Queue',             icon: '/icons/gcp-cloud-tasks.svg',    color: '#4285f4' },
  cloudscheduler:{ label: 'Cloud Scheduler',sub: 'Cron Jobs',             icon: '/icons/gcp-cloud-scheduler.svg',color: '#4285f4' },
  vertexai:     { label: 'Vertex AI',      sub: 'ML Platform',            icon: '/icons/gcp-vertex-ai.svg',      color: '#8b5cf6' },
  cloudbuild:   { label: 'Cloud Build',    sub: 'CI/CD',                  icon: '/icons/gcp-cloud-build.svg',    color: '#4285f4' },
  clouddeploy:  { label: 'Cloud Deploy',   sub: 'CD Pipeline',            icon: '/icons/gcp-cloud-deploy.svg',   color: '#4285f4' },
  artifactregistry:{ label: 'Artifact Registry',sub: 'Container Registry',icon: '/icons/gcp-artifact-registry.svg', color: '#4285f4' },
  cloudarmor:   { label: 'Cloud Armor',    sub: 'WAF / DDoS',             icon: '/icons/gcp-cloud-armor.svg',    color: '#ef4444' },
  gcpiam:       { label: 'Cloud IAM',      sub: 'Identity & Access',      icon: '/icons/gcp-cloud-iam.svg',      color: '#ef4444' },
  clouddns:     { label: 'Cloud DNS',      sub: 'DNS Service',            icon: '/icons/gcp-cloud-dns.svg',      color: '#4285f4' },
  cloudlogging: { label: 'Cloud Logging',  sub: 'Log Management',         icon: '/icons/gcp-cloud-logging.svg',  color: '#f59e0b' },
  cloudmonitoring:{ label: 'Cloud Monitoring',sub: 'Metrics & Alerts',    icon: '/icons/gcp-cloud-monitoring.svg',color: '#f59e0b' },
  gcpgateway:   { label: 'API Gateway',    sub: 'GCP API Gateway',        icon: '/icons/gcp-api-gateway.svg',    color: '#4285f4' },
}

export const PALETTE = ["#ef4444","#f97316","#eab308","#22c55e","#14b8a6","#06b6d4","#3b82f6","#8b5cf6","#ec4899","#f43f5e","#84cc16","#0891b2"]

export const TAG_PALETTE = [
  { bg: '#ede9fe', text: '#7c3aed', border: '#c4b5fd' },
  { bg: '#fef3c7', text: '#d97706', border: '#fcd34d' },
  { bg: '#dbeafe', text: '#2563eb', border: '#93c5fd' },
  { bg: '#dcfce7', text: '#16a34a', border: '#86efac' },
  { bg: '#fce7f3', text: '#db2777', border: '#f9a8d4' },
  { bg: '#e0e7ff', text: '#4f46e5', border: '#a5b4fc' },
  { bg: '#ffedd5', text: '#ea580c', border: '#fdba74' },
  { bg: '#f0fdfa', text: '#0d9488', border: '#5eead4' },
]

export function tagColor(tag) {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = ((h << 5) - h + tag.charCodeAt(i)) | 0
  return TAG_PALETTE[Math.abs(h) % TAG_PALETTE.length]
}

export function findService(data) {
  const lbl = (data.label || '').toLowerCase()
  const id  = (data.id  || '').toLowerCase()
  const byId = SERVICES[data.id]
  if (byId?.icon) return byId
  const byLabel = Object.values(SERVICES).find(s => s.icon && (() => {
    const sl = s.label.toLowerCase()
    return lbl === sl || lbl.startsWith(sl) || lbl.includes(sl)
  })())
  if (byLabel) return byLabel
  const byKeyIcon = Object.entries(SERVICES).find(([k, v]) => v.icon && id && (id.includes(k) || k.includes(id)))
  if (byKeyIcon) return byKeyIcon[1]
  if (byId) return byId
  if (!lbl) return {}
  return Object.values(SERVICES).find(s => {
    const sl = s.label.toLowerCase()
    return sl === lbl || sl.includes(lbl) || lbl.includes(sl)
  }) || {}
}
