import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  HomeIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

const menuItems = [
  {
    name: 'ホーム',
    href: '/',
    icon: HomeIcon,
    showFor: ['管理者', '営業', '業務', 'アルバイト']
  },
  {
    name: 'みんなの予定',
    href: '/schedules',
    icon: CalendarIcon,
    showFor: ['管理者', '営業', '業務', 'アルバイト']
  },
  {
    name: '勤務表',
    href: '/attendance',
    icon: ClipboardDocumentListIcon,
    showFor: ['管理者', '営業', '業務', 'アルバイト']
  },
  {
    name: 'ユーザー管理',
    href: '/admin/users',
    icon: UserGroupIcon,
    showFor: ['管理者']
  },
  {
    name: 'アカウント発行',
    href: '/account-issuance',
    icon: Cog6ToothIcon,
    showFor: ['管理者']
  }
]; 