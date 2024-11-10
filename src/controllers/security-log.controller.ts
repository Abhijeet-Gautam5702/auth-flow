import { Response } from "express";
import { IRequest } from "../types/api.types";
import { asyncHandler } from "../utils/async-handler";

// GET ALL LOGS OF A PARTICULAR USER (USING ITS USER-ID)
export const getLogsUsingUserId = asyncHandler(async(req:IRequest, res:Response)=>{
    // 
})

// CLEAR ALL LOGS OF A PARTICULAR USER (USING ITS USER-ID)