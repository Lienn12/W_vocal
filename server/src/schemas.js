import { z } from 'zod';

const t = (max, min = 1) => z.string().trim().min(min).max(max);
const opt = (max) => z.string().trim().max(max).default('');

export const worldIn = z.object({
  name: t(120), topic: opt(120), description: opt(500),
  emoji: t(16).default('🌍'), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
  category: opt(60), level: opt(8),
});
export const wordIn = z.object({
  word: t(80), meaning: t(300), example: opt(300), pronunciation: opt(80), part_of_speech: opt(30),
});
export const sceneIn = z.object({ name: t(120), description: opt(500), backdrop: t(16).default('🏞️') });
export const itemIn = z.object({
  kind: z.enum(['npc', 'object']).default('npc'), name: t(80), emoji: t(16).default('🙂'), line: opt(300),
});
export const optionIn = z.object({ text: t(300), correct: z.boolean().default(false) });
export const situationIn = z.object({
  item_id: z.number().int().positive().nullable().default(null),
  vocabulary_id: z.number().int().positive(),
  context: t(600), question: t(300), explanation: opt(500), hint: opt(300),
  options: z.array(optionIn).min(2).max(6),
});
export const answerIn = z.object({ optionId: z.number().int().positive() });
export const moveIn = z.object({ direction: z.enum(['up', 'down']) });

// Cây nội dung của một thế giới (dùng cho nạp mẫu, nhập bản nháp từ bộ tạo thế giới).
export const treeIn = z.object({
  name: t(120), topic: opt(120), description: opt(500), emoji: t(16).default('🌍'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
  category: opt(60), level: opt(8),
  vocabulary: z.array(wordIn).min(1).max(60),
  scenes: z.array(z.object({
    name: t(120), description: opt(500), backdrop: t(16).default('🏞️'),
    items: z.array(itemIn).max(10).default([]),
    situations: z.array(z.object({
      item: z.number().int().min(0).nullable().default(null),
      word: t(80), context: t(600), question: t(300), explanation: opt(500), hint: opt(300),
      options: z.array(optionIn).min(2).max(6),
    })).max(30).default([]),
  })).max(20),
});

export const generateIn = z.object({
  topic: t(120),
  words: z.array(z.object({
    word: t(80), meaning: opt(300), example: opt(300), pronunciation: opt(80), part_of_speech: opt(30),
  })).min(3).max(40),
  scenes: z.number().int().min(1).max(8).optional(),
  variant: z.number().int().min(0).max(999).optional(),
});
