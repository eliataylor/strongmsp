import { useEffect, useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./screens/Home";
import Layout from "./theme/Layout";

import ChangeEmail from "./allauth/account/ChangeEmail";
import ChangePassword from "./allauth/account/ChangePassword";
import ConfirmLoginCode from "./allauth/account/ConfirmLoginCode";
import Login from "./allauth/account/Login";
import Logout from "./allauth/account/Logout";
import Reauthenticate from "./allauth/account/Reauthenticate";
import RequestLoginCode from "./allauth/account/RequestLoginCode";
import RequestPasswordReset from "./allauth/account/RequestPasswordReset";
import ResetPassword, { loader as resetPasswordLoader } from "./allauth/account/ResetPassword";
import Signup from "./allauth/account/Signup";
import VerificationEmailSent from "./allauth/account/VerificationEmailSent";
import VerifyEmail, { loader as verifyEmailLoader } from "./allauth/account/VerifyEmail";
import { AnonymousRoute, AuthChangeRedirector, AuthenticatedRoute } from "./allauth/auth";
import ActivateTOTP, { loader as activateTOTPLoader } from "./allauth/mfa/ActivateTOTP";
import AddWebAuthn from "./allauth/mfa/AddWebAuthn";
import AuthenticateRecoveryCodes from "./allauth/mfa/AuthenticateRecoveryCodes";
import AuthenticateTOTP from "./allauth/mfa/AuthenticateTOTP";
import AuthenticateWebAuthn from "./allauth/mfa/AuthenticateWebAuthn";
import DeactivateTOTP from "./allauth/mfa/DeactivateTOTP";
import GenerateRecoveryCodes, { loader as generateRecoveryCodesLoader } from "./allauth/mfa/GenerateRecoveryCodes";
import ListWebAuthn, { loader as listWebAuthnLoader } from "./allauth/mfa/ListWebAuthn";
import MFAOverview, { loader as mfaOverviewLoader } from "./allauth/mfa/MFAOverview";
import ReauthenticateRecoveryCodes from "./allauth/mfa/ReauthenticateRecoveryCodes";
import ReauthenticateTOTP from "./allauth/mfa/ReauthenticateTOTP";
import ReauthenticateWebAuthn from "./allauth/mfa/ReauthenticateWebAuthn";
import RecoveryCodes, { loader as recoveryCodesLoader } from "./allauth/mfa/RecoveryCodes";
import SmsSigninOrUp from "./allauth/SmsSigninOrUp";
import ManageProviders from "./allauth/socialaccount/ManageProviders";
import ProviderCallback from "./allauth/socialaccount/ProviderCallback";
import ProviderSignup from "./allauth/socialaccount/ProviderSignup";
import Sessions from "./allauth/usersessions/Sessions";
import { RoleProtectedRoute } from "./context/RoleProtectedRoute";
import NewSchemaForm from "./object-actions/generator/NewSchemaForm";
import WorksheetList from "./object-actions/generator/WorksheetList";
import WorksheetLoader from "./object-actions/generator/WorksheetLoader";
import { NAVITEMS } from "./object-actions/types/types";
import AssessmentScreen from "./screens/AssessmentScreen";
import BrandingSettings from "./screens/BrandingSettings";
import BuyConfidenceAssessment from "./screens/BuyConfidenceAssessment";
import Dashboard from "./screens/Dashboard";
import EntityForm from "./screens/EntityForm";
import EntityList from "./screens/EntityList";
import EntityView from "./screens/EntityView";
import MyAccount from "./screens/MyAccount";
import NotificationsScreen from "./screens/Notifications";
import PromptTesterScreen from "./screens/PromptTesterScreen";
import RoleSelection from "./screens/RoleSelection";
import RoleSwitchPrompt from "./screens/RoleSwitchPrompt";
import UserView from "./screens/UserView";

function createRouter() {
  const allRoutes = [
    {
      path: "/",
      element: (
        <AuthChangeRedirector>
          <Layout />
        </AuthChangeRedirector>
      ),
      children: [
        {
          path: "/",
          element: <Home />
        },
        {
          path: "/account/sms",
          element: (
            <AnonymousRoute>
              <SmsSigninOrUp />
            </AnonymousRoute>
          )
        },
        {
          path: "/account/login",
          element: (
            <AnonymousRoute>
              <Login />
            </AnonymousRoute>
          )
        },
        {
          path: "/account/login/code",
          element: (
            <AnonymousRoute>
              <RequestLoginCode />
            </AnonymousRoute>
          )
        },
        {
          path: "/account/login/code/confirm",
          element: (
            <AnonymousRoute>
              <ConfirmLoginCode />
            </AnonymousRoute>
          )
        },
        {
          path: "/account/email",
          element: (
            <AuthenticatedRoute>
              <ChangeEmail />
            </AuthenticatedRoute>
          )
        },
        {
          path: "/account/logout",
          element: <Logout />
        },
        {
          path: "/account/oidc/:provider/callback",
          element: <ProviderCallback />
        },
        {
          path: "/account/:provider/callback",
          element: <ProviderCallback />
        },
        {
          path: "/account/provider/signup",
          element: (
            <AnonymousRoute>
              <ProviderSignup />
            </AnonymousRoute>
          )
        },
        {
          path: "/account/providers",
          element: (
            <AuthenticatedRoute>
              <ManageProviders />
            </AuthenticatedRoute>
          )
        },
        {
          path: "/account/signup",
          element: (
            <AnonymousRoute>
              <Signup />
            </AnonymousRoute>
          )
        },
        {
          path: "/account/verify-email",
          element: <VerificationEmailSent />
        },
        {
          path: "/account/verify-email/:key",
          element: <VerifyEmail />,
          loader: verifyEmailLoader
        },
        {
          path: "/account/password/reset",
          element: (
            <AnonymousRoute>
              <RequestPasswordReset />
            </AnonymousRoute>
          )
        },
        {
          path: "/account/password/reset/key/:key",
          element: (
            <AnonymousRoute>
              <ResetPassword />
            </AnonymousRoute>
          ),
          loader: resetPasswordLoader
        },
        {
          path: "/account/password/change",
          element: (
            <AuthenticatedRoute>
              <ChangePassword />
            </AuthenticatedRoute>
          )
        },
        {
          path: "/account/2fa",
          element: (
            <AuthenticatedRoute>
              <MFAOverview />
            </AuthenticatedRoute>
          ),
          loader: mfaOverviewLoader
        },
        {
          path: "/account/reauthenticate",
          element: (
            <AuthenticatedRoute>
              <Reauthenticate />
            </AuthenticatedRoute>
          )
        },
        {
          path: "/account/reauthenticate/totp",
          element: (
            <AuthenticatedRoute>
              <ReauthenticateTOTP />
            </AuthenticatedRoute>
          )
        },
        {
          path: "/account/reauthenticate/recovery-codes",
          element: (
            <AuthenticatedRoute>
              <ReauthenticateRecoveryCodes />
            </AuthenticatedRoute>
          )
        },
        {
          path: "/account/reauthenticate/webauthn",
          element: (
            <AuthenticatedRoute>
              <ReauthenticateWebAuthn />
            </AuthenticatedRoute>
          )
        },
        {
          path: "/account/authenticate/totp",
          element: (
            <AnonymousRoute>
              <AuthenticateTOTP />
            </AnonymousRoute>
          )
        },
        {
          path: "/account/authenticate/recovery-codes",
          element: (
            <AnonymousRoute>
              <AuthenticateRecoveryCodes />
            </AnonymousRoute>
          )
        },
        {
          path: "/account/authenticate/webauthn",
          element: (
            <AnonymousRoute>
              <AuthenticateWebAuthn />
            </AnonymousRoute>
          )
        },
        {
          path: "/account/2fa/totp/activate",
          element: (
            <AuthenticatedRoute>
              <ActivateTOTP />
            </AuthenticatedRoute>
          ),
          loader: activateTOTPLoader
        },
        {
          path: "/account/2fa/totp/deactivate",
          element: (
            <AuthenticatedRoute>
              <DeactivateTOTP />
            </AuthenticatedRoute>
          )
        },
        {
          path: "/account/2fa/recovery-codes",
          element: (
            <AuthenticatedRoute>
              <RecoveryCodes />
            </AuthenticatedRoute>
          ),
          loader: recoveryCodesLoader
        },
        {
          path: "/account/2fa/recovery-codes/generate",
          element: (
            <AuthenticatedRoute>
              <GenerateRecoveryCodes />
            </AuthenticatedRoute>
          ),
          loader: generateRecoveryCodesLoader
        },
        {
          path: "/account/2fa/webauthn",
          element: (
            <AuthenticatedRoute>
              <ListWebAuthn />
            </AuthenticatedRoute>
          ),
          loader: listWebAuthnLoader
        },
        {
          path: "/account/2fa/webauthn/add",
          element: (
            <AuthenticatedRoute>
              <AddWebAuthn />
            </AuthenticatedRoute>
          )
        },
        {
          path: "/account/sessions",
          element: (
            <AuthenticatedRoute>
              <Sessions />
            </AuthenticatedRoute>
          )
        },
        {
          path: "/my-profile",
          element: (
            <AuthenticatedRoute>
              <MyAccount />
            </AuthenticatedRoute>
          )
        },
        {
          path: "/onboarding/role-selection",
          element: (
            <AuthenticatedRoute>
              <RoleSelection />
            </AuthenticatedRoute>
          )
        },
        {
          path: "/switch-role",
          element: (
            <AuthenticatedRoute>
              <RoleSwitchPrompt />
            </AuthenticatedRoute>
          )
        },
        {
          path: "/dashboard",
          element: (
            <AuthenticatedRoute>
              <Dashboard />
            </AuthenticatedRoute>
          )
        },
        {
          path: "/notifications",
          element: (
            <AuthenticatedRoute>
              <NotificationsScreen />
            </AuthenticatedRoute>
          )
        }
      ]
    }
  ];

  allRoutes[0].children.push({ path: `/users/:uid`, element: <UserView /> });

  allRoutes[0].children.push({
    path: `/assessments/:id`,
    element: <AssessmentScreen />
  });

  allRoutes[0].children.push({
    path: `/buy-assessment`,
    element: <BuyConfidenceAssessment />
  });

  NAVITEMS.forEach((item) => {
    // Create route with role protection if roles are defined
    const listElement = item.roles ?
      <RoleProtectedRoute requiredRoles={item.roles}>
        <EntityList showFab={true} />
      </RoleProtectedRoute> :
      <EntityList showFab={true} />;

    const viewElement = item.roles ?
      <RoleProtectedRoute requiredRoles={item.roles}>
        <EntityView />
      </RoleProtectedRoute> :
      <EntityView />;

    allRoutes[0].children.push({
      path: `/${item.segment}`,
      element: listElement
    });
    allRoutes[0].children.push({
      path: `/${item.segment}/:id`,
      element: viewElement
    });
  });

  allRoutes[0].children.push({
    path: `/forms/:model/:id/edit`,
    element: <EntityForm />
  });
  allRoutes[0].children.push({
    path: `/forms/:model/0/add`,
    element: <EntityForm />
  });

  allRoutes[0].children.push({
    path: `/prompt-tester`,
    element: (
      <RoleProtectedRoute requiredRoles={['coach', 'admin']}>
        <PromptTesterScreen />
      </RoleProtectedRoute>
    )
  });

  allRoutes[0].children.push({
    path: `/admin/branding`,
    element: (
      <RoleProtectedRoute requiredRoles={['admin']}>
        <BrandingSettings />
      </RoleProtectedRoute>
    )
  });


  allRoutes[0].children.push({ path: `/oa/schemas`, element: <WorksheetList /> });
  allRoutes[0].children.push({ path: `/oa/schemas/:id`, element: <WorksheetLoader /> });
  allRoutes[0].children.push({ path: `/oa/schemas/:id/versions/:version`, element: <WorksheetLoader /> });
  allRoutes[0].children.push({ path: `/oa/schemas/add`, element: <NewSchemaForm /> });

  return createBrowserRouter(allRoutes);
}

export default function Router() {
  // If we create the router globally, the loaders of the routes already trigger
  // even before the <AuthContext/> trigger the initial loading of the auth.
  // state.
  const [router, setRouter] = useState(null);
  useEffect(() => {
    // @ts-ignore
    return setRouter(createRouter());
  }, []);
  return router ? <RouterProvider router={router} /> : null;
}
