import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import groupsRouter from "./groups";
import messagesRouter from "./messages";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(groupsRouter);
router.use(messagesRouter);
router.use(dashboardRouter);
router.use(adminRouter);
router.use(reportsRouter);

export default router;
