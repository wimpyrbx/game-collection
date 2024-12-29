import { IconType } from 'react-icons'

export interface PageHeaderBigNumberProps {
  icon: IconType
  number: number
  text: string
  suffix?: React.ReactNode
}

export function PageHeader({ children, bgColor = 'gray-800' }: { children: React.ReactNode, bgColor?: string }) {
  return (
    <div className={`flex items-center justify-between p-4 mb-4 rounded-lg ${bgColor !== 'none' ? `bg-${bgColor}` : ''}`}>
      {children}
    </div>
  )
}

export function PageHeaderTextGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      {children}
    </div>
  )
}

export function PageHeaderText({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-2xl font-bold text-gray-200">
      {children}
    </h1>
  )
}

export function PageHeaderSubText({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-gray-400">
      {children}
    </p>
  )
}

export function PageHeaderBigNumber({ icon: Icon, number, text, suffix }: PageHeaderBigNumberProps) {
  return (
    <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-4 w-[180px]">
      <div className="flex items-center justify-center w-10 h-10 bg-gray-700 rounded-lg">
        <Icon className="w-5 h-5 text-gray-400" />
      </div>
      <div>
        <div className="text-xl font-bold text-gray-200 flex items-center">
          {number.toLocaleString()}
          {suffix && (
            <div key={`suffix-${suffix}`} className="animate-suffix-bounce">
              {suffix}
            </div>
          )}
        </div>
        <div className="text-xs text-gray-400">{text}</div>
      </div>
      <style>
        {`
          @keyframes suffix-bounce {
            0% { opacity: 0; transform: scale(0.3); }
            70% { transform: scale(1.1); }
            100% { opacity: 1; transform: scale(1); }
          }
          .animate-suffix-bounce {
            animation: suffix-bounce 0.5s ease-out 1s forwards;
            opacity: 0;
          }
        `}
      </style>
    </div>
  )
} 