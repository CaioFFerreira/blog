const labels: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  devops: 'DevOps',
  arquitetura: 'Arquitetura Front-end',
  'boas-praticas': 'Boas práticas',
  'decisoes-tecnicas': 'Decisões técnicas',
}

export function topicLabel(folder: string): string {
  return labels[folder] ?? folder.replace(/[-_]+/g, ' ').replace(/\b\p{L}/gu, letter => letter.toUpperCase())
}
