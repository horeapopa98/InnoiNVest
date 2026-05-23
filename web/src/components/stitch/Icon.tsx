/**
 * Icon wrapper that maps the Material Symbols Outlined glyph names used
 * during the Stitch port to their Lucide React equivalents. The wrapper
 * preserves the existing call-site shape (`<Icon name="search" />`) so
 * the port doesn't need to know which icon library is in play, while
 * the underlying components are tree-shakeable Lucide SVGs — no web
 * font, no extra network request, ~20KB total bundle for the full set
 * vs ~200KB for the Material Symbols variable font.
 */

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Bell,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  CloudDownload,
  Download,
  FilePenLine,
  FileText,
  GraduationCap,
  HeartPulse,
  IdCard,
  Landmark,
  LineChart,
  Map as MapIcon,
  MapPin,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  Search,
  Settings,
  Share2,
  Stethoscope,
  TramFront,
  TreePine,
  TrendingDown,
  TrendingUp,
  Users,
  Wifi,
  Zap,
} from "lucide-react";

/**
 * Material-Symbols-name → Lucide component. Only the icons actually
 * referenced by the ported screens are listed; add to this map when a
 * new icon shows up rather than importing across files ad-hoc.
 */
const ICON_MAP = {
  search: Search,
  notifications: Bell,
  settings: Settings,
  location_on: MapPin,
  cloud_download: CloudDownload,
  map: MapIcon,
  trending_up: TrendingUp,
  trending_down: TrendingDown,
  trending_flat: Minus,
  home_health: HeartPulse,
  groups: Users,
  domain: Building2,
  train: TramFront,
  bolt: Zap,
  medical_services: Stethoscope,
  badge: IdCard,
  school: GraduationCap,
  corporate_fare: Building2,
  rocket_launch: Rocket,
  park: TreePine,
  account_balance: Landmark,
  wifi: Wifi,
  arrow_forward: ArrowRight,
  arrow_back: ArrowLeft,
  arrow_upward: ArrowUp,
  arrow_downward: ArrowDown,
  chevron_right: ChevronRight,
  schedule: Clock,
  refresh: RefreshCw,
  save: Save,
  share: Share2,
  download: Download,
  menu_book: BookOpen,
  summarize: FileText,
  monitoring: LineChart,
  warning: AlertTriangle,
  check_circle: CheckCircle2,
  edit: Pencil,
  edit_note: FilePenLine,
  add: Plus,
  horizontal_rule: Minus,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICON_MAP;

type Props = {
  name: IconName;
  /** Pixel size. Defaults to 20 (≈ Material's default 24 minus optical adjustment for Lucide's 2px stroke). */
  size?: number;
  /** Stroke width override. Lucide defaults to 2; bump to 2.25 for chunkier display sizes. */
  strokeWidth?: number;
  className?: string;
};

export function Icon({
  name,
  size = 20,
  strokeWidth = 2,
  className,
}: Props) {
  const Component = ICON_MAP[name];
  return (
    <Component
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
    />
  );
}
