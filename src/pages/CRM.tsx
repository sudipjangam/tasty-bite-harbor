
import React, { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";

const CRM = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to the customers page
    navigate('/customers', { replace: true });
  }, [navigate]);
  
  return null;
};

export default CRM;
