import { Authenticated, Refine } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

import {
  ErrorComponent,
  ThemedLayout,
  ThemedSider,
  ThemedTitle,
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
import { QueueEdit, QueueList, QueueShow, DoctorQueueMonitor } from "./pages/queues";
import { DoctorEdit, DoctorList, DoctorShow, DoctorAnalyticsPerformance, DoctorAnalyticsHistory } from "./pages/doctors";
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
import {
  CampaignZoneCreate,
  CampaignZoneEdit,
  CampaignZoneList,
  CampaignZoneShow,
} from "./pages/campaign-zones";
import {
  CampaignCreate,
  CampaignEdit,
  CampaignList,
  CampaignShow,
} from "./pages/campaigns";
import { CampaignCoupons } from "./pages/campaigns/coupons";
import {
  CampaignAnalyticsList,
  CampaignAnalyticsShow,
} from "./pages/campaign-analytics";
import { Login } from "./pages/login"

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
                    name: "Ad Management"
                  },
                  {
                    name: "ad_campaigns",
                    list: "/campaigns",
                    create: "/campaigns/create",
                    edit: "/campaigns/edit/:id",
                    show: "/campaigns/show/:id",
                    meta: {
                      canDelete: true,
                      label: "Ad Campaigns",
                      parent: "Ad Management",
                    },
                  },
                  {
                    name: "campaign_zones",
                    list: "/campaign-zones",
                    create: "/campaign-zones/create",
                    edit: "/campaign-zones/edit/:id",
                    show: "/campaign-zones/show/:id",
                    meta: {
                      canDelete: true,
                      label: "Campaign Zones",
                      parent: "Ad Management",
                    },
                  },
                  {
                    name: "ad_campaigns",
                    identifier: "campaign-analytics",
                    list: "/campaign-analytics",
                    show: "/campaign-analytics/show/:id",
                    meta: {
                      label: "Campaign Analytics",
                      parent: "Ad Management",
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
                          Title={({ collapsed }) => (
                            <ThemedTitle
                              collapsed={collapsed}
                              text="QX Admin"
                              icon={
                                <img
                                  src="/logo.png"
                                  alt="QX Admin"
                                  style={{
                                    width: "24px",
                                    height: "24px",
                                    objectFit: "contain",
                                  }}
                                />
                              }
                            />
                          )}
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
                      <Route path="doctor/:doctorId" element={<DoctorQueueMonitor />} />
                      <Route path="edit/:id" element={<QueueEdit />} />
                      <Route path="show/:id" element={<QueueShow />} />
                    </Route>
                    <Route path="/doctors">
                      <Route index element={<DoctorList />} />
                      <Route path="edit/:id" element={<DoctorEdit />} />
                      <Route path="show/:id" element={<DoctorShow />} />
                      <Route path="analytics/performance/:id" element={<DoctorAnalyticsPerformance />} />
                      <Route path="analytics/history/:id" element={<DoctorAnalyticsHistory />} />
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
                    <Route path="/campaign-zones">
                      <Route index element={<CampaignZoneList />} />
                      <Route path="create" element={<CampaignZoneCreate />} />
                      <Route path="edit/:id" element={<CampaignZoneEdit />} />
                      <Route path="show/:id" element={<CampaignZoneShow />} />
                    </Route>
                    <Route path="/campaigns">
                      <Route index element={<CampaignList />} />
                      <Route path="create" element={<CampaignCreate />} />
                      <Route path="edit/:id" element={<CampaignEdit />} />
                      <Route path="show/:id" element={<CampaignShow />} />
                    </Route>
                    <Route path="/ad_campaigns/:id/coupons" element={<CampaignCoupons />} />
                    <Route path="/campaign-analytics">
                      <Route index element={<CampaignAnalyticsList />} />
                      <Route path="show/:id" element={<CampaignAnalyticsShow />} />
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
                      element={<Login />}
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
