// components/StatusMessage.jsx
import { Info, AlertTriangle } from 'lucide-react';

interface StatusMessageProps {
  text: string;
  type: 'success' | 'error';
}

const StatusMessage: React.FC<StatusMessageProps> = ({ text, type }) => {
  return (
    <div className={`mb-6 p-4 rounded-xl shadow-sm ${
      type === 'success' 
        ? 'bg-emerald-50 border border-emerald-200' 
        : 'bg-red-50 border border-red-200'
    }`}>
      <div className="flex items-start">
        {type === 'success' ? (
          <Info className="h-5 w-5 text-emerald-500 mr-3 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
        )}
        <p className={type === 'success' ? 'text-emerald-700' : 'text-red-700'}>
          {text}
        </p>
      </div>
    </div>
  );
};

export default StatusMessage;