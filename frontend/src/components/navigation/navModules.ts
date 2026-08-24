import type { NavItem, SidebarSection } from '../../types/navigation';
import type { AppModule } from '../../utils/activeModule';

const NAV_ITEM_MODULE: Record<string, AppModule> = {
  harvest: 'italy',
  shipments: 'italy',
  partners: 'italy',
  traders: 'italy',
  customers: 'italy',
  payments: 'italy',
  workers: 'israel',
  'israel-shipments': 'israel',
  'israel-inventory': 'israel',
  'israel-payments': 'israel',
};

export function filterNavByModule(items: NavItem[], module: AppModule): NavItem[] {
  return items.filter((item) => {
    const itemModule = NAV_ITEM_MODULE[item.id];
    return !itemModule || itemModule === module;
  });
}

const SETTINGS_SECTION_MODULE: Record<string, AppModule> = {
  traders: 'italy',
  customers: 'italy',
  israelHarvest: 'israel',
};

const SYSTEM_SECTION_ITEM_ALLOWLIST: Record<AppModule, string[] | null> = {
  italy: ['seasons', 'fields', 'cartons', 'pricing', 'defaultTraderCategories'],
  israel: ['seasons', 'harvestCartonCapacity'],
};

export function filterSidebarByModule(sections: SidebarSection[], module: AppModule): SidebarSection[] {
  return sections
    .filter((section) => {
      const sectionModule = SETTINGS_SECTION_MODULE[section.id];
      return !sectionModule || sectionModule === module;
    })
    .map((section) => {
      if (section.id !== 'system') {
        return section;
      }

      const allowlist = SYSTEM_SECTION_ITEM_ALLOWLIST[module];
      if (!allowlist) {
        return section;
      }

      return {
        ...section,
        items: section.items.filter((item) => allowlist.includes(item.id)),
      };
    });
}
