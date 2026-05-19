export type NavItem = {
  id: string;
  label: string;
  href?: string;
  badge?: number;
  icon?: string;
};

export type SidebarSection = {
  id: string;
  title: string;
  badge?: number;
  href?: string;
  icon?: string;
  items: NavItem[];
};
