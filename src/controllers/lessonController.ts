import type { RequestHandler } from 'express';
import { getLessonById, listLessons } from '../services/lessonService.js';
import { recordProgress } from '../services/progressService.js';
import type {
  LessonDetailParams,
  LessonListQuery,
  LessonProgressInput,
  LessonProgressParams,
} from '../validators/lessonValidator.js';

export const getLessons: RequestHandler = async (req, res) => {
  const query = (res.locals?.validated?.query ?? req.query) as LessonListQuery;
  const lessons = await listLessons(query, req.user!);

  res.status(200).json(lessons);
};

export const getLesson: RequestHandler = async (req, res) => {
  const params = (res.locals?.validated?.params ?? req.params) as LessonDetailParams;
  const query = (res.locals?.validated?.query ?? req.query) as LessonDetailParams['query'];
  const lesson = await getLessonById(params.id, req.user!, query?.lang);

  res.status(200).json(lesson);
};

export const postProgress: RequestHandler = async (req, res) => {
  const { params, body } = res.locals.validated as {
    params: LessonProgressParams;
    body: LessonProgressInput;
  };
  res
    .status(200)
    .json(await recordProgress(req.user!, params.lessonId, body.score, body.conversationId));
};
