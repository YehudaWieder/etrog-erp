export type NavItem = {
  id: string;
  label: string;
  href?: string;
  badge?: number;
};

export type SidebarSection = {
  id: string;
  title: string;
  href?: string;
  items: NavItem[];
};
