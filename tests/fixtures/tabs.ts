/**
 * Test fixtures for tab data
 * Used to create predictable test scenarios
 */

export const mockTabs = [
  {
    id: 1,
    title: 'Amazon Product - Wireless Mouse',
    url: 'https://amazon.com/wireless-mouse',
    groupId: -1,
    favIconUrl: 'https://amazon.com/favicon.ico',
  },
  {
    id: 2,
    title: 'eBay Item - Gaming Keyboard',
    url: 'https://ebay.com/gaming-keyboard',
    groupId: -1,
    favIconUrl: 'https://ebay.com/favicon.ico',
  },
  {
    id: 3,
    title: 'GitHub - user/repo',
    url: 'https://github.com/user/repo',
    groupId: -1,
    favIconUrl: 'https://github.com/favicon.ico',
  },
  {
    id: 4,
    title: 'Stack Overflow - How to use TypeScript',
    url: 'https://stackoverflow.com/questions/typescript',
    groupId: -1,
    favIconUrl: 'https://stackoverflow.com/favicon.ico',
  },
  {
    id: 5,
    title: 'Home Depot - Ladder Accessories',
    url: 'https://homedepot.com/ladder-accessories',
    groupId: -1,
    favIconUrl: 'https://homedepot.com/favicon.ico',
  },
  {
    id: 6,
    title: 'VS Code - Extensions',
    url: 'https://code.visualstudio.com/extensions',
    groupId: -1,
    favIconUrl: 'https://code.visualstudio.com/favicon.ico',
  },
];

export const mockGroups = [
  {
    id: 1,
    title: 'Work',
    color: 'blue' as const,
    collapsed: false,
  },
  {
    id: 2,
    title: 'Shopping',
    color: 'green' as const,
    collapsed: false,
  },
];

export const mockTabsWithGroups = [
  {
    id: 7,
    title: 'Gmail - Inbox',
    url: 'https://gmail.com/inbox',
    groupId: 1, // Work group
    favIconUrl: 'https://gmail.com/favicon.ico',
  },
  {
    id: 8,
    title: 'Google Drive - Documents',
    url: 'https://drive.google.com/documents',
    groupId: 1, // Work group
    favIconUrl: 'https://drive.google.com/favicon.ico',
  },
];
