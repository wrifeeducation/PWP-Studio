/**
 * WF-056 — Step Wizard Indicator
 * Reusable step progress indicator for multi-step forms.
 */

interface StepWizardProps {
  steps: string[]
  currentStep: number // 0-indexed
}

export function StepWizard({ steps, currentStep }: StepWizardProps) {
  return (
    <div className="flex items-center gap-0" data-testid="step-wizard" role="navigation" aria-label="Progress">
      {steps.map((label, i) => {
        const isComplete = i < currentStep
        const isActive = i === currentStep

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: isComplete
                    ? '#16A34A'
                    : isActive
                    ? 'var(--color-brand-primary)'
                    : 'var(--color-border)',
                  color: isComplete || isActive ? '#fff' : 'var(--color-text-muted)',
                }}
                aria-current={isActive ? 'step' : undefined}
              >
                {isComplete ? '✓' : i + 1}
              </div>
              <span
                className="text-xs mt-1 text-center max-w-[72px] leading-tight"
                style={{ color: isActive ? 'var(--color-brand-primary)' : 'var(--color-text-muted)' }}
              >
                {label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className="h-0.5 w-10 mx-1 mb-5 flex-shrink-0"
                style={{ backgroundColor: i < currentStep ? '#16A34A' : 'var(--color-border)' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
