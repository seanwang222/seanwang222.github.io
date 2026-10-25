import { getCollection, type CollectionEntry } from 'astro:content';
import { readingTime } from './notes';

export type RadarNote = CollectionEntry<'radar'>;

export const PARTS = [
  { id: 'Part I', cn: '基础与雷达方程', en: 'Foundations' },
  { id: 'Part II', cn: '信号、波形与脉冲压缩', en: 'Signals & Waveforms' },
  { id: 'Part III', cn: '传播、杂波与多普勒', en: 'Propagation & Clutter' },
  { id: 'Part IV', cn: '检测统计', en: 'Detection Theory' },
  { id: 'Part V', cn: '散射、阵列、跟踪与成像', en: 'Systems & Imaging' },
] as const;

export function partLabel(part: string): string {
  return PARTS.find((entry) => entry.id === part)?.cn ?? part;
}

export function chapterSlug(chapter: number): string {
  return String(chapter).padStart(2, '0');
}

export function chapterHref(chapter: number): string {
  return `/radar/chapter/${chapterSlug(chapter)}/`;
}

export function radarHref(note: RadarNote): string {
  return note.data.kind === 'chapter'
    ? chapterHref(note.data.chapter)
    : `/radar/learn/${note.id}/`;
}

export function radarMinutes(note: RadarNote): number {
  return readingTime(note.body ?? '');
}

export async function getRadarNotes(): Promise<RadarNote[]> {
  const notes = await getCollection('radar');
  return notes.sort((a, b) => a.data.order - b.data.order);
}

export interface ChapterBundle {
  chapter: number;
  part: string;
  slug: string;
  href: string;
  title: string;
  titleEn: string;
  summary: string;
  overview: RadarNote;
  sections: RadarNote[];
  code: RadarNote | null;
  minutes: number;
  codeMinutes: number;
}

export function buildChapters(notes: RadarNote[]): ChapterBundle[] {
  const chapters = notes.filter((note) => note.data.kind === 'chapter');
  return chapters.map((overview) => {
    const chapter = overview.data.chapter;
    const sections = notes.filter(
      (note) => note.data.kind === 'section' && note.data.chapter === chapter
    );
    const code =
      notes.find(
        (note) => note.data.kind === 'code' && note.data.chapter === chapter
      ) ?? null;
    return {
      chapter,
      part: overview.data.part,
      slug: chapterSlug(chapter),
      href: chapterHref(chapter),
      title: overview.data.chapterTitle,
      titleEn: overview.data.chapterTitleEn,
      summary: overview.data.summary,
      overview,
      sections,
      code,
      minutes: sections.reduce((sum, note) => sum + radarMinutes(note), 0),
      codeMinutes: code ? radarMinutes(code) : 0,
    };
  });
}

export function groupByPart(chapters: ChapterBundle[]) {
  return PARTS.map((part) => ({
    ...part,
    chapters: chapters.filter((chapter) => chapter.part === part.id),
  })).filter((group) => group.chapters.length > 0);
}

/** 阅读顺序：所有分节，然后每章末尾的代码实践 */
export function buildOutline(notes: RadarNote[]): RadarNote[] {
  return notes.filter((note) => note.data.kind !== 'chapter');
}

export function getTotals(chapters: ChapterBundle[]) {
  const sections = chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0);
  const minutes = chapters.reduce(
    (sum, chapter) => sum + chapter.minutes + chapter.codeMinutes,
    0
  );
  return {
    chapters: chapters.length,
    sections,
    code: chapters.filter((chapter) => chapter.code).length,
    minutes,
    hours: Math.round((minutes / 60) * 10) / 10,
  };
}

export interface CurriculumItem {
  id: string;
  title: string;
  chapter: number;
  chapterTitle: string;
  section: string;
  minutes: number;
  href: string;
}

export function buildCurriculum(notes: RadarNote[]): CurriculumItem[] {
  return notes
    .filter((note) => note.data.kind === 'section')
    .map((note) => ({
      id: note.id,
      title: note.data.title,
      chapter: note.data.chapter,
      chapterTitle: note.data.chapterTitle,
      section: note.data.section,
      minutes: radarMinutes(note),
      href: radarHref(note),
    }));
}
