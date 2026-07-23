import {
  Home, Landmark, Zap, Wifi, Car, ShoppingCart, Utensils, Building2, Briefcase,
  GraduationCap, TrendingUp, PiggyBank, Plane, Shirt, Gamepad2, Gift, Users,
  Sparkles, HeartPulse, HandHeart, Tag, type LucideIcon,
} from 'lucide-react';

/**
 * Categories are freeform user strings, so their icon is inferred from keywords rather than a
 * fixed enum. First keyword hit wins; anything unmatched falls back to a neutral tag. Purely
 * cosmetic — a wrong guess costs nothing, and the label is always shown alongside.
 */
const RULES: [RegExp, LucideIcon][] = [
  [/rent|housing|mortgage|home|house/i, Home],
  [/loan|debt|installment|credit/i, Landmark],
  [/util|electric|water|gas bill|power/i, Zap],
  [/internet|sim|phone|mobile|data|wifi/i, Wifi],
  [/transport|car|fuel|petrol|taxi|uber|bus|metro/i, Car],
  [/grocer|food|market|supermarket/i, ShoppingCart],
  [/restaurant|dining|cafe|coffee|takeaway|meal/i, Utensils],
  [/real estate|property|land/i, Building2],
  [/business|work|office|startup/i, Briefcase],
  [/educat|school|course|tuition|book|study/i, GraduationCap],
  [/invest|stock|crypto|fund|portfolio/i, TrendingUp],
  [/retire|pension|saving/i, PiggyBank],
  [/travel|trip|flight|hotel|vacation|holiday/i, Plane],
  [/cloth|apparel|fashion|shoes/i, Shirt],
  [/entertain|movie|game|gaming|music|subscription|netflix/i, Gamepad2],
  [/gift|present/i, Gift],
  [/family|kids|children/i, Users],
  [/friend|social/i, Users],
  [/life ?style|leisure|personal|misc/i, Sparkles],
  [/health|medical|doctor|pharmacy|clinic|hospital/i, HeartPulse],
  [/zakat|sadaqah|charity|donat|giving/i, HandHeart],
];

export function iconForCategory(name: string): LucideIcon {
  for (const [pattern, icon] of RULES) {
    if (pattern.test(name)) return icon;
  }
  return Tag;
}
