import { useState, useEffect, useCallback, useRef } from 'react'
import { ReactFlow, Background, Handle, Position } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import confetti from 'canvas-confetti'
import { parseMermaid } from './parseMermaid'
import diagramData from './data/diagram.json'

// ─── AWS Service Config ───────────────────────────────────────────────────────

const SERVICES = {
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
  s3:           { label: 'S3',               sub: 'Object Storage',       icon: '/icons/s3.png',          color: '#16a34a' },
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

const PALETTE = ["#ef4444","#f97316","#eab308","#22c55e","#14b8a6","#06b6d4","#3b82f6","#8b5cf6","#ec4899","#f43f5e","#84cc16","#0891b2"]

const TAG_PALETTE = [
  { bg: '#ede9fe', text: '#7c3aed', border: '#c4b5fd' },
  { bg: '#fef3c7', text: '#d97706', border: '#fcd34d' },
  { bg: '#dbeafe', text: '#2563eb', border: '#93c5fd' },
  { bg: '#dcfce7', text: '#16a34a', border: '#86efac' },
  { bg: '#fce7f3', text: '#db2777', border: '#f9a8d4' },
  { bg: '#e0e7ff', text: '#4f46e5', border: '#a5b4fc' },
  { bg: '#ffedd5', text: '#ea580c', border: '#fdba74' },
  { bg: '#f0fdfa', text: '#0d9488', border: '#5eead4' },
]

function tagColor(tag) {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = ((h << 5) - h + tag.charCodeAt(i)) | 0
  return TAG_PALETTE[Math.abs(h) % TAG_PALETTE.length]
}

const GITHUB_AVATAR = 'https://avatars.githubusercontent.com/u/11523064?v=4'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(d) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const day = Math.floor(h / 24)
  if (day < 7) return `${day}d ago`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Custom Node ──────────────────────────────────────────────────────────────

function findService(data) {
  const lbl = (data.label || '').toLowerCase()
  const id  = (data.id  || '').toLowerCase()
  const byId = SERVICES[data.id]
  if (byId?.icon) return byId
  const byLabel = Object.values(SERVICES).find(s => s.icon && (() => {
    const sl = s.label.toLowerCase()
    return lbl === sl || lbl.startsWith(sl) || lbl.includes(sl)
  })())
  if (byLabel) return byLabel
  const byKeyIcon = Object.entries(SERVICES).find(([k, v]) => v.icon && (id.includes(k) || k.includes(id)))
  if (byKeyIcon) return byKeyIcon[1]
  if (byId) return byId
  return Object.values(SERVICES).find(s => {
    const sl = s.label.toLowerCase()
    return sl === lbl || sl.includes(lbl) || lbl.includes(sl)
  }) || {}
}

function AwsNode({ data }) {
  const svc = findService(data)
  const color = svc.color || '#6b7280'
  const label = svc.label || data.label || data.id

  return (
    <div style={{
      background: '#ffffff', border: `1.5px solid ${color}30`, borderRadius: 14,
      padding: '14px 16px', minWidth: 130, display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 8, position: 'relative',
      boxShadow: `0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)`,
    }}>
      <Handle type="target" position={Position.Left}   style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="target" position={Position.Top}    style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Right}  style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: 'none' }} />
      <div style={{
        width: 52, height: 52, borderRadius: 12,
        background: `${color}12`, border: `1px solid ${color}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4,
      }}>
        {svc.icon
          ? <img src={svc.icon} alt={label} width={32} height={32} style={{ objectFit: 'contain' }} />
          : <span style={{ fontSize: svc.emoji ? 24 : 16, fontWeight: 700, color }}>{svc.emoji || label[0]?.toUpperCase()}</span>
        }
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', letterSpacing: '-0.1px', lineHeight: 1.3 }}>{label}</div>
        {svc.sub && <div style={{ fontSize: 10, color, marginTop: 2, fontWeight: 600, opacity: 0.8 }}>{svc.sub}</div>}
      </div>
    </div>
  )
}

const nodeTypes = { awsNode: AwsNode }

// ─── Default data ─────────────────────────────────────────────────────────────

const defaultNodes = diagramData.nodes.map(n => ({ ...n, type: 'awsNode', data: { id: n.id } }))
const defaultEdges = diagramData.edges.map(({ color, animated, ...e }) => ({
  ...e, animated: animated ?? false,
  style: { stroke: color, strokeWidth: 1.8 },
  labelStyle: { fill: '#374151', fontSize: 10, fontWeight: 600 },
  labelBgStyle: { fill: '#ffffff', fillOpacity: 1 },
  labelBgPadding: [4, 8], labelBgBorderRadius: 6,
}))

// ─── Minimap for cards ────────────────────────────────────────────────────────

function DiagramMinimap({ diagram }) {
  const W = 224, H = 112
  const nodeIds = diagram.nodes.map(n => n.id)
  const n = nodeIds.length
  if (!n) return <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', background: '#ffffff', borderRadius: 8 }} />

  // Compute positions from diagram data
  const xs = diagram.nodes.map(nd => nd.position.x)
  const ys = diagram.nodes.map(nd => nd.position.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1
  const pad = 20

  const positions = diagram.nodes.map(nd => ([
    pad + ((nd.position.x - minX) / rangeX) * (W - pad * 2),
    pad + ((nd.position.y - minY) / rangeY) * (H - pad * 2),
  ]))

  const posMap = {}
  diagram.nodes.forEach((nd, i) => { posMap[nd.id] = positions[i] })

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', background: '#ffffff', borderRadius: 8 }}>
      {diagram.edges.map((e, i) => {
        const fp = posMap[e.source], tp = posMap[e.target]
        if (!fp || !tp) return null
        return <line key={`e${i}`} x1={fp[0]} y1={fp[1]} x2={tp[0]} y2={tp[1]} stroke="#d1d5db" strokeWidth={1.5} />
      })}
      {positions.map(([x, y], i) => (
        <rect key={`n${i}`} x={x - 14} y={y - 8} width={28} height={16} rx={4} fill={PALETTE[i % PALETTE.length]} />
      ))}
    </svg>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function DiagramCard({ diagram, title, updatedAt, tags, onOpen, onViewCode, onDelete }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
      style={{
        background: '#ffffff', borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
        transition: 'box-shadow 0.15s, transform 0.15s',
        border: hovered ? '2px solid #1c1e21' : '2px solid transparent',
        boxShadow: hovered ? '0 8px 28px rgba(0,0,0,0.18), 0 0 0 3px rgba(28,30,33,0.08)' : '0 1px 4px rgba(0,0,0,0.05)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div style={{ padding: '13px 14px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1c1e21', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </span>
        <span style={{ fontSize: 10, color: '#8a8d91', flexShrink: 0 }}>{relativeTime(updatedAt)}</span>
      </div>

      {/* Tags */}
      {tags?.length > 0 && (
        <div style={{ padding: '0 13px 8px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {tags.map(t => { const s = tagColor(t); return (
            <span key={t} style={{ fontSize: 6, fontWeight: 700, padding: '1px 4px', borderRadius: 20, background: s.bg, color: s.text, border: `1px solid ${s.border}`, letterSpacing: '0.02em', lineHeight: 1.4 }}>{t}</span>
          ); })}
        </div>
      )}

      {/* Minimap */}
      <div style={{ padding: '0 12px 13px' }}>
        <DiagramMinimap diagram={diagram} />
      </div>

      {/* Hover actions */}
      {hovered && (
        <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
          <button onClick={onViewCode} title="View code"
            style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid #e4e6e8', background: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#8a8d91" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
            </svg>
          </button>
          <button onClick={onDelete} title="Delete"
            style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid #e4e6e8', background: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, visible }) {
  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%',
      transform: `translateX(-50%) translateY(${visible ? 0 : -60}px)`,
      background: '#111827', color: '#fff',
      padding: '10px 16px 10px 12px', borderRadius: 12,
      fontSize: 13, fontWeight: 600, zIndex: 9999, pointerEvents: 'none',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      transition: 'transform 0.3s ease, opacity 0.3s ease',
      opacity: visible ? 1 : 0,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <img src="/robot.svg" width={24} height={24} alt="" style={{ flexShrink: 0 }} />
      {message}
    </div>
  )
}

// ─── AI Thinking Overlay (copied from diagrams app) ──────────────────────────

const AI_TOKENS = [
  'tokens','context','embedding','inference','neural','attention','transformer',
  'gradient','weight','latent','vector','semantic','entropy','logit','softmax',
  'decode','encode','tensor','backprop','synapse','neuron','pattern','classify',
  'predict','generate','reason','analyze','parse','query','memory','chain',
  'cluster','feature','kernel','dropout','sigmoid','relu','normalize','sample',
  'prompt','stream','output','input','layer','epoch','batch','loss','node','graph',
]
const AI_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*<>/\\|{}[]'
const PARTICLE_COLORS = [
  '#f87171','#fb923c','#fbbf24','#34d399','#38bdf8','#818cf8','#e879f9',
  '#f472b6','#a3e635','#2dd4bf','#60a5fa','#c084fc',
]
const LOADING_PHRASES = [
  'Thinking...','Tokenizing...','Building graph...','Reasoning...','Encoding...',
  'Mapping flow...','Inferring...','Generating...','Assembling...','Almost there...',
]

function pickToken() {
  return Math.random() < 0.35
    ? AI_TOKENS[Math.floor(Math.random() * AI_TOKENS.length)]
    : AI_CHARS[Math.floor(Math.random() * AI_CHARS.length)]
}

function AIThinkingOverlay() {
  const canvasRef = useRef(null)
  const frameRef = useRef(0)
  const [phrase, setPhrase] = useState(LOADING_PHRASES[0])

  useEffect(() => {
    const interval = setInterval(() => {
      setPhrase(LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)])
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = 600, H = 400
    canvas.width = W * 2; canvas.height = H * 2
    ctx.scale(2, 2)

    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -Math.random() * 2 - 0.5,
      text: pickToken(),
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      size: 9 + Math.random() * 6,
      opacity: 0.15 + Math.random() * 0.5,
      life: Math.random() * 200,
    }))

    function animate() {
      ctx.clearRect(0, 0, W, H)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.life++
        p.opacity *= 0.997
        if (p.y < -20 || p.opacity < 0.05) {
          p.x = Math.random() * W
          p.y = H + 10
          p.vy = -Math.random() * 2 - 0.5
          p.vx = (Math.random() - 0.5) * 1.5
          p.text = pickToken()
          p.color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]
          p.opacity = 0.15 + Math.random() * 0.5
          p.life = 0
        }
        ctx.globalAlpha = p.opacity
        ctx.font = `${p.size}px "JetBrains Mono", "Fira Code", monospace`
        ctx.fillStyle = p.color
        ctx.fillText(p.text, p.x, p.y)
      }
      ctx.globalAlpha = 1
      frameRef.current = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(12px)',
    }}>
      <canvas ref={canvasRef} style={{ width: 600, height: 400, position: 'absolute', opacity: 0.6 }} />
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16, background: '#1c1e21',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <div style={{
            width: 24, height: 24, border: '3px solid rgba(255,255,255,0.2)',
            borderTopColor: '#fff', borderRadius: '50%',
            animation: 'sd-spin 0.8s linear infinite',
          }} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{phrase}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Claude is designing your architecture</div>
      </div>
      <style>{`@keyframes sd-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

// Sample diagrams for index page (in real app these would come from DB)
const DIAGRAMS = [
  { id: 'ifttt', title: 'IFTTT System Design', data: diagramData, updatedAt: new Date().toISOString(), tags: ['AWS', 'Architecture'] },
]

export default function App() {
  const [view, setView] = useState('index') // 'index' | 'detail'
  const [activeDiagram, setActiveDiagram] = useState(null)
  const [nodes, setNodes] = useState(defaultNodes)
  const [edges, setEdges] = useState(defaultEdges)
  const [toast, setToast] = useState({ message: '', visible: false })
  const [search, setSearch] = useState('')
  const [showDocs, setShowDocs] = useState(false)
  const [copiedLabel, setCopiedLabel] = useState(null)
  const [codeDiagram, setCodeDiagram] = useState(null)
  const [codeCopied, setCodeCopied] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showAIPrompt, setShowAIPrompt] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiThinking, setAiThinking] = useState(false)
  const [showDetailCode, setShowDetailCode] = useState(false)
  const [detailCodeCopied, setDetailCodeCopied] = useState(false)
  const [showSharePanel, setShowSharePanel] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedShare, setCopiedShare] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const rfInstance = useRef(null)
  const pendingFit = useRef(false)
  const menuRef = useRef(null)
  const aiInputRef = useRef(null)
  const zoomHudRef = useRef(null)
  const zoomHudTimer = useRef(null)

  useEffect(() => { if (showAIPrompt) aiInputRef.current?.focus() }, [showAIPrompt])

  async function submitAI() {
    if (!aiPrompt.trim() || aiThinking) return
    setAiThinking(true)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { showToastMsg(data.error ?? 'Generation failed'); setAiThinking(false); return }
      // data should have { nodes, edges, title }
      const diagram = { id: `ai-${Date.now()}`, title: data.title || 'AI Generated', data: { nodes: data.nodes, edges: data.edges }, updatedAt: new Date().toISOString(), tags: ['AI'] }
      DIAGRAMS.push(diagram)
      openDiagram(diagram)
      setShowAIPrompt(false)
      setAiPrompt('')
      setAiThinking(false)
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.3 }, zIndex: 9999 })
      showToastMsg(`Generated "${data.title}" — ${data.nodes.length} nodes`)
    } catch {
      showToastMsg('Network error')
      setAiThinking(false)
    }
  }

  function showToastMsg(msg) {
    setToast({ message: msg, visible: true })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500)
  }

  function renderDiagram(text) {
    try {
      const { nodes: n, edges: e } = parseMermaid(text)
      if (!n.length) { showToastMsg('Nothing to render — check your syntax'); return }
      setNodes(n)
      setEdges(e)
      pendingFit.current = true
      showToastMsg(`Rendered ${n.length} nodes · ${e.length} edges`)
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.3 }, zIndex: 9999 })
    } catch {
      showToastMsg('Could not parse diagram')
    }
  }

  function openDiagram(d) {
    setActiveDiagram(d)
    const n = d.data.nodes.map(nd => ({ ...nd, type: 'awsNode', data: { id: nd.id } }))
    const e = d.data.edges.map(({ color, animated, ...edge }) => ({
      ...edge, animated: animated ?? false,
      style: { stroke: color, strokeWidth: 1.8 },
      labelStyle: { fill: '#374151', fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: '#ffffff', fillOpacity: 1 },
      labelBgPadding: [4, 8], labelBgBorderRadius: 6,
    }))
    setNodes(n)
    setEdges(e)
    setView('detail')
    pendingFit.current = true
  }

  useEffect(() => {
    if (pendingFit.current && rfInstance.current) {
      setTimeout(() => rfInstance.current.fitView({ padding: 0.12, duration: 400 }), 60)
      pendingFit.current = false
    }
  }, [nodes])

  // Load a saved design when the URL has ?id= (the URL the artifact API returns).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id')
    if (!id) return
    fetch(`/api/system-designs/${id}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(d => openDiagram({ id: d.id, title: d.title, data: { nodes: d.nodes, edges: d.edges }, updatedAt: d.created_at, tags: d.tags || [] }))
      .catch(() => showToastMsg('Could not load design'))
  }, [])

  const onPaste = useCallback((e) => {
    const active = document.activeElement
    if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') return
    const text = e.clipboardData?.getData('text') || ''
    if (/graph\s+(LR|TD|RL|BT)/i.test(text)) {
      renderDiagram(text)
      setView('detail')
      setActiveDiagram({ id: 'pasted', title: 'Pasted Diagram', data: null, updatedAt: new Date().toISOString() })
    }
  }, [])

  useEffect(() => {
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [onPaste])

  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtered = DIAGRAMS.filter(d =>
    !search.trim() || d.title.toLowerCase().includes(search.toLowerCase())
  )

  // ── INDEX VIEW ──────────────────────────────────────────────────────────────
  if (view === 'index') {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f5f7', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
        <Toast message={toast.message} visible={toast.visible} />
        <style>{`
          @media (max-width: 640px) {
            .sd-header { padding: 0 16px !important; }
            .sd-search-wrap { flex: 1 !important; width: auto !important; }
            .sd-search-wrap input { width: 100% !important; }
            .sd-main { padding: 20px 16px 100px !important; }
            .sd-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)) !important; gap: 10px !important; }
          }
          ::-webkit-scrollbar { display: none; }
        `}</style>

        {/* ── Header ── */}
        <header className="sd-header" style={{ background: '#ffffff', borderBottom: '1px solid #e4e6e8', height: 56, position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 32px', height: '100%', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <img src="/icon.png" width={28} height={28} alt="" style={{ borderRadius: 8 }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1c1e21', letterSpacing: '-0.01em' }}>System Design</span>
            </div>

            {/* Search */}
            <div className="sd-search-wrap" style={{ position: 'relative', width: 260 }}>
              <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8a8d91' }} width={13} height={13} viewBox="0 0 20 20" fill="none">
                <circle cx={9} cy={9} r={6} stroke="currentColor" strokeWidth={1.8} />
                <path d="M14 14l3 3" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                style={{ width: '100%', padding: '7px 14px 7px 32px', boxSizing: 'border-box', border: '1px solid #e4e6e8', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', color: '#1c1e21', background: '#f4f5f7' }} />
            </div>

            <div style={{ flex: 1 }} />

            {/* Avatar / Menu */}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button onClick={() => setShowMenu(v => !v)}
                style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', border: showMenu ? '2px solid #1c1e21' : '2px solid #e4e6e8', cursor: 'pointer', padding: 0, background: '#e4e6e8', transition: 'border-color 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1c1e21', userSelect: 'none' }}>B</span>
                <img src={GITHUB_AVATAR} alt="" referrerPolicy="no-referrer" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
              </button>
              {showMenu && (
                <div style={{ position: 'absolute', top: 42, right: 0, width: 210, background: '#ffffff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid #e4e6e8', overflow: 'hidden', zIndex: 50 }}>
                  <div style={{ padding: '14px 16px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1e21' }}>Bunlong Heng</div>
                    <div style={{ fontSize: 11, color: '#8a8d91', marginTop: 3 }}>System Design Diagrams</div>
                  </div>
                  <div style={{ height: 1, background: '#f0f1f3' }} />
                  <button onClick={() => { setShowDocs(true); setShowMenu(false); }}
                    style={{ width: '100%', padding: '11px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#1c1e21', fontFamily: 'inherit', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f4f5f7')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <span style={{ fontSize: 14 }}>📋</span> Import formats
                  </button>
                  <button onClick={() => { setShowAIPrompt(true); setShowMenu(false); }}
                    style={{ width: '100%', padding: '11px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#1c1e21', fontFamily: 'inherit', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f4f5f7')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <span style={{ fontSize: 14 }}>✦</span> Generate with AI
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Content ── */}
        <main className="sd-main" style={{ padding: '32px 32px 100px', maxWidth: 1600, margin: '0 auto' }}>
          {filtered.length === 0 && (
            <div style={{ position: 'fixed', inset: 0, top: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: '#f4f5f7' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#e4e6e8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#8a8d91" strokeWidth={1.5} strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="13" y2="13"/></svg>
              </div>
              <p style={{ fontSize: 14, color: '#1c1e21', fontWeight: 600, margin: 0 }}>{search ? 'No diagrams found' : 'No diagrams yet'}</p>
              <p style={{ fontSize: 13, color: '#8a8d91', marginTop: 6 }}>{search ? 'Try a different search' : 'Paste Mermaid code to get started'}</p>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="sd-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {filtered.map(d => (
                <DiagramCard
                  key={d.id}
                  diagram={d.data}
                  title={d.title}
                  updatedAt={d.updatedAt}
                  tags={d.tags}
                  onOpen={() => openDiagram(d)}
                  onViewCode={() => setCodeDiagram(d)}
                  onDelete={() => showToastMsg('Delete not available in demo')}
                />
              ))}
            </div>
          )}
        </main>

        {/* ── FAB ── */}
        <button onClick={() => setShowAIPrompt(true)} title="Generate with AI"
          style={{ position: 'fixed', bottom: 32, right: 32, width: 52, height: 52, borderRadius: '50%', background: '#1c1e21', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer', fontSize: 24, color: '#fff', transition: 'transform 0.15s, box-shadow 0.15s', zIndex: 5 }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(0,0,0,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)' }}
        >✦</button>

        {/* ── AI Prompt Modal ── */}
        {aiThinking && <AIThinkingOverlay />}
        {showAIPrompt && !aiThinking && (
          <div onClick={() => setShowAIPrompt(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', borderRadius: 20, padding: '32px 32px 28px', width: 520, boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#1c1e21', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1c1e21', margin: 0 }}>Generate with AI</h3>
                  <p style={{ fontSize: 12, color: '#8a8d91', margin: 0 }}>Describe your system and Claude will build the diagram</p>
                </div>
              </div>
              <textarea
                ref={aiInputRef}
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitAI(); if (e.key === 'Escape') setShowAIPrompt(false); }}
                placeholder='e.g. "Netflix streaming architecture with CDN, load balancer, microservices, and caching layers"'
                rows={4}
                style={{ width: '100%', padding: '12px 14px', fontSize: 14, border: '1.5px solid #e4e6e8', borderRadius: 12, outline: 'none', fontFamily: 'inherit', resize: 'none', color: '#1c1e21', background: '#f8f9fa', boxSizing: 'border-box', lineHeight: 1.6 }}
              />
              <p style={{ fontSize: 11, color: '#bcc0c4', margin: '8px 0 20px' }}>Cmd + Enter to generate</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowAIPrompt(false)} style={{ padding: '10px 20px', border: '1px solid #e4e6e8', borderRadius: 10, background: '#f4f5f7', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', color: '#65676b' }}>Cancel</button>
                <button onClick={submitAI} disabled={!aiPrompt.trim() || aiThinking} style={{ padding: '10px 24px', background: aiPrompt.trim() ? '#1c1e21' : '#e4e6e8', color: aiPrompt.trim() ? '#fff' : '#8a8d91', border: 'none', borderRadius: 10, cursor: aiPrompt.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'background 0.15s' }}>
                  {aiThinking ? 'Generating...' : 'Generate ✦'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Import Formats Modal ── */}
        {showDocs && (
          <div onClick={() => setShowDocs(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(6px)' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', borderRadius: 16, padding: '28px 32px', width: 560, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.12)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1c1e21', margin: 0 }}>Import Formats</h2>
                <button onClick={() => setShowDocs(false)} style={{ background: 'none', border: 'none', color: '#8a8d91', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
              </div>
              <p style={{ fontSize: 12, color: '#65676b', margin: '0 0 20px', lineHeight: 1.6 }}>Two ways to create a system design diagram. Paste Mermaid code anywhere to auto-render.</p>
              {[
                { label: '1. Paste Mermaid (Cmd+V)', tag: 'Auto-detect', tagColor: '#16a34a', code: `graph LR\n  user[User] -->|Trigger event| apigw[API Gateway]\n  apigw -->|Invoke| lambda[Lambda]\n  lambda -->|Store token| dynamo[DynamoDB]\n  lambda -->|Start execution| sfn[Step Functions]` },
                { label: '2. Edit diagram.json', tag: 'Manual', tagColor: '#6366f1', code: `// src/data/diagram.json\n{\n  "nodes": [\n    { "id": "lambda", "position": { "x": 480, "y": 210 } },\n    { "id": "dynamo", "position": { "x": 700, "y": 330 } }\n  ],\n  "edges": [\n    { "id": "e1", "source": "lambda", "target": "dynamo",\n      "label": "Store token", "color": "#dc2626" }\n  ]\n}` },
                { label: 'Supported Services', tag: `${Object.keys(SERVICES).length} services`, tagColor: '#0ea5e9', code: Object.entries(SERVICES).filter(([,v]) => v.icon).map(([k, v]) => `${k.padEnd(14)} → ${v.label} (${v.sub})`).join('\n') },
              ].map(({ label, tag, tagColor, code }) => (
                <div key={label} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1c1e21' }}>{label}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: tagColor, background: `${tagColor}14`, borderRadius: 4, padding: '2px 7px' }}>{tag}</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <pre style={{ margin: 0, padding: '12px 14px', background: '#f4f5f7', borderRadius: 8, border: '1px solid #e4e6e8', fontSize: 11, color: '#1c1e21', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", lineHeight: 1.7, overflowX: 'auto', whiteSpace: 'pre' }}>{code}</pre>
                    <button
                      onClick={() => { navigator.clipboard.writeText(code); setCopiedLabel(label); setTimeout(() => setCopiedLabel(null), 2000); }}
                      style={{ position: 'absolute', top: 8, right: 8, background: copiedLabel === label ? '#22c55e' : '#ffffff', border: '1px solid #e4e6e8', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, color: copiedLabel === label ? '#ffffff' : '#65676b', cursor: 'pointer', transition: 'all 0.15s' }}
                    >{copiedLabel === label ? 'Copied!' : 'Copy'}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Code slide-in panel ── */}
        {codeDiagram && (
          <div onClick={() => { setCodeDiagram(null); setCodeCopied(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div onClick={e => e.stopPropagation()} style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 420, maxWidth: '90vw',
              background: '#ffffff', boxShadow: '8px 0 32px rgba(0,0,0,0.12)',
              display: 'flex', flexDirection: 'column',
              animation: 'sd-slide-left 0.2s ease-out',
            }}>
              <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #e4e6e8', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#1c1e21" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                </svg>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1c1e21', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{codeDiagram.title}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(JSON.stringify(codeDiagram.data, null, 2)); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }}
                  style={{ background: codeCopied ? '#22c55e' : '#f4f5f7', border: '1px solid #e4e6e8', borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: codeCopied ? '#fff' : '#65676b', cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}
                >{codeCopied ? 'Copied!' : 'Copy'}</button>
                <button onClick={() => { setCodeDiagram(null); setCodeCopied(false); }} style={{ background: 'none', border: 'none', color: '#8a8d91', cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>✕</button>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: 0 }}>
                <pre style={{
                  margin: 0, padding: '16px 20px', fontSize: 12, lineHeight: 1.75, color: '#1c1e21',
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace", whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>{JSON.stringify(codeDiagram.data, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes sd-slide-left {
            from { transform: translateX(-100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}</style>
      </div>
    )
  }

  // ── Export/Share functions ───────────────────────────────────────────────────

  function exportFilename(ext) {
    const t = (activeDiagram?.title || 'diagram').replace(/[^a-z0-9]/gi, '-').toLowerCase()
    const now = new Date()
    return `${t}-${now.toISOString().slice(0, 10)}-${now.toTimeString().slice(0, 5).replace(':', '-')}.${ext}`
  }

  function exportPng() {
    const el = document.querySelector('.react-flow')
    if (!el) return
    import('html-to-image').then(({ toPng }) => {
      toPng(el, { backgroundColor: '#e8ecf0', pixelRatio: 2 }).then(url => {
        const a = document.createElement('a'); a.href = url; a.download = exportFilename('png'); a.click()
      })
    }).catch(() => {
      // fallback: screenshot via canvas not available, just notify
      showToastMsg('PNG export requires html-to-image package')
    })
  }

  function exportJson() {
    const data = activeDiagram?.data || diagramData
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    a.download = exportFilename('json'); a.click()
  }

  function exportCode() {
    const data = activeDiagram?.data || diagramData
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'text/plain' }))
    a.download = exportFilename('txt'); a.click()
  }

  function copyLink() {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true); setTimeout(() => setCopiedLink(false), 1500)
      showToastMsg('Link copied!')
    })
  }

  function shareAction() {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: activeDiagram?.title || 'System Design', url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedShare(true); setTimeout(() => setCopiedShare(false), 1500)
        showToastMsg('Link copied!')
      })
    }
  }

  function copyCode() {
    const data = activeDiagram?.data || diagramData
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
      setCopiedCode(true); setTimeout(() => setCopiedCode(false), 1500)
    })
  }

  // ── Zoom HUD ────────────────────────────────────────────────────────────────
  function flashZoomHud(z) {
    if (!zoomHudRef.current) return
    zoomHudRef.current.textContent = `${Math.round(z * 100)}%`
    zoomHudRef.current.style.opacity = '1'
    if (zoomHudTimer.current) clearTimeout(zoomHudTimer.current)
    zoomHudTimer.current = setTimeout(() => {
      if (zoomHudRef.current) zoomHudRef.current.style.opacity = '0'
    }, 900)
  }

  // ── DETAIL VIEW ─────────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <Toast message={toast.message} visible={toast.visible} />

      {/* Header — diagrams-style floating pill toolbar */}
      <header style={{
        height: 54, background: '#ffffff', borderBottom: '1px solid #e4e6e8',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, flexShrink: 0,
      }}>
        {/* Back button */}
        <button onClick={() => { setView('index'); setShowDetailCode(false); }}
          style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            border: '1px solid #e4e6e8', background: '#ffffff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            color: '#64748b', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#e9ecef')}
          onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>

        <div style={{ flex: 1 }} />

        {/* Action toolbar — floating pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          background: '#ffffff', border: '1px solid #e4e6e8', borderRadius: 14,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: '4px 6px',
        }}>
          {/* Code toggle */}
          <button onClick={() => setShowDetailCode(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 10px', height: 30, borderRadius: 8, border: 'none',
            background: showDetailCode ? '#f1f5f9' : 'transparent',
            color: showDetailCode ? '#1e293b' : '#64748b',
            cursor: 'pointer', fontSize: 13, fontWeight: showDetailCode ? 600 : 400,
            transition: 'all 0.1s', fontFamily: 'inherit',
          }}
            onMouseEnter={e => { if (!showDetailCode) e.currentTarget.style.background = '#f1f5f9' }}
            onMouseLeave={e => { if (!showDetailCode) e.currentTarget.style.background = 'transparent' }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
            </svg>
            Code
          </button>

          <div style={{ width: 1, height: 18, background: '#e4e6e8', flexShrink: 0, margin: '0 2px' }} />

          {/* Fit button */}
          <button onClick={() => rfInstance.current?.fitView({ padding: 0.12, duration: 400 })} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 10px', height: 30, borderRadius: 8, border: 'none',
            background: 'transparent', color: '#64748b',
            cursor: 'pointer', fontSize: 13, fontWeight: 400,
            transition: 'all 0.1s', fontFamily: 'inherit',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
            Fit
          </button>

          <div style={{ width: 1, height: 18, background: '#e4e6e8', flexShrink: 0, margin: '0 2px' }} />

          {/* Share toggle */}
          <button onClick={() => setShowSharePanel(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 10px', height: 30, borderRadius: 8, border: 'none',
            background: showSharePanel ? '#f1f5f9' : 'transparent',
            color: showSharePanel ? '#1e293b' : '#64748b',
            cursor: 'pointer', fontSize: 13, fontWeight: showSharePanel ? 600 : 400,
            transition: 'all 0.1s', fontFamily: 'inherit',
          }}
            onMouseEnter={e => { if (!showSharePanel) e.currentTarget.style.background = '#f1f5f9' }}
            onMouseLeave={e => { if (!showSharePanel) e.currentTarget.style.background = 'transparent' }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            Share
          </button>

        </div>
      </header>

      {/* Body — code panel + canvas */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>

        {/* Code panel (left, slide-in) */}
        {showDetailCode && (
          <div style={{
            width: 340, flexShrink: 0, background: '#ffffff', borderRight: '1px solid #e4e6e8',
            display: 'flex', flexDirection: 'column', animation: 'sd-slide-left 0.2s ease-out',
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e4e6e8', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#1c1e21" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1c1e21', flex: 1 }}>{activeDiagram?.title || 'diagram.json'}</span>
              <button
                onClick={() => {
                  const code = JSON.stringify(activeDiagram?.data || diagramData, null, 2)
                  navigator.clipboard.writeText(code)
                  setDetailCodeCopied(true)
                  setTimeout(() => setDetailCodeCopied(false), 2000)
                }}
                style={{ background: detailCodeCopied ? '#22c55e' : '#f4f5f7', border: '1px solid #e4e6e8', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, color: detailCodeCopied ? '#fff' : '#65676b', cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}
              >{detailCodeCopied ? 'Copied!' : 'Copy'}</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <pre style={{
                margin: 0, padding: '14px 16px', fontSize: 11, lineHeight: 1.75, color: '#1c1e21',
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace", whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>{JSON.stringify(activeDiagram?.data || diagramData, null, 2)}</pre>
            </div>
          </div>
        )}

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', background: '#e8ecf0' }}>
          <ReactFlow
            nodes={nodes} edges={edges} nodeTypes={nodeTypes}
            onInit={inst => { rfInstance.current = inst }}
            onMoveEnd={(_, viewport) => flashZoomHud(viewport.zoom)}
            fitView fitViewOptions={{ padding: 0.12 }}
            nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
            panOnDrag zoomOnScroll minZoom={0.3} maxZoom={2.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant="dots" gap={24} size={1} color="#d1d5db" />
          </ReactFlow>

          {/* Zoom HUD */}
          <div ref={zoomHudRef} style={{
            position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(10,10,15,0.72)', backdropFilter: 'blur(12px)',
            color: '#fff', borderRadius: 100, padding: '7px 20px',
            fontSize: 15, fontWeight: 700, letterSpacing: '0.02em',
            opacity: 0, transition: 'opacity 0.2s ease', pointerEvents: 'none',
            zIndex: 50, boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
          }} />

        </div>

        {/* Share panel (right side) */}
        {showSharePanel && (
          <div style={{
            width: 240, flexShrink: 0, background: '#f1f5f9', borderLeft: '1px solid #e2e8f0',
            display: 'flex', flexDirection: 'column', padding: '20px 16px',
            animation: 'sd-slide-right 0.2s ease-out',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: 16 }}>Export & Share</div>

            {/* Download grid — exact diagrams app colors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              <button onClick={exportPng}
                style={{ background: '#FF6188', color: '#221F22', cursor: 'pointer', padding: '7px 0', fontSize: 11, fontWeight: 600, borderRadius: 12, border: 'none', transition: 'all 0.1s', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
              >PNG</button>
              <button onClick={exportCode}
                style={{ background: '#FC9867', color: '#221F22', cursor: 'pointer', padding: '7px 0', fontSize: 11, fontWeight: 600, borderRadius: 12, border: 'none', transition: 'all 0.1s', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
              >Code</button>
              <button onClick={copyLink}
                style={{ background: copiedLink ? '#A9DC76' : '#FFD866', color: '#221F22', cursor: 'pointer', padding: '7px 0', fontSize: 11, fontWeight: 600, borderRadius: 12, border: 'none', transition: 'all 0.1s', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
              >{copiedLink ? 'Copied!' : 'Link'}</button>
              <button onClick={exportJson}
                style={{ background: '#A9DC76', color: '#221F22', cursor: 'pointer', padding: '7px 0', fontSize: 11, fontWeight: 600, borderRadius: 12, border: 'none', transition: 'all 0.1s', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
              >JSON</button>
              <button onClick={shareAction}
                style={{ background: copiedShare ? '#A9DC76' : '#78DCE8', color: '#221F22', cursor: 'pointer', padding: '7px 0', fontSize: 11, fontWeight: 600, borderRadius: 12, border: 'none', transition: 'all 0.1s', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
              >{copiedShare ? 'Shared!' : 'Share'}</button>
              <button onClick={copyCode}
                style={{ background: copiedCode ? '#A9DC76' : '#AB9DF2', color: '#221F22', cursor: 'pointer', padding: '7px 0', fontSize: 11, fontWeight: 600, borderRadius: 12, border: 'none', transition: 'all 0.1s', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
              >{copiedCode ? 'Copied!' : 'Copy'}</button>
            </div>

            {/* Diagram info */}
            <div style={{ marginTop: 24, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: 10 }}>Diagram Info</div>
            <div style={{ background: '#ffffff', borderRadius: 10, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>{activeDiagram?.title || 'IFTTT System Design'}</div>
              <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
                {nodes.length} nodes · {edges.length} edges
              </div>
              {activeDiagram?.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                  {activeDiagram.tags.map(t => { const s = tagColor(t); return (
                    <span key={t} style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>{t}</span>
                  ); })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Import Formats modal (shared) */}
      {showDocs && (
        <div onClick={() => setShowDocs(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(6px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', borderRadius: 16, padding: '28px 32px', width: 560, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1c1e21', margin: 0 }}>Import Formats</h2>
              <button onClick={() => setShowDocs(false)} style={{ background: 'none', border: 'none', color: '#8a8d91', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
            </div>
            <p style={{ fontSize: 12, color: '#65676b', margin: '0 0 20px', lineHeight: 1.6 }}>Two ways to create a system design diagram. Paste Mermaid code anywhere to auto-render.</p>
            {[
              { label: '1. Paste Mermaid (Cmd+V)', tag: 'Auto-detect', tagColor: '#16a34a', code: `graph LR\n  user[User] -->|Trigger event| apigw[API Gateway]\n  apigw -->|Invoke| lambda[Lambda]\n  lambda -->|Store token| dynamo[DynamoDB]\n  lambda -->|Start execution| sfn[Step Functions]` },
              { label: '2. Edit diagram.json', tag: 'Manual', tagColor: '#6366f1', code: `// src/data/diagram.json\n{\n  "nodes": [\n    { "id": "lambda", "position": { "x": 480, "y": 210 } },\n    { "id": "dynamo", "position": { "x": 700, "y": 330 } }\n  ],\n  "edges": [\n    { "id": "e1", "source": "lambda", "target": "dynamo",\n      "label": "Store token", "color": "#dc2626" }\n  ]\n}` },
              { label: 'Supported Services', tag: `${Object.keys(SERVICES).length} services`, tagColor: '#0ea5e9', code: Object.entries(SERVICES).filter(([,v]) => v.icon).map(([k, v]) => `${k.padEnd(14)} → ${v.label} (${v.sub})`).join('\n') },
            ].map(({ label, tag, tagColor, code }) => (
              <div key={label} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1c1e21' }}>{label}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: tagColor, background: `${tagColor}14`, borderRadius: 4, padding: '2px 7px' }}>{tag}</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <pre style={{ margin: 0, padding: '12px 14px', background: '#f4f5f7', borderRadius: 8, border: '1px solid #e4e6e8', fontSize: 11, color: '#1c1e21', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", lineHeight: 1.7, overflowX: 'auto', whiteSpace: 'pre' }}>{code}</pre>
                  <button
                    onClick={() => { navigator.clipboard.writeText(code); setCopiedLabel(label); setTimeout(() => setCopiedLabel(null), 2000); }}
                    style={{ position: 'absolute', top: 8, right: 8, background: copiedLabel === label ? '#22c55e' : '#ffffff', border: '1px solid #e4e6e8', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, color: copiedLabel === label ? '#ffffff' : '#65676b', cursor: 'pointer', transition: 'all 0.15s' }}
                  >{copiedLabel === label ? 'Copied!' : 'Copy'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes sd-slide-left {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes sd-slide-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
