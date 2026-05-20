import { useMemo, useState } from 'react';

type SettingsParentTab = 'site' | 'system' | 'traders' | 'customers';

type SettingsChildTab =
  | 'language'
  | 'themeColor'
  | 'seasons'
  | 'fields'
  | 'traderCategories'
  | 'customerCategories';

interface SettingsPageProps {
  userRole: string;
}

interface ParentTab {
  key: SettingsParentTab;
  label: string;
  children: Array<{ key: SettingsChildTab; label: string }>;
}

function SettingsPage({ userRole }: SettingsPageProps): JSX.Element {
  const isSimpleWorker = userRole === 'WORKER';

  const parentTabs = useMemo<ParentTab[]>(() => {
    if (isSimpleWorker) {
      return [
        {
          key: 'site',
          label: 'הגדרות אתר',
          children: [
            { key: 'language', label: 'שפה' },
            { key: 'themeColor', label: 'צבע' },
          ],
        },
      ];
    }

    return [
      {
        key: 'site',
        label: 'הגדרות אתר',
        children: [
          { key: 'language', label: 'שפה' },
          { key: 'themeColor', label: 'צבע' },
        ],
      },
      {
        key: 'system',
        label: 'הגדרות מערכת',
        children: [
          { key: 'seasons', label: 'עונות' },
          { key: 'fields', label: 'שדות' },
        ],
      },
      {
        key: 'traders',
        label: 'סוחרים',
        children: [{ key: 'traderCategories', label: 'קטגוריות סוחרים' }],
      },
      {
        key: 'customers',
        label: 'לקוחות',
        children: [{ key: 'customerCategories', label: 'קטגוריות לקוחות' }],
      },
    ];
  }, [isSimpleWorker]);

  const [activeParent, setActiveParent] = useState<SettingsParentTab>(parentTabs[0].key);
  const activeParentData = parentTabs.find((tab) => tab.key === activeParent) ?? parentTabs[0];
  const [activeChild, setActiveChild] = useState<SettingsChildTab>(activeParentData.children[0].key);

  const handleSelectParent = (parent: ParentTab): void => {
    setActiveParent(parent.key);
    setActiveChild(parent.children[0].key);
  };

  return (
    <section className="settings-page" dir="rtl">
      <aside className="settings-sidebar">
        {parentTabs.map((parent) => (
          <button
            key={parent.key}
            type="button"
            className={parent.key === activeParent ? 'is-active' : ''}
            onClick={() => handleSelectParent(parent)}
          >
            {parent.label}
          </button>
        ))}
      </aside>

      <main className="settings-content">
        <h2>{activeParentData.label}</h2>

        <nav className="settings-subtabs" aria-label="Settings sub tabs">
          {activeParentData.children.map((child) => (
            <button
              key={child.key}
              type="button"
              className={child.key === activeChild ? 'is-active' : ''}
              onClick={() => setActiveChild(child.key)}
            >
              {child.label}
            </button>
          ))}
        </nav>

        <div className="settings-panel">
          <p>תוכן: {activeParentData.children.find((child) => child.key === activeChild)?.label}</p>
        </div>
      </main>
    </section>
  );
}

export default SettingsPage;