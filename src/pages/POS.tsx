import { Navigate } from "react-router-dom";

/**
 * Legacy POS Page Wrapper
 * Seamlessly redirects to the consolidated QSR POS system.
 */
const POS = () => {
  return <Navigate to="/qsr-pos" replace />;
};

export default POS;
