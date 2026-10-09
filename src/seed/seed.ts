import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Lesson } from '../models/Lesson.js';
import { lessons } from './lessons.js';

async function seedLessons(): Promise<void> {
  for (const lesson of lessons) {
    await Lesson.updateOne(
      { slug: lesson.slug },
      { $set: lesson },
      { upsert: true },
    );
  }
}

async function runSeed(): Promise<void> {
  await connectDB();

  try {
    await seedLessons();
    const lessonCount = await Lesson.countDocuments();
    console.log(
      `Seeded ${lessons.length} lessons. ${lessonCount} lessons total.`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

runSeed().catch((error: unknown) => {
  console.error('Lesson seed failed.', error);
  process.exitCode = 1;
});
