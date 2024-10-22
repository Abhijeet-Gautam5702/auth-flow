import { Router } from "express";
import { createAccount } from "../controllers/user.controller";

const router=Router();

router.route("/create").post(createAccount)

export const userRouter = router;