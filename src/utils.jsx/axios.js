import axios from "axios";

const instance = axios.create({
  baseURL: "http://localhost:5000", // ← adapte si backend différent
  withCredentials: true,
});

export default instance;
