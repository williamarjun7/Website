import React from 'react';

interface ProgressStepsProps {
    step: number;
    steps: string[];
}

const ProgressSteps: React.FC<ProgressStepsProps> = ({ step, steps }) => (
    <div className="flex items-center justify-center mb-12">
        <div className="flex items-center space-x-4">
            {steps.map((label, idx) => {
                const num = idx + 1;
                const isActive = step >= num;
                return (
                    <React.Fragment key={num}>
                        {idx > 0 && (
                            <div className={`w-12 h-0.5 ${step >= num ? 'bg-primary' : 'bg-gray-300'}`} />
                        )}
                        <div className={`flex items-center ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isActive ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                                {num}
                            </div>
                            <span className="ml-2 font-medium hidden sm:inline">{label}</span>
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    </div>
);

export default ProgressSteps;
