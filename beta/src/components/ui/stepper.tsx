import React from 'react';
import { Check, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepperStep {
  stepNumber: number;
  title: string;
  description: string;
  status: 'completed' | 'active' | 'inactive';
  icon?: 'check' | 'square';
  iconColor?: string;
}

export interface StepperProps {
  steps: StepperStep[];
  currentStep?: number;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  style?: {
    layout?: 'horizontal' | 'vertical';
    background?: string;
    borderRadius?: string;
    padding?: string;
    shadow?: string;
    spacing?: string;
    connectorColor?: string;
    activeConnectorColor?: string;
    inactiveConnectorColor?: string;
    fontFamily?: string;
    fontWeight?: string;
    titleColor?: string;
    subtitleColor?: string;
  };
}

const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  orientation = 'horizontal',
  className,
  style = {}
}) => {
  const defaultStyle = {
    layout: 'horizontal',
    background: '#ffffff',
    borderRadius: '16px',
    padding: '16px',
    shadow: '0 4px 10px rgba(0, 0, 0, 0.05)',
    spacing: '24px',
    connectorColor: '#000000',
    activeConnectorColor: '#3b82f6',
    inactiveConnectorColor: '#9ca3af',
    fontFamily: 'Inter, sans-serif',
    fontWeight: '600',
    titleColor: '#111827',
    subtitleColor: '#6b7280',
    ...style
  };

  const getStepStatus = (step: StepperStep, index: number) => {
    if (currentStep !== undefined) {
      if (index < currentStep) return 'completed';
      if (index === currentStep) return 'active';
      return 'inactive';
    }
    return step.status;
  };

  const getIcon = (step: StepperStep, status: string) => {
    if (status === 'completed') {
      return <Check className="w-4 h-4" />;
    }
    return <Square className="w-4 h-4" />;
  };

  const getStepBackgroundColor = (status: string) => {
    switch (status) {
      case 'completed':
        return defaultStyle.activeConnectorColor;
      case 'active':
        return defaultStyle.activeConnectorColor;
      default:
        return 'transparent';
    }
  };

  const getStepBorderColor = (status: string) => {
    switch (status) {
      case 'completed':
        return defaultStyle.activeConnectorColor;
      case 'active':
        return defaultStyle.activeConnectorColor;
      default:
        return defaultStyle.inactiveConnectorColor;
    }
  };

  const getStepTextColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#ffffff';
      case 'active':
        return '#ffffff';
      default:
        return defaultStyle.inactiveConnectorColor;
    }
  };

  const getConnectorColor = (currentStatus: string, nextStatus: string) => {
    if (currentStatus === 'completed') {
      return defaultStyle.activeConnectorColor;
    }
    return defaultStyle.inactiveConnectorColor;
  };

  if (orientation === 'vertical') {
    return (
      <div
        className={cn('flex flex-col', className)}
        style={{
          background: defaultStyle.background,
          borderRadius: defaultStyle.borderRadius,
          padding: defaultStyle.padding,
          boxShadow: defaultStyle.shadow,
          fontFamily: defaultStyle.fontFamily,
        }}
      >
        {steps.map((step, index) => {
          const status = getStepStatus(step, index);
          const isLast = index === steps.length - 1;
          
          return (
            <div key={step.stepNumber} className="flex items-start">
              <div className="flex flex-col items-center">
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors"
                  style={{
                    backgroundColor: getStepBackgroundColor(status),
                    borderColor: getStepBorderColor(status),
                    color: getStepTextColor(status),
                  }}
                >
                  {status === 'completed' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-semibold">{step.stepNumber}</span>
                  )}
                </div>
                {!isLast && (
                  <div
                    className="w-0.5 h-16 mt-2"
                    style={{
                      backgroundColor: getConnectorColor(status, getStepStatus(steps[index + 1], index + 1)),
                    }}
                  />
                )}
              </div>
              <div className="ml-4 pb-8">
                <h3
                  className="text-lg font-semibold mb-1"
                  style={{ 
                    color: status === 'inactive' ? defaultStyle.inactiveConnectorColor : defaultStyle.titleColor 
                  }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-sm"
                  style={{ 
                    color: status === 'inactive' ? defaultStyle.inactiveConnectorColor : defaultStyle.subtitleColor 
                  }}
                >
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn('flex items-center', className)}
      style={{
        background: defaultStyle.background,
        borderRadius: defaultStyle.borderRadius,
        padding: defaultStyle.padding,
        boxShadow: defaultStyle.shadow,
        fontFamily: defaultStyle.fontFamily,
      }}
    >
      {steps.map((step, index) => {
        const status = getStepStatus(step, index);
        const isLast = index === steps.length - 1;
        
        return (
          <React.Fragment key={step.stepNumber}>
            <div className="flex flex-col items-center flex-1">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors"
                style={{
                  backgroundColor: getStepBackgroundColor(status),
                  borderColor: getStepBorderColor(status),
                  color: getStepTextColor(status),
                }}
              >
                {status === 'completed' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-semibold">{step.stepNumber}</span>
                )}
              </div>
              <div className="mt-3 text-center">
                <h3
                  className="text-sm font-semibold mb-1"
                  style={{ 
                    color: status === 'inactive' ? defaultStyle.inactiveConnectorColor : defaultStyle.titleColor,
                    fontWeight: defaultStyle.fontWeight 
                  }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-xs leading-relaxed"
                  style={{ 
                    color: status === 'inactive' ? defaultStyle.inactiveConnectorColor : defaultStyle.subtitleColor 
                  }}
                >
                  {step.description}
                </p>
              </div>
            </div>
            {!isLast && (
              <div
                className="flex-1 h-0.5 mx-4"
                style={{
                  backgroundColor: getConnectorColor(status, getStepStatus(steps[index + 1], index + 1)),
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Stepper;