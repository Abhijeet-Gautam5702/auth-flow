import { Router } from "express";
import { createAccount, createLoginSession } from "../controllers/user.controller";

const router=Router();

router.route("/create").post(createAccount);
router.route("/session/create").post(createLoginSession);

export const userRouter = router;