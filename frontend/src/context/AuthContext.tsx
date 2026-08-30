import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, apiErrorMessage } from "../api/client";
import { User } from "../lib/types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("jansevaToken");
    const storedUser = localStorage.getItem("jansevaUser");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "jansevaToken" || e.key === "jansevaUser") {
        const activeToken = localStorage.getItem("jansevaToken");
        const activeUser = localStorage.getItem("jansevaUser");
        if (activeToken && activeUser) {
          setToken(activeToken);
          setUser(JSON.parse(activeUser));
        } else {
          setToken(null);
          setUser(null);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  function persist(tok: string, u: User) {
    localStorage.setItem("jansevaToken", tok);
    localStorage.setItem("jansevaUser", JSON.stringify(u));
    setToken(tok);
    setUser(u);
  }

  async function login(email: string, password: string) {
    try {
      const res = await api.post("/auth/login", { email, password });
      const { token: tok, user: u } = res.data.data;
      persist(tok, u);
      return u as User;
    } catch (err) {
      throw new Error(apiErrorMessage(err));
    }
  }

  async function register(name: string, email: string, password: string, phone?: string) {
    try {
      const res = await api.post("/auth/register", { name, email, password, phone });
      const { token: tok, user: u } = res.data.data;
      persist(tok, u);
      return u as User;
    } catch (err) {
      throw new Error(apiErrorMessage(err));
    }
  }

  function logout() {
    localStorage.removeItem("jansevaToken");
    localStorage.removeItem("jansevaUser");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
