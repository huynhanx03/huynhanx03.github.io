import {
  siApachekafka, siCplusplus, siClickhouse, siDocker, siElasticsearch, siFastapi, siGit, siGin, siGo,
  siMongodb, siMysql, siOpenjdk, siPostgresql, siRedis, siRust, siSpringboot,
} from 'simple-icons';
import type { SimpleIcon } from 'simple-icons';
import type { SkillCategory } from '../data/types';

const icons: Record<string, SimpleIcon> = {
  Go: siGo, Rust: siRust, Java: siOpenjdk, 'C/C++': siCplusplus, Gin: siGin, 'Spring Boot': siSpringboot,
  MySQL: siMysql, PostgreSQL: siPostgresql, ClickHouse: siClickhouse, MongoDB: siMongodb,
  Redis: siRedis, Elasticsearch: siElasticsearch, RESTful: siFastapi, Kafka: siApachekafka,
  Git: siGit, Docker: siDocker,
};

export function flattenSkills(categories: SkillCategory[]): string[] {
  return [...new Set(categories.flatMap((category) => [
    ...(category.skills ?? []),
    ...(category.subcategories?.flatMap((subcategory) => subcategory.skills) ?? []),
  ]))];
}

export function getSkillIcon(name: string): SimpleIcon | undefined {
  return icons[name];
}
