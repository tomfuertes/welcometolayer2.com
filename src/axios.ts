import axios from "axios";

const api = axios.create({
  timeout: 5000,
  maxRedirects: 0,
});

export default api;
