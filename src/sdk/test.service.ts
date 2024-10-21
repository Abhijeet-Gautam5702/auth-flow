import axios from "axios";
import { API_VERSION } from "../constants";

export interface ITestService {
  apiKey: string;
  projectId: string;
}

export class TestService implements ITestService {
  apiKey: string;
  projectId: string;
  baseURL: string;

  constructor(config: ITestService) {
    this.apiKey = config.apiKey;
    this.projectId = config.projectId;
    this.baseURL = `http://localhost:8080/api/${API_VERSION}`;
  }

  // methods
  async test() {
    try {
      const response = await axios.get(`${this.baseURL}/healthcheck`);
      console.log(response.data);
      return response.data;
    } catch (error: any) {
      console.log(error);
      return error.response.data;
    }
  }

  async createAccount() {}

  async createLoginSession() {}

  async deleteLoginSession() {}

  async deleteAccount() {}
}
