import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Lesson } from '../models/Lesson.js';
import { assertLessonsValid, lessons } from './lessons/index.js';

async function seedLessons(): Promise<number> {
  for (const lesson of lessons) {
    await Lesson.replaceOne({ slug: lesson.slug }, lesson, { upsert: true });
  }

  // Remove lessons that are no longer in the content list (for example old slugs
  // with the previous steps/roleplay shape), so no stale lesson stays in the app.
  const slugs = lessons.map((lesson) => lesson.slug);
  const removed = await Lesson.deleteMany({ slug: { $nin: slugs } });
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
      `Seeded ${lessons.length} lessons, removed ${removedCount} old. ${lessonCount} lessons total.`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

runSeed().catch((error: unknown) => {
  console.error('Lesson seed failed.', error);
  process.exitCode = 1;
});
