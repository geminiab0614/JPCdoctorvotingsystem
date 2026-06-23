export type Role = 'attending' | 'resident' | 'admin';

export interface Doctor {
  id: string;
  name: string;
  role: 'attending' | 'resident';
  password?: string;
  isActive: boolean;
}

export interface Vote {
  id?: string;
  voterName: string;
  voterRole: 'attending' | 'resident';
  targetNames: string[];
  year: number;
  month: number;
  timestamp: number;
}

export type ThemeOption = 'blue' | 'orange' | 'green' | 'purple' | 'gray';

export interface DateConfig {
  year: number;
  month: number;
  day: number;
}

export interface SystemConfig {
  currentYear: number;
  currentMonth: number;
  adminPassword?: string;
  theme: ThemeOption;
  votingStart: DateConfig;
  votingEnd: DateConfig;
}

export const ROLES = {
  ATTENDING: 'attending' as const,
  RESIDENT: 'resident' as const,
  ADMIN: 'admin' as const,
};

export const ROLE_LABELS = {
  [ROLES.ATTENDING]: '主治醫師',
  [ROLES.RESIDENT]: '住院醫師',
};

export const THEMES: Record<ThemeOption, { name: string, bgGradient: string, primary: string, primaryHover: string, text: string, border: string, lightBg: string }> = {
  blue: {
    name: '經典藍 (預設)',
    bgGradient: 'from-blue-50 to-blue-100',
    primary: 'bg-blue-600',
    primaryHover: 'hover:bg-blue-700',
    text: 'text-blue-700',
    border: 'border-blue-200',
    lightBg: 'bg-blue-50'
  },
  orange: {
    name: '溫暖橘',
    bgGradient: 'from-orange-50 to-orange-100',
    primary: 'bg-orange-600',
    primaryHover: 'hover:bg-orange-700',
    text: 'text-orange-700',
    border: 'border-orange-200',
    lightBg: 'bg-orange-50'
  },
  green: {
    name: '自然綠',
    bgGradient: 'from-emerald-50 to-emerald-100',
    primary: 'bg-emerald-600',
    primaryHover: 'hover:bg-emerald-700',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    lightBg: 'bg-emerald-50'
  },
  purple: {
    name: '高雅紫',
    bgGradient: 'from-violet-50 to-violet-100',
    primary: 'bg-violet-600',
    primaryHover: 'hover:bg-violet-700',
    text: 'text-violet-700',
    border: 'border-violet-200',
    lightBg: 'bg-violet-50'
  },
  gray: {
    name: '現代灰',
    bgGradient: 'from-slate-100 to-slate-200',
    primary: 'bg-slate-700',
    primaryHover: 'hover:bg-slate-800',
    text: 'text-slate-800',
    border: 'border-slate-300',
    lightBg: 'bg-slate-100'
  }
};
