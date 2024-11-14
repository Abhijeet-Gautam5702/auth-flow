/* ------------------------------ ADMIN MODEL TYPES ------------------------------------ */

import { Model,Document, Schema, Types } from "mongoose";

export interface IAdminBase {
    email: string;
    password: string;
    accessToken: string;
    accessTokenExpiry: Date;
    refreshToken: string;
    refreshTokenExpiry: Date;
  }
  
  export interface IAdminMethods {
    validatePassword(password: string): Promise<boolean>;
  }
  
  export interface IAdmin extends IAdminBase, IAdminMethods, Document<Types.ObjectId> {}
  
  export type IAdminModel = Model<IAdmin, {}, IAdminMethods>;