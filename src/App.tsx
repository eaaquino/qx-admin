import { Authenticated, GitHubBanner, Refine } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

import {
  AuthPage,
  ErrorComponent,
  ThemedLayout,
  ThemedSider,
  useNotificationProvider,
} from "@refinedev/antd";
import "@refinedev/antd/dist/reset.css";

import routerProvider, {
  CatchAllNavigate,
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { dataProvider, liveProvider } from "@refinedev/supabase";
import { App as AntdApp } from "antd";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import authProvider from "./authProvider";
import { Header } from "./components/header";
import { ColorModeContextProvider } from "./contexts/color-mode";
import { Dashboard } from "./pages/dashboard";
import { QueueEdit, QueueList, QueueShow } from "./pages/queues";
import { DoctorEdit, DoctorList, DoctorShow } from "./pages/doctors";
import { PatientList, PatientShow } from "./pages/patients";
import {
  ClinicCreate,
  ClinicEdit,
  ClinicList,
  ClinicShow,
} from "./pages/clinics";
import {
  AdminCreate,
  AdminEdit,
  AdminList,
  AdminShow,
} from "./pages/admins";
import { supabaseClient } from "./utility";

function App() {
  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ColorModeContextProvider>
          <AntdApp>
            <DevtoolsProvider>
              <Refine
                dataProvider={dataProvider(supabaseClient)}
                liveProvider={liveProvider(supabaseClient)}
                authProvider={authProvider}
                routerProvider={routerProvider}
                notificationProvider={useNotificationProvider}
                resources={[
                  {
                    name: "queue_entries",
                    list: "/queues",
                    edit: "/queues/edit/:id",
                    show: "/queues/show/:id",
                    meta: {
                      canDelete: true,
                      label: "Queues",
                    },
                  },
                  {
                    name: "doctors",
                    list: "/doctors",
                    edit: "/doctors/edit/:id",
                    show: "/doctors/show/:id",
                    meta: {
                      canDelete: true,
                    },
                  },
                  {
                    name: "patients",
                    list: "/patients",
                    show: "/patients/show/:id",
                    meta: {
                      canDelete: true,
                    },
                  },
                  {
                    name: "clinics",
                    list: "/clinics",
                    create: "/clinics/create",
                    edit: "/clinics/edit/:id",
                    show: "/clinics/show/:id",
                    meta: {
                      canDelete: true,
                    },
                  },
                  {
                    name: "admins",
                    list: "/admins",
                    create: "/admins/create",
                    edit: "/admins/edit/:id",
                    show: "/admins/show/:id",
                    meta: {
                      canDelete: true,
                      label: "Admin Users",
                    },
                  },
                ]}
                options={{
                  syncWithLocation: true,
                  warnWhenUnsavedChanges: true,
                  projectId: "jmf5Po-aohoab-3qYVnp",
                }}
              >
                <Routes>
                  <Route
                    element={
                      <Authenticated
                        key="authenticated-inner"
                        fallback={<CatchAllNavigate to="/login" />}
                      >
                        <ThemedLayout
                          Header={Header}
                          Sider={(props) => <ThemedSider {...props} fixed />}
                        >
                          <Outlet />
                        </ThemedLayout>
                      </Authenticated>
                    }
                  >
                    <Route index element={<Dashboard />} />
                    <Route path="/queues">
                      <Route index element={<QueueList />} />
                      <Route path="edit/:id" element={<QueueEdit />} />
                      <Route path="show/:id" element={<QueueShow />} />
                    </Route>
                    <Route path="/doctors">
                      <Route index element={<DoctorList />} />
                      <Route path="edit/:id" element={<DoctorEdit />} />
                      <Route path="show/:id" element={<DoctorShow />} />
                    </Route>
                    <Route path="/patients">
                      <Route index element={<PatientList />} />
                      <Route path="show/:id" element={<PatientShow />} />
                    </Route>
                    <Route path="/clinics">
                      <Route index element={<ClinicList />} />
                      <Route path="create" element={<ClinicCreate />} />
                      <Route path="edit/:id" element={<ClinicEdit />} />
                      <Route path="show/:id" element={<ClinicShow />} />
                    </Route>
                    <Route path="/admins">
                      <Route index element={<AdminList />} />
                      <Route path="create" element={<AdminCreate />} />
                      <Route path="edit/:id" element={<AdminEdit />} />
                      <Route path="show/:id" element={<AdminShow />} />
                    </Route>
                    <Route path="*" element={<ErrorComponent />} />
                  </Route>
                  <Route
                    element={
                      <Authenticated
                        key="authenticated-outer"
                        fallback={<Outlet />}
                      >
                        <NavigateToResource />
                      </Authenticated>
                    }
                  >
                    <Route
                      path="/login"
element={<AuthPage type="login" />}
                    />
                    <Route
                      path="/register"
                      element={<AuthPage type="register" />}
                    />
                    <Route
                      path="/forgot-password"
                      element={<AuthPage type="forgotPassword" />}
                    />
                  </Route>
                </Routes>

                <RefineKbar />
                <UnsavedChangesNotifier />
                <DocumentTitleHandler />
              </Refine>
              <DevtoolsPanel />
            </DevtoolsProvider>
          </AntdApp>
        </ColorModeContextProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
