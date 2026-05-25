import React from 'react';

type SettingsInnerTemplateProps = {
  filters?: React.ReactNode;
  toolbar?: React.ReactNode;
  info?: React.ReactNode;
  loadingMessage?: string | null;
  errorMessage?: string | null;
  emptyMessage?: string | null;
  children?: React.ReactNode;
};

const SettingsInnerTemplate: React.FC<SettingsInnerTemplateProps> = ({
  filters,
  toolbar,
  info,
  loadingMessage,
  errorMessage,
  emptyMessage,
  children,
}) => {
  return (
    <div className="seasons-manager settings-inner-template">
      {filters}
      {toolbar}
      {info}
      {loadingMessage ? <p className="seasons-manager__state">{loadingMessage}</p> : null}
      {errorMessage ? <p className="seasons-manager__error">{errorMessage}</p> : null}
      {emptyMessage ? <div className="seasons-manager__empty">{emptyMessage}</div> : null}
      {children}
    </div>
  );
};

export default SettingsInnerTemplate;
