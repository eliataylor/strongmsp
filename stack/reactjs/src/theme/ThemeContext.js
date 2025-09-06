// ThemeContext.js
import CssBaseline from "@mui/material/CssBaseline";
import { green, orange } from "@mui/material/colors";
import { createTheme, ThemeProvider as MuiThemeProvider, responsiveFontSizes } from "@mui/material/styles";
import { createContext, useMemo, useState } from "react";

import GlobalStyles from "./GlobalStyles";

const ThemeContext = createContext();

const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("themeMode") ? localStorage.getItem("themeMode") !== "false" :
      window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const [fontFamily, setFamily] = useState(
    localStorage.getItem("themeFont") ? localStorage.getItem("themeFont") :
      "Montserrat");

  const theme = useMemo(() => {
    const plt = {
      mode: darkMode ? "dark" : "light",
      background: {
        default: darkMode ? "#32363F" : "#f4f4f4",
        paper: darkMode ? "#32363F" : "#f4f4f4"
      },
      contrastText: darkMode ? "#e1e1e1" : "#202020",
      text: {
        primary: darkMode ? "#ffffff" : "#202020",
        secondary: darkMode ? "#dadada" : "#333333"
      },
      grey: {
        500: "#9e9e9e"
      },
      /*
                // for meals: F5F5F5

                color: theme.palette.getContrastText(theme.palette.primary.main),
                 */
      primary: {
        main: darkMode ? "#f4ab2a" : "#877010"
      },
      secondary: {
        main: darkMode ? "#2ab1f4" : "#2a74b7"
      },
      warning: {
        main: orange[500]
      },
      success: {
        main: green[500]
      },
      link: {
        main: darkMode ? "#a6d8fb" : "#1973af"
      }
    };

    return responsiveFontSizes(
      createTheme({
        typography: {
          fontFamily: fontFamily,
          fontSize: 15,
          h1: { fontSize: "3.5rem", fontWeight: 200 },
          h2: { fontSize: "3.0rem", fontWeight: 200 },
          h3: { fontSize: "2.5rem", fontWeight: 300 },
          h4: { fontSize: "2.0rem", fontWeight: 400 },
          h5: { fontSize: "1.5rem", fontWeight: 500 },
          h6: { fontSize: "1.0rem", fontWeight: 600 },
          body1: { fontSize: "1rem", lineHeight: 1.5 },
          body2: { fontSize: "0.9rem", lineHeight: 1.4 },
          button: {
            fontSize: "0.8rem",
            textTransform: "none",
            textDecoration: "none"
          }
        },
        components: {
          // Name of the component
          MuiButton: {
            styleOverrides: {
              // Name of the slot
              root: {
                // Some CSS
                textTransform: "none",
                variants: [
                  {
                    props: { variant: "outlined" },
                    style: {
                      borderWidth: ".5px"
                    }
                  }
                ]
              }
            }
          },
          MuiList: {
            variants: [
              {
                props: { variant: "alternatingbg" },
                style: {
                  "& .MuiListItem-root:nth-of-type(odd)": {
                    backgroundColor: "lightgray"
                  },
                  "& .MuiListItem-root:nth-of-type(even)": {
                    backgroundColor: "white"
                  },
                  "& .MuiListItem-root:hover": {
                    backgroundColor: "gray" // Optional hover effect
                  }
                }
              }
            ]
          }
        },
        palette: plt
      })
    );
  }, [darkMode, fontFamily]);

  console.log("THEME UPDATE", theme);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, setFamily, fontFamily }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export { ThemeContext, ThemeProvider };

