// Inline AWS-style SVG icon components
// Each icon matches the official AWS Architecture Icon color + style

const IconWrapper = ({ color, children, size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="8" fill={color} />
    {children}
  </svg>
)

export const IconLambda = ({ size }) => (
  <IconWrapper color="#FF9900" size={size}>
    <text x="24" y="34" textAnchor="middle" fill="white" fontSize="26" fontWeight="bold" fontFamily="serif">λ</text>
  </IconWrapper>
)

export const IconAPIGateway = ({ size }) => (
  <IconWrapper color="#8C4FFF" size={size}>
    <rect x="10" y="22" width="28" height="4" rx="2" fill="white" />
    <polygon points="24,10 34,22 14,22" fill="white" />
    <polygon points="24,38 14,26 34,26" fill="white" />
  </IconWrapper>
)

export const IconStepFunctions = ({ size }) => (
  <IconWrapper color="#FF4F8B" size={size}>
    <rect x="11" y="10" width="10" height="10" rx="2" fill="white" />
    <rect x="27" y="19" width="10" height="10" rx="2" fill="white" />
    <rect x="11" y="28" width="10" height="10" rx="2" fill="white" />
    <line x1="21" y1="15" x2="27" y2="15" stroke="white" strokeWidth="2" />
    <line x1="27" y1="15" x2="27" y2="24" stroke="white" strokeWidth="2" />
    <line x1="21" y1="33" x2="27" y2="33" stroke="white" strokeWidth="2" />
    <line x1="27" y1="29" x2="27" y2="33" stroke="white" strokeWidth="2" />
  </IconWrapper>
)

export const IconDynamoDB = ({ size }) => (
  <IconWrapper color="#C7131F" size={size}>
    <ellipse cx="24" cy="14" rx="12" ry="5" fill="white" />
    <rect x="12" y="14" width="24" height="10" fill="white" opacity="0.85" />
    <ellipse cx="24" cy="24" rx="12" ry="5" fill="white" />
    <rect x="12" y="24" width="24" height="10" fill="white" opacity="0.7" />
    <ellipse cx="24" cy="34" rx="12" ry="5" fill="white" opacity="0.9" />
  </IconWrapper>
)

export const IconKMS = ({ size }) => (
  <IconWrapper color="#DD344C" size={size}>
    <circle cx="24" cy="19" r="7" fill="none" stroke="white" strokeWidth="3" />
    <rect x="20" y="24" width="8" height="12" rx="2" fill="white" />
    <circle cx="24" cy="30" r="2" fill="#DD344C" />
  </IconWrapper>
)

export const IconCloudWatch = ({ size }) => (
  <IconWrapper color="#E7157B" size={size}>
    <circle cx="24" cy="24" r="13" fill="none" stroke="white" strokeWidth="2.5" />
    <polyline points="14,24 19,19 24,28 29,18 34,24" fill="none" stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
  </IconWrapper>
)

export const IconCloudTrail = ({ size }) => (
  <IconWrapper color="#E7157B" size={size}>
    <path d="M12 36 Q18 20 24 28 Q30 36 36 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="12" cy="36" r="2.5" fill="white" />
    <circle cx="36" cy="12" r="2.5" fill="white" />
    <circle cx="24" cy="28" r="2.5" fill="white" />
  </IconWrapper>
)

export const IconOAuth = ({ size }) => (
  <IconWrapper color="#3F8624" size={size}>
    <circle cx="24" cy="18" r="7" fill="none" stroke="white" strokeWidth="3" />
    <path d="M13 38 C13 30 35 30 35 38" fill="white" />
    <rect x="20" y="22" width="8" height="2" fill="#3F8624" />
  </IconWrapper>
)

export const IconUser = ({ size }) => (
  <IconWrapper color="#232F3E" size={size}>
    <circle cx="24" cy="17" r="7" fill="white" />
    <path d="M10 40 C10 28 38 28 38 40" fill="white" />
  </IconWrapper>
)
