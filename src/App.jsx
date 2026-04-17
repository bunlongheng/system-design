import { useState, useEffect, useCallback, useRef } from 'react'
import { ReactFlow, Background, Controls, Handle, Position } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import confetti from 'canvas-confetti'
import { parseMermaid } from './parseMermaid'
import diagramData from './data/diagram.json'

// ─── AWS Service Config ───────────────────────────────────────────────────────

const SERVICES = {
  // AWS — with local icons
  apigw:        { label: 'API Gateway',       sub: 'External Trigger',   icon: '/icons/apigateway.png',    color: '#a855f7' },
  lambda:       { label: 'Lambda',            sub: 'Trigger Handler',    icon: '/icons/lambda.png',        color: '#f97316' },
  kms:          { label: 'KMS',               sub: 'Token Encryption',   icon: '/icons/kms.png',           color: '#ef4444' },
  dynamo:       { label: 'DynamoDB',          sub: 'Token Store',        icon: '/icons/dynamodb.png',      color: '#dc2626' },
  sfn:          { label: 'Step Functions',    sub: 'Multi-Action Flow',  icon: '/icons/stepfunctions.png', color: '#ec4899' },
  cloudwatch:   { label: 'CloudWatch',        sub: 'Monitoring',         icon: '/icons/cloudwatch.png',    color: '#ec4899' },
  cloudtrail:   { label: 'CloudTrail',        sub: 'Audit Logs',         icon: '/icons/cloudtrail.png',    color: '#ec4899' },
  // People / Auth
  user:         { label: 'User',              sub: 'Client',             color: '#3b82f6', emoji: '👤' },
  client:       { label: 'Client',            sub: 'Browser / App',      color: '#3b82f6', emoji: '💻' },
  oauth:        { label: 'OAuth Provider',    sub: 'Auth Service',       color: '#22c55e', emoji: '🔐' },
  auth:         { label: 'Auth Service',      sub: 'Authentication',     color: '#22c55e', emoji: '🔑' },
  // Networking / Routing
  cdn:          { label: 'CDN',               sub: 'Open Connect',        icon: '/icons/cloudfront.png',  color: '#8C4FFF' },
  cloudfront:   { label: 'CloudFront',        sub: 'CDN',                 icon: '/icons/cloudfront.png',  color: '#8C4FFF' },
  loadbalancer: { label: 'Load Balancer',     sub: 'Traffic Distribution',icon: '/icons/elb.png',         color: '#8C4FFF' },
  elb:          { label: 'Elastic LB',        sub: 'Load Balancer',       icon: '/icons/elb.png',         color: '#8C4FFF' },
  nginx:        { label: 'Nginx',             sub: 'Reverse Proxy',       icon: '/icons/nginx.svg',       color: '#22c55e' },
  zuul:         { label: 'Zuul Proxy',        sub: 'API Proxy',           color: '#a855f7', emoji: '🔀' },
  gateway:      { label: 'API Gateway',       sub: 'Entry Point',         icon: '/icons/apigateway.png',  color: '#a855f7' },
  // Service Discovery
  eureka:       { label: 'Eureka',            sub: 'Service Discovery',   color: '#f59e0b', emoji: '🔍' },
  consul:       { label: 'Consul',            sub: 'Service Discovery',   color: '#f59e0b', emoji: '🗺️' },
  // Compute
  ec2:          { label: 'EC2',               sub: 'Virtual Servers',     icon: '/icons/ec2.png',         color: '#f97316' },
  microservices:{ label: 'Microservices',     sub: 'Business Logic',      color: '#6366f1', emoji: '⚙️' },
  service:      { label: 'Service',           sub: 'Microservice',        color: '#6366f1', emoji: '⚙️' },
  encoder:      { label: 'Encoding Pipeline', sub: 'Media Processing',    color: '#f97316', emoji: '🎬' },
  // Databases
  cassandra:    { label: 'Cassandra',         sub: 'NoSQL DB',            icon: '/icons/keyspaces.png',   color: '#1d4ed8' },
  keyspaces:    { label: 'Keyspaces',         sub: 'Cassandra-compat',    icon: '/icons/keyspaces.png',   color: '#1d4ed8' },
  postgres:     { label: 'PostgreSQL',        sub: 'Relational DB',       icon: '/icons/rds.png',         color: '#1d4ed8' },
  mysql:        { label: 'MySQL',             sub: 'Relational DB',       icon: '/icons/rds.png',         color: '#1d4ed8' },
  rds:          { label: 'RDS',               sub: 'Relational DB',       icon: '/icons/rds.png',         color: '#1d4ed8' },
  mongodb:      { label: 'MongoDB',           sub: 'Document DB',         icon: '/icons/mongodb.svg',  color: '#22c55e' },
  redis:        { label: 'Redis',             sub: 'Cache / Session',     icon: '/icons/redis-si.svg',    color: '#ef4444' },
  memcached:    { label: 'Memcached',         sub: 'EVCache',             icon: '/icons/elasticache.png', color: '#ef4444' },
  elasticache:  { label: 'ElastiCache',       sub: 'Cache Layer',         icon: '/icons/elasticache.png', color: '#ef4444' },
  // Storage
  s3:           { label: 'S3',               sub: 'Object Storage',       icon: '/icons/s3.png',          color: '#16a34a' },
  storage:      { label: 'Storage',          sub: 'Object Store',         color: '#16a34a', emoji: '💾' },
  // Messaging / Streaming
  kafka:        { label: 'Kafka',            sub: 'Event Streaming',      icon: '/icons/kafka.png',       color: '#1d4ed8' },
  msk:          { label: 'MSK',             sub: 'Managed Kafka',         icon: '/icons/kafka.png',       color: '#1d4ed8' },
  sqs:          { label: 'SQS',             sub: 'Message Queue',         icon: '/icons/sqs.png',         color: '#f59e0b' },
  sns:          { label: 'SNS',             sub: 'Notifications',         icon: '/icons/sns.png',         color: '#f59e0b' },
  eventbridge:  { label: 'EventBridge',     sub: 'Event Bus',             icon: '/icons/eventbridge.png', color: '#f59e0b' },
  rabbitmq:     { label: 'RabbitMQ',        sub: 'Message Broker',        icon: '/icons/rabbitmq.svg',    color: '#f97316' },
  // Stream Processing / ML
  flink:        { label: 'Apache Flink',    sub: 'Stream Processing',     icon: '/icons/flink.svg',       color: '#6366f1' },
  spark:        { label: 'Apache Spark',    sub: 'Batch Processing',      color: '#f97316', emoji: '✨' },
  ml:           { label: 'ML Platform',     sub: 'Recommendations',       icon: '/icons/sagemaker.png',   color: '#8b5cf6' },
  sagemaker:    { label: 'SageMaker',       sub: 'ML Training',           icon: '/icons/sagemaker.png',   color: '#8b5cf6' },
  // Observability
  elasticsearch:{ label: 'Elasticsearch',  sub: 'Logs & Search',         icon: '/icons/opensearch.png',  color: '#f59e0b' },
  opensearch:   { label: 'OpenSearch',      sub: 'Search & Analytics',    icon: '/icons/opensearch.png',  color: '#f59e0b' },
  atlas:        { label: 'Atlas',          sub: 'Monitoring',             color: '#ec4899', emoji: '📊' },
  grafana:      { label: 'Grafana',        sub: 'Dashboards',             icon: '/icons/grafana.svg',     color: '#f97316' },
  prometheus:   { label: 'Prometheus',     sub: 'Metrics',                icon: '/icons/prometheus.svg',  color: '#ef4444' },
}

