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
  href?: string;
  icon?: string;
  items: NavItem[];
};
