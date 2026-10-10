import type { RequestHandler } from 'express';
import { getLessonById, listLessons } from '../services/lessonService.js';
import type {
  LessonDetailParams,
  LessonListQuery,
} from '../validators/lessonValidator.js';

export const getLessons: RequestHandler = async (req, res) => {
  const lessons = await listLessons(req.query as LessonListQuery);

  res.status(200).json(lessons);
};

export const getLesson: RequestHandler = async (req, res) => {
  const lesson = await getLessonById((req.params as LessonDetailParams).id);

  res.status(200).json(lesson);
};
