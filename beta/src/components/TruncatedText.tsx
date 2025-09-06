import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface TruncatedTextProps {
  text: string;
  maxLength: number;
  className?: string;
  showIcon?: boolean;
  expandText?: string;
  collapseText?: string;
}

const TruncatedText: React.FC<TruncatedTextProps> = ({
  text,
  maxLength,
  className = '',
  showIcon = true,
  expandText = 'Show more',
  collapseText = 'Show less'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const shouldTruncate = text.length > maxLength;
  const displayText = isExpanded || !shouldTruncate ? text : text.substring(0, maxLength);
  
  if (!shouldTruncate) {
    return <span className={className}>{text}</span>;
  }

  return (
    <div className={className}>
      <span>{displayText}</span>
      {!isExpanded && (
        <>
          <span className="text-gray-500">...</span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-1 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
          >
            {expandText}
            {showIcon && <ChevronDown className="h-4 w-4" />}
          </button>
        </>
      )}
      {isExpanded && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-2 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
        >
          {collapseText}
          {showIcon && <ChevronUp className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
};

export default TruncatedText;
