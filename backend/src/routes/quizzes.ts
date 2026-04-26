import { Router } from "express";
import * as quizzesController from "../controllers/quizzesController.js";
import { authenticate } from "../middlewares/auth.js";

export const quizRouter = Router();

quizRouter.post("/", authenticate, quizzesController.create);
quizRouter.get("/my/attempts", authenticate, quizzesController.myAttempts);
quizRouter.get("/:id", authenticate, quizzesController.getOne);
quizRouter.put("/:id", authenticate, quizzesController.bulkUpdate);
quizRouter.post("/:id/questions", authenticate, quizzesController.addQuestion);
quizRouter.post("/:id/submit", authenticate, quizzesController.submitAttempt);
