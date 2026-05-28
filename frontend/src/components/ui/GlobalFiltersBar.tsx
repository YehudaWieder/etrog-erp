import React from 'react';

export type GlobalFilterOption = {
  value: string;
  label: string;
  group?: string;
};

export type GlobalFilterControl = {
  id: string;
  label: string;
  value: string;
  options: GlobalFilterOption[];
  onChange: (value: string) => void;
};

type GlobalFiltersBarProps = {
  controls: GlobalFilterControl[];
  className?: string;
  direction?: 'rtl' | 'ltr';
  actions?: React.ReactNode;
};

export const GlobalFiltersBar: React.FC<GlobalFiltersBarProps> = ({
  controls,
  className,
  direction = 'rtl',
  actions,
}) => {
  const containerClassName = ['global-filters-bar', className].filter(Boolean).join(' ');

  return (
    <div className={containerClassName} dir={direction}>
      {controls.map((control) => (
        <div className="global-filters-bar__field" key={control.id}>
          <label className="customer-categories-manager__label" htmlFor={control.id}>
            {control.label}
          </label>
          <select
            id={control.id}
            className="seasons-manager__year-input global-filters-bar__select"
            value={control.value}
            onChange={(event) => control.onChange(event.target.value)}
          >
            {(() => {
              const hasGroupedOptions = control.options.some((option) => Boolean(option.group));

              if (!hasGroupedOptions) {
                return control.options.map((option) => (
                  <option key={`${control.id}-${option.value || 'empty'}`} value={option.value}>
                    {option.label}
                  </option>
                ));
              }

              const ungroupedOptions = control.options.filter((option) => !option.group);
              const groupedOptionsMap = new Map<string, GlobalFilterOption[]>();

              for (const option of control.options) {
                if (!option.group) {
                  continue;
                }

                if (!groupedOptionsMap.has(option.group)) {
                  groupedOptionsMap.set(option.group, []);
                }

                groupedOptionsMap.get(option.group)!.push(option);
              }

              return [
                ...ungroupedOptions.map((option) => (
                  <option key={`${control.id}-${option.value || 'empty'}`} value={option.value}>
                    {option.label}
                  </option>
                )),
                ...Array.from(groupedOptionsMap.entries()).map(([groupLabel, groupedOptions]) => (
                  <optgroup key={`${control.id}-group-${groupLabel}`} label={groupLabel}>
                    {groupedOptions.map((option) => (
                      <option key={`${control.id}-${option.value || 'empty'}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                )),
              ];
            })()}
          </select>
        </div>
      ))}
      {actions ? <div className="global-filters-bar__actions">{actions}</div> : null}
    </div>
  );
};