// ─── Custom Node ──────────────────────────────────────────────────────────────

function findService(data) {
  const lbl = (data.label || '').toLowerCase()
  const id  = (data.id  || '').toLowerCase()

  // Priority 1: exact id match with an icon
  const byId = SERVICES[data.id]
  if (byId?.icon) return byId

  // Priority 2: label contains a known service name that has an icon
  const byLabel = Object.values(SERVICES).find(s => s.icon && (() => {
    const sl = s.label.toLowerCase()
    return lbl === sl || lbl.startsWith(sl) || lbl.includes(sl)
  })())
  if (byLabel) return byLabel

  // Priority 3: id keyword match with an icon
  const byKeyIcon = Object.entries(SERVICES).find(([k, v]) => v.icon && (id.includes(k) || k.includes(id)))
  if (byKeyIcon) return byKeyIcon[1]

  // Priority 4: any id match (emoji fallback)
  if (byId) return byId

  // Priority 5: any label match
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

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [nodes, setNodes] = useState(defaultNodes)
  const [edges, setEdges] = useState(defaultEdges)
  const [toast, setToast] = useState({ message: '', visible: false })
  const rfInstance = useRef(null)
  const pendingFit = useRef(false)

  function showToast(msg) {
    setToast({ message: msg, visible: true })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500)
  }

  function renderDiagram(text) {
    try {
      const { nodes: n, edges: e } = parseMermaid(text)
      if (!n.length) { showToast('Nothing to render — check your syntax'); return }
      setNodes(n)
      setEdges(e)
      pendingFit.current = true
      showToast(`Rendered ${n.length} nodes · ${e.length} edges`)
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.3 }, zIndex: 9999 })
    } catch {
      showToast('Could not parse diagram')
    }
  }

  // Auto-fit after diagram update
  useEffect(() => {
    if (pendingFit.current && rfInstance.current) {
      setTimeout(() => rfInstance.current.fitView({ padding: 0.12, duration: 400 }), 60)
      pendingFit.current = false
    }
  }, [nodes])

  // Global paste listener
  const onPaste = useCallback((e) => {
    const active = document.activeElement
    if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') return
    const text = e.clipboardData?.getData('text') || ''
    if (/graph\s+(LR|TD|RL|BT)/i.test(text)) {
      renderDiagram(text)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [onPaste])

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'linear-gradient(135deg, #c8cdd8 0%, #d8dce6 50%, #c4c9d6 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', boxSizing: 'border-box',
    }}>
      <Toast message={toast.message} visible={toast.visible} />

      <div style={{
        width: '100%', height: '100%', background: '#ffffff', borderRadius: 20,
        boxShadow: '0 2px 4px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.1), 0 32px 64px rgba(0,0,0,0.08)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#ffffff', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, boxShadow: '0 2px 8px rgba(249,115,22,0.3)',
            }}>⚡</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', letterSpacing: '-0.3px' }}>IFTTT System Design</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1, fontWeight: 500 }}>AWS Architecture · If This Then That Flow</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>Paste a Mermaid diagram anywhere to render it</span>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{nodes.length} services · {edges.length} connections</span>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={nodes} edges={edges} nodeTypes={nodeTypes}
            onInit={inst => { rfInstance.current = inst }}
            fitView fitViewOptions={{ padding: 0.12 }}
            nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
            panOnDrag zoomOnScroll minZoom={0.3} maxZoom={2.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant="dots" gap={24} size={1} color="#e5e7eb" />
            <Controls showInteractive={false} style={{
              background: '#ffffff', border: '1px solid #e5e7eb',
              borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }} />
          </ReactFlow>
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 24px', borderTop: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: '#d1d5db' }}>Scroll to zoom · Drag to pan</span>
        </div>
      </div>
    </div>
  )
}
