import { Router, type IRouter } from "express";
import healthRouter from "./health";
import youcamRouter from "./youcam";

const router: IRouter = Router();

router.use(healthRouter);
router.use(youcamRouter);

export default router;
