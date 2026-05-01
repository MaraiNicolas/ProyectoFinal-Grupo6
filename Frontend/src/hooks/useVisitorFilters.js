import { useState } from "react";
import { visitors } from "../data/visitors";

export function useVisitorFilters() {
  const [filters, setFilters] = useState({
    nombre: "",
    apellido: "",
    mail: "",
    dni: "",
  });

  const filteredVisitors = visitors.filter((visitor) => {
    const matchesNombre = visitor.nombre
      .toLowerCase()
      .includes(filters.nombre.toLowerCase());
    const matchesApellido = visitor.apellido
      .toLowerCase()
      .includes(filters.apellido.toLowerCase());
    const matchesMail = visitor.mail
      .toLowerCase()
      .includes(filters.mail.toLowerCase());
    const matchesDni = visitor.dni.includes(filters.dni);

    return matchesNombre && matchesApellido && matchesMail && matchesDni;
  });

  const handleFilterChange = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return { filters, filteredVisitors, handleFilterChange };
}
