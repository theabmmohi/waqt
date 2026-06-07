import axios from "axios"
import Supabase from "@/supabase"

const base = window.location.hostname.replace(/^[^.]+/, "api")
const api = axios.create({
  baseURL: `https://${base}`
})
api.interceptors.request.use(async (config) => {
  const { data } = await Supabase.auth.getSession()
  const token = data?.session?.access_token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api