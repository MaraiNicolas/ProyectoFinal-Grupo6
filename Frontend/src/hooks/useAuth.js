import { useState } from "react";

export function useAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
