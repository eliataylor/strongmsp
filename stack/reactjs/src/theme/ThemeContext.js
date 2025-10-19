// ThemeContext.js
import CssBaseline from "@mui/material/CssBaseline";
import { green, orange } from "@mui/material/colors";
import { createTheme, ThemeProvider as MuiThemeProvider, responsiveFontSizes } from "@mui/material/styles";
import { createContext, useEffect, useMemo, useState } from "react";

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

  // Branding settings state
  const [brandingSettings, setBrandingSettings] = useState({
    customLogoBase64: null,
    palette: {
      light: {
        primary: { main: "#877010" },
        secondary: { main: "#2a74b7" }
      },
      dark: {
        primary: { main: "#f4ab2a" },
        secondary: { main: "#2ab1f4" }
      }
    },
    typography: {
      fontFamily: "Montserrat"
    }
  });

  // Load branding settings from localStorage on mount
  useEffect(() => {
    try {
      const logoBase64 = localStorage.getItem('logo_base64');
      const brandStyles = localStorage.getItem('brandstyles');

      let settings = {
        customLogoBase64: null,
        palette: {
          light: {
            primary: { main: "#877010" },
            secondary: { main: "#2a74b7" }
          },
          dark: {
            primary: { main: "#f4ab2a" },
            secondary: { main: "#2ab1f4" }
          }
        },
        typography: {
          fontFamily: "Montserrat"
        }
      };

      if (logoBase64) {
        settings.customLogoBase64 = logoBase64;
      }

      if (brandStyles) {
        const parsedStyles = JSON.parse(brandStyles);
        settings = {
          ...settings,
          ...parsedStyles,
          customLogoBase64: logoBase64 // Ensure logo is always from its own key
        };
      }

      setBrandingSettings(settings);
    } catch (error) {
      console.error('Error loading branding settings from localStorage:', error);
    }
  }, []);

  // Branding functions
  const updateBrandingSettings = (partial) => {
    const newSettings = { ...brandingSettings, ...partial };
    setBrandingSettings(newSettings);

    // Save to localStorage
    try {
      const { customLogoBase64, ...settingsWithoutLogo } = newSettings;

      if (customLogoBase64) {
        localStorage.setItem('logo_base64', customLogoBase64);
      } else {
        localStorage.removeItem('logo_base64');
      }

      localStorage.setItem('brandstyles', JSON.stringify(settingsWithoutLogo));
    } catch (error) {
      console.error('Error saving branding settings to localStorage:', error);
    }
  };

  const updateLogo = (base64) => {
    updateBrandingSettings({ customLogoBase64: base64 });
  };

  const resetBrandingSettings = () => {
    const defaultSettings = {
      customLogoBase64: null,
      palette: {
        light: {
          primary: { main: "#877010" },
          secondary: { main: "#2a74b7" }
        },
        dark: {
          primary: { main: "#f4ab2a" },
          secondary: { main: "#2ab1f4" }
        }
      },
      typography: {
        fontFamily: "Montserrat"
      }
    };
    setBrandingSettings(defaultSettings);
    localStorage.removeItem('logo_base64');
    localStorage.removeItem('brandstyles');
  };

  const theme = useMemo(() => {
    // Get colors from branding settings or use defaults
    const getPrimaryColor = () => {
      if (brandingSettings?.palette) {
        return darkMode
          ? brandingSettings.palette.dark.primary.main
          : brandingSettings.palette.light.primary.main;
      }
      return darkMode ? "#f4ab2a" : "#877010";
    };

    const getSecondaryColor = () => {
      if (brandingSettings?.palette) {
        return darkMode
          ? brandingSettings.palette.dark.secondary.main
          : brandingSettings.palette.light.secondary.main;
      }
      return darkMode ? "#2ab1f4" : "#2a74b7";
    };

    // Get font family from branding settings or use current
    const getFontFamily = () => {
      if (brandingSettings?.typography?.fontFamily) {
        return brandingSettings.typography.fontFamily;
      }
      return fontFamily;
    };

    const plt = {
      mode: darkMode ? "dark" : "light",
      background: {
        default: darkMode ? "#32363F" : "#f4f4f4",
        paper: darkMode ? "#1e2226" : "#f4f4f4"
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
        main: getPrimaryColor()
      },
      secondary: {
        main: getSecondaryColor()
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
          fontFamily: getFontFamily(),
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
  }, [darkMode, fontFamily, brandingSettings]);

  console.log("THEME UPDATE", theme);

  return (
    <ThemeContext.Provider value={{
      darkMode,
      setDarkMode,
      setFamily,
      fontFamily,
      brandingSettings,
      updateBrandingSettings,
      updateLogo,
      resetBrandingSettings
    }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export { ThemeContext, ThemeProvider };

