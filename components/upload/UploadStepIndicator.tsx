/**
 * Upload Step Indicator Component
 * Shared step progress indicator for all upload types
 */

interface UploadStepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4;
  stepLabels: {
    step1: string;
    step2: string;
    step3: string;
    step4?: string;
  };
}

export function UploadStepIndicator({ currentStep, stepLabels }: UploadStepIndicatorProps) {
  const steps = [
    { number: 1, label: stepLabels.step1 },
    { number: 2, label: stepLabels.step2 },
    { number: 3, label: stepLabels.step3 },
    ...(stepLabels.step4 ? [{ number: 4, label: stepLabels.step4 }] : []),
  ];

  return (
    <div className="flex items-center justify-center gap-4 mb-8">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center font-bold font-['Outfit'] text-lg border-[3px] ${
                currentStep >= step.number
                  ? 'bg-[#EF4330] text-white border-white'
                  : 'bg-white text-black border-black'
              } shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]`}
            >
              {step.number}
            </div>
            <span
              className={`text-base font-semibold font-['Outfit'] ${
                currentStep >= step.number ? 'text-white' : 'text-white/70'
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`w-16 h-1 ${currentStep > step.number ? 'bg-[#EF4330]' : 'bg-white/30'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
