import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Lesson } from '../models/Lesson.js';
import { LessonTranslation } from '../models/LessonTranslation.js';
import { assertLessonsValid, lessonSources } from './lessons/index.js';
import { createHash } from 'node:crypto';

async function seedLessons(): Promise<number> {
  const lessonIds = [];
  for (const { def, translations } of lessonSources) {
    const version = createHash('sha1').update(JSON.stringify(def)).digest('hex');
    await Lesson.replaceOne({ slug: def.slug }, { ...def, version }, { upsert: true });
    const lesson = await Lesson.findOne({ slug: def.slug }).select('_id').lean();
    if (!lesson) throw new Error(`Seeded lesson could not be loaded: ${def.slug}`);
    lessonIds.push(lesson._id);
    for (const [lang, data] of Object.entries(translations)) {
      const translationData = Object.fromEntries(
        Object.entries(data).filter(([key]) => key !== 'lang'),
      );
      await LessonTranslation.replaceOne(
        { lessonId: lesson._id, lang },
        { lessonId: lesson._id, lang, data: translationData },
        { upsert: true },
      );
    }
  }

  const slugs = lessonSources.map(({ def }) => def.slug);
  const staleLessons = await Lesson.find({ slug: { $nin: slugs } })
    .select('_id')
    .lean();
  const staleIds = staleLessons.map((lesson) => lesson._id);
  await LessonTranslation.deleteMany({ lessonId: { $in: staleIds } });
  const removed = await Lesson.deleteMany({ slug: { $nin: slugs } });
  await LessonTranslation.deleteMany({ lessonId: { $nin: lessonIds } });
  return removed.deletedCount;
}

async function runSeed(): Promise<void> {
  // Throws before anything is written if a lesson file is inconsistent.
  assertLessonsValid();

  await connectDB();

  try {
    const removedCount = await seedLessons();
    const lessonCount = await Lesson.countDocuments();
    console.log(
      `Seeded ${lessonSources.length} lessons, removed ${removedCount} old. ${lessonCount} lessons total.`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

runSeed().catch((error: unknown) => {
  console.error('Lesson seed failed.', error);
  process.exitCode = 1;
});
