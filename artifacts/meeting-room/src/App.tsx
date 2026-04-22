import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import { Layout } from "@/components/layout";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Reservations from "@/pages/reservations";
import NewReservation from "@/pages/reservation-new";
import ReservationDetail from "@/pages/reservation-detail";
import Rooms from "@/pages/rooms";
import RoomDetail from "@/pages/room-detail";
import Users from "@/pages/users";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Protected Routes wrapped in Layout */}
      <Route path="/">
        {() => (
          <Layout>
            <Dashboard />
          </Layout>
        )}
      </Route>
      <Route path="/dashboard">
        {() => (
          <Layout>
            <Dashboard />
          </Layout>
        )}
      </Route>
      <Route path="/reservations">
        {() => (
          <Layout>
            <Reservations />
          </Layout>
        )}
      </Route>
      <Route path="/reservations/new">
        {() => (
          <Layout>
            <NewReservation />
          </Layout>
        )}
      </Route>
      <Route path="/reservations/:id">
        {() => (
          <Layout>
            <ReservationDetail />
          </Layout>
        )}
      </Route>
      <Route path="/rooms">
        {() => (
          <Layout>
            <Rooms />
          </Layout>
        )}
      </Route>
      <Route path="/rooms/:id">
        {() => (
          <Layout>
            <RoomDetail />
          </Layout>
        )}
      </Route>
      <Route path="/users">
        {() => (
          <Layout>
            <Users />
          </Layout>
        )}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
