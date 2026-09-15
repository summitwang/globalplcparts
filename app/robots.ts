import type { MetadataRoute } from 'next';
import { robots as policy } from '@/lib/seo-core';
export default function robots(): MetadataRoute.Robots { return policy(); }
