import type { SiteConfig } from '../data/types';
import type { Locale } from './config';

export function localizedSite(site: SiteConfig, locale: Locale): SiteConfig {
  if (locale === 'en') return site;

  return {
    ...site,
    seo: {
      ...site.seo,
      title: 'Huỳnh Mai Cao Nhân | Kỹ sư phần mềm',
      description: 'Kỹ sư phần mềm tập trung vào backend, hệ thống phân tán, microservices và các ứng dụng hiệu năng cao.',
    },
  };
}
