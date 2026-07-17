import { FundType } from '../types';
import {
  Shield,
  TrendingUp,
  Heart,
  HandHeart,
} from 'lucide-react';

export interface FundConfig {
  id: FundType;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  percentage: number;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof Shield;
  href: string;
}

export const FUND_CONFIG: Record<FundType, FundConfig> = {
  stability: {
    id: 'stability',
    label: 'Stability',
    labelAr: 'الاستقرار',
    description: 'Financial obligations & essentials',
    descriptionAr: 'الالتزامات المالية والأساسيات',
    percentage: 33,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: Shield,
    href: '/funds/stability',
  },
  growth: {
    id: 'growth',
    label: 'Growth',
    labelAr: 'النمو',
    description: 'Building wealth & future assets',
    descriptionAr: 'بناء الثروة والأصول المستقبلية',
    percentage: 33,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    icon: TrendingUp,
    href: '/funds/growth',
  },
  life: {
    id: 'life',
    label: 'Life',
    labelAr: 'الحياة',
    description: 'Enjoying life responsibly',
    descriptionAr: 'الاستمتاع بالحياة بمسؤولية',
    percentage: 33,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    icon: Heart,
    href: '/funds/life',
  },
  charity: {
    id: 'charity',
    label: 'Charity',
    labelAr: 'الصدقة',
    description: 'Giving & charitable contributions',
    descriptionAr: 'العطاء والمساهمات الخيرية',
    percentage: 1,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: HandHeart,
    href: '/funds/charity',
  },
};

export const FUND_ORDER: FundType[] = ['stability', 'growth', 'life', 'charity'];
