import Supabase from "@/supabase"
import axios from "axios"

const api = axios.create({
  baseURL: "https://api.abm.ami.bd"
})

api.interceptors.request.use(async (config) => {
  const { data } = await Supabase.auth.getSession()
  const token = data?.session?.access_token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api