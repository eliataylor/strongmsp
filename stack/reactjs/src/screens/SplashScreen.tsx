import { CircularProgress, Grid } from "@mui/material";
import React from "react";
import Logo from "src/theme/Logo";

interface SplashScreenProps {
  loading?: string;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ loading = undefined }) => {

  return (
    <Grid
      id={"SplashScreen"}
      container
      direction={"column"}
      gap={4}
      justifyContent={"space-around"}
      sx={{
        textAlign: "center",
        height: "100vh",
        maxWidth: 400,
        margin: "0 auto"
      }}
    >
      <Grid item>{loading}</Grid>
      <Grid item>
        <Logo height={300} />
      </Grid>
      <Grid item>
        <CircularProgress style={{ marginTop: 50, marginBottom: 50 }} />
      </Grid>
    </Grid>
  );
};

export default SplashScreen;
