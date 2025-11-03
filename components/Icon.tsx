"use client";

import {
  Users,
  UserCheck,
  Send,
  Settings,
  LogOut,
  BarChart3,
  Bell,
  Search,
  Menu,
  X,
  ChevronRight,
  Loader,
  Check,
  AlertCircle,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Trash2,
  ChevronDown,
  Plus,
  Calendar,
  Activity,
  Zap,
  Grid3x3,
  Book,
  HelpCircle,
  ArrowRight,
  Star,
  BarChart2,
} from "lucide-react";

// Map of icon names to Lucide components
export const IconMap = {
  users: Users,
  userCheck: UserCheck,
  send: Send,
  settings: Settings,
  logout: LogOut,
  chart: BarChart3,
  bell: Bell,
  search: Search,
  menu: Menu,
  close: X,
  chevronRight: ChevronRight,
  loader: Loader,
  check: Check,
  alert: AlertCircle,
  mail: Mail,
  lock: Lock,
  eye: Eye,
  eyeOff: EyeOff,
  copy: Copy,
  externalLink: ExternalLink,
  trash: Trash2,
  chevronDown: ChevronDown,
  plus: Plus,
  calendar: Calendar,
  activity: Activity,
  zap: Zap,
  grid: Grid3x3,
  book: Book,
  help: HelpCircle,
  arrowRight: ArrowRight,
  star: Star,
  barChart: BarChart2,
};

export type IconName = keyof typeof IconMap;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function Icon({
  name,
  size = 20,
  className = "",
  strokeWidth = 2,
}: IconProps) {
  const Component = IconMap[name];

  if (!Component) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return (
    <Component size={size} className={className} strokeWidth={strokeWidth} />
  );
}

// Specific icon components for common use cases
export function LoadingIcon({ size = 20, className = "" }) {
  return (
    <Loader
      size={size}
      className={`animate-spin ${className}`}
      strokeWidth={2}
    />
  );
}

export function CheckIcon({ size = 20, className = "" }) {
  return <Check size={size} className={className} strokeWidth={2} />;
}

export function AlertIcon({ size = 20, className = "" }) {
  return <AlertCircle size={size} className={className} strokeWidth={2} />;
}

export function ChevronRightIcon({ size = 20, className = "" }) {
  return <ChevronRight size={size} className={className} strokeWidth={2} />;
}

export function PlusIcon({ size = 20, className = "" }) {
  return <Plus size={size} className={className} strokeWidth={2} />;
}

export function TrashIcon({ size = 20, className = "" }) {
  return <Trash2 size={size} className={className} strokeWidth={2} />;
}

export function CopyIcon({ size = 20, className = "" }) {
  return <Copy size={size} className={className} strokeWidth={2} />;
}

export function ChevronDownIcon({ size = 20, className = "" }) {
  return <ChevronDown size={size} className={className} strokeWidth={2} />;
}
