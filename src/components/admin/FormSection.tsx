import type { ReactNode } from 'react';

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

const FormSection = ({ title, description, children, className = '', action }: FormSectionProps) => (
  <div className={`bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100 ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" />
        <div className="min-w-0">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</h3>
          {description && <p className="text-xs text-gray-400 mt-0.5 truncate">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
    {children}
  </div>
);

export default FormSection;
