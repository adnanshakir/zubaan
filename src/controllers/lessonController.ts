import type { RequestHandler } from 'express';
import { getLessonById, listLessons } from '../services/lessonService.js';
import type { LessonDetailParams, LessonListQuery } from '../validators/lessonValidator.js';

export const getLessons: RequestHandler = async (req, res) => {
  const query = (res.locals?.validated?.query ?? req.query) as LessonListQuery;
  const lessons = await listLessons(query);

  res.status(200).json(lessons);
};

export const getLesson: RequestHandler = async (req, res) => {
  const params = (res.locals?.validated?.params ?? req.params) as LessonDetailParams;
  const lesson = await getLessonById(params.id);

  res.status(200).json(lesson);
};
