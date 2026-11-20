export const customerTabs = [
  { id: 'menu', to: '/menu', label: '茶单', subpages: ['/brand'] },
  { id: 'recommend', to: '/ai-recommend', label: '随心配', subpages: [] },
  { id: 'me', to: '/me', label: '我的', subpages: ['/orders', '/personality', '/project', '/admin'] },
] as const;

export function getCustomerNavigation(pathname: string) {
  const path = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const parent = customerTabs.find((tab) => tab.subpages.some((subpage) => subpage === path));
  const current = parent ?? (path === '/' ? customerTabs[0] : customerTabs.find((tab) => tab.to === path));
  return { current, parent };
}
