import { useEffect, useState } from "react";

const AUTH_STORAGE_KEY = "grupo6-auth";

const getStoredAuth = () => {
  if (typeof window === "undefined") {
    return { email: "", isLoggedIn: false };
  }

  try {
    const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!rawValue) return { email: "", isLoggedIn: false };

    const parsedValue = JSON.parse(rawValue);
    return {
      email: typeof parsedValue.email === "string" ? parsedValue.email : "",
      isLoggedIn: Boolean(parsedValue.isLoggedIn),
    };
  } catch {
    return { email: "", isLoggedIn: false };
  }
};

export function useAuth() {
  const [email, setEmail] = useState(() => getStoredAuth().email);
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => getStoredAuth().isLoggedIn,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ email, isLoggedIn }),
    );
  }, [email, isLoggedIn]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setPassword("");
  };

  const userName = email.trim() ? email.split("@")[0] : "Usuario";

  return {
    email,
    setEmail,
    password,
    setPassword,
    isLoggedIn,
    userName,
    handleSubmit,
    handleLogout,
  };
}
