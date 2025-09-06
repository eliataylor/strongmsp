import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { SnackbarProvider } from "notistack";
import { AuthContextProvider } from "./allauth/auth";
import { AssessmentProvider } from "./context/AssessmentContext";
import { NavDrawerProvider } from "./NavDrawerProvider";
import { EnvProvider } from "./object-actions/forming/EnvProvider";
import Router from "./Router";
import { ThemeProvider } from "./theme/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <SnackbarProvider
        maxSnack={4}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center"
        }}
      >
        <EnvProvider>
          <AuthContextProvider>
            <NavDrawerProvider>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <AssessmentProvider>
                  <Router />
                </AssessmentProvider>
              </LocalizationProvider>
            </NavDrawerProvider>
          </AuthContextProvider>
        </EnvProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}
