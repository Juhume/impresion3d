/**
 * Componente Spinner reutilizable
 * Usado para estados de carga consistentes en toda la app
 */

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'gray';
  className?: string;
}

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 32,
};

const colorMap = {
  primary: '#2563eb',
  white: '#ffffff',
  gray: '#9ca3af',
};

export default function Spinner({ size = 'md', color = 'primary', className = '' }: SpinnerProps) {
  const dimension = sizeMap[size];
  const strokeColor = colorMap[color];

  return (
    <svg
      className={`spinner ${className}`}
      width={dimension}
      height={dimension}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="status"
      aria-label="Cargando"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={strokeColor}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke={strokeColor}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <style>{`
        .spinner {
          animation: spinner-rotate 0.8s linear infinite;
        }
        @keyframes spinner-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </svg>
  );
}

// Variante con texto
export function SpinnerWithText({
  text = 'Cargando...',
  size = 'md',
  color = 'primary'
}: SpinnerProps & { text?: string }) {
  return (
    <div className="spinner-container">
      <Spinner size={size} color={color} />
      <span className="spinner-text">{text}</span>
      <style>{`
        .spinner-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .spinner-text {
          font-size: 0.9rem;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}
