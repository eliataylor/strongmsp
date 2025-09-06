import { Grid, Typography } from "@mui/material";
import React from "react";
import Logo from "src/theme/Logo";

interface SplashScreenProps {
  loading?: string;
}

const TempLanding: React.FC<SplashScreenProps> = ({ loading = undefined }) => {

  return (
    <Grid
      id={"TempLanding"}
      container
      direction={"column"}
      gap={4}
      justifyContent={"center"}
      sx={{
        textAlign: "center",
        minHeight: "100vh",
        margin: "0 auto"
      }}
    >

      <Grid style={{ maxWidth: 900, margin: '0 auto' }}>
        <Typography variant="h1" component="h1" sx={{
          fontSize: { xs: '2.5rem', md: '3.5rem' },
          fontWeight: 'bold',

        }}>
          Strong Mind Strong Performance
        </Typography>
      </Grid>

      <Typography variant="h2" component="h2" sx={{
        color: 'text.secondary'
      }}>
        coming soon
      </Typography>

      <Grid style={{ margin: '2% auto' }}>
        <Logo height={300} />
      </Grid>

      <Grid style={{ maxWidth: 600, margin: '0 auto' }}>
        <Typography variant="h1" component="h1" sx={{
          fontSize: { xs: '2.0rem', md: '3.0rem' },
          fontWeight: 'bold', mb: 5

        }}>
          Confidence Isn't a Trait. It's a System.
        </Typography>
        <Typography variant="h6" component="h2" sx={{
          color: 'text.secondary'
        }}>
          A mental strengthening program for youth athletes aged 13–18.
          <br />
          Built for parents and coaches ready to support their athletes with tools that work.
        </Typography>

      </Grid>
    </Grid>
  );
};

export default TempLanding;
