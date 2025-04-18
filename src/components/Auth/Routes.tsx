import {
  BrowserRouter as Router,
  Routes as Switch,
  Route,
  Navigate,
} from "react-router-dom";
import { useUser } from "@supabase/auth-helpers-react";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Home from "@/pages/Home";
import Orders from "@/pages/Orders";
import Rooms from "@/pages/Rooms";
import Staff from "@/pages/Staff";
import Menu from "@/pages/Menu";
import Tables from "@/pages/Tables";
import Reservations from "@/pages/Reservations";
import Customers from "@/pages/Customers";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import KitchenDisplay from "../Kitchen/KitchenDisplay";

const Routes = () => {
  const user = useUser();

  const ComponentAccessGuard = ({ children }: { children: JSX.Element }) => {
    if (!user) {
      return <Navigate to="/login" />;
    }
    return children;
  };

  const LoginRegisterAccessGuard = ({ children }: { children: JSX.Element }) => {
    if (user) {
      return <Navigate to="/" />;
    }
    return children;
  };

  return (
    <Switch>
      <Route
        path="/"
        element={
          <ComponentAccessGuard>
            <Home />
          </ComponentAccessGuard>
        }
      />
      <Route
        path="/login"
        element={
          <LoginRegisterAccessGuard>
            <Login />
          </LoginRegisterAccessGuard>
        }
      />
      <Route
        path="/register"
        element={
          <LoginRegisterAccessGuard>
            <Register />
          </LoginRegisterAccessGuard>
        }
      />
      <Route
        path="/orders"
        element={
          <ComponentAccessGuard>
            <Orders />
          </ComponentAccessGuard>
        }
      />
      <Route
        path="/rooms"
        element={
          <ComponentAccessGuard>
            <Rooms />
          </ComponentAccessGuard>
        }
      />
      <Route
        path="/staff"
        element={
          <ComponentAccessGuard>
            <Staff />
          </ComponentAccessGuard>
        }
      />
      <Route
        path="/menu"
        element={
          <ComponentAccessGuard>
            <Menu />
          </ComponentAccessGuard>
        }
      />
      <Route
        path="/tables"
        element={
          <ComponentAccessGuard>
            <Tables />
          </ComponentAccessGuard>
        }
      />
      <Route
        path="/reservations"
        element={
          <ComponentAccessGuard>
            <Reservations />
          </ComponentAccessGuard>
        }
      />
      <Route
        path="/customers"
        element={
          <ComponentAccessGuard>
            <Customers />
          </ComponentAccessGuard>
        }
      />
      <Route
        path="/analytics"
        element={
          <ComponentAccessGuard>
            <Analytics />
          </ComponentAccessGuard>
        }
      />
      <Route
        path="/settings"
        element={
          <ComponentAccessGuard>
            <Settings />
          </ComponentAccessGuard>
        }
      />
      <Route path="/kitchen" element={
        <ComponentAccessGuard>
          <KitchenDisplay />
        </ComponentAccessGuard>
      } />
    </Switch>
  );
};

export default Routes;
