/* ------------------------------ ADMIN MODEL TYPES ------------------------------------ */

import { Model,Document, Schema } from "mongoose";

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
  
  export interface IAdmin extends IAdminBase, IAdminMethods, Document<Schema.Types.ObjectId> {}
  
  export type IAdminModel = Model<IAdmin, {}, IAdminMethods>;