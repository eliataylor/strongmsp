import { Phone } from "@mui/icons-material";
import { Box, Button, Grid, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useConfig } from "../auth";
import FormErrors from "../components/FormErrors";
import { signUp } from "../lib/allauth";
import ProviderList from "../socialaccount/ProviderList";

export default function Signup(props) {
  const [email, setEmail] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [password2Errors, setPassword2Errors] = useState([]);
  const [response, setResponse] = useState({ fetching: false, content: null });
  const config = useConfig();
  const hasProviders = config.data.socialaccount?.providers?.length > 0;

  function submit() {
    if (password2 !== password1) {
      setPassword2Errors([
        { param: "password2", message: "Password does not match." }
      ]);
      return;
    }
    setPassword2Errors([]);
    setResponse({ ...response, fetching: true });
    signUp({ email, username: email, password: password1 })
      .then((content) => {
        setResponse((r) => {
          return { ...r, content };
        });
      })
      .catch((e) => {
        // TODO: snackbar
        console.error(e);
        window.alert(e);
      })
      .then(() => {
        setResponse((r) => {
          return { ...r, fetching: false };
        });
      });
  }

  return (
    <Box p={2} mt={8}>
      <Grid
        item
        container
        fullWidth
        alignContent="center"
        justifyContent="space-between"
      >
        <Grid item>
          <Typography variant="h5">Sign-Up</Typography>
        </Grid>
        <Grid item>
          <Typography variant="body1">
            {props?.onShowLogin ? (
              <Button size="small" onClick={() => props.onShowLogin()}>
                or <b>Sign-In</b>
              </Button>
            ) : (
              <Link to="/account/login">
                or <b>Sign-In</b>
              </Link>
            )}
          </Typography>
        </Grid>
      </Grid>
      <FormErrors errors={response.content?.errors} />

      <Grid container direction={"column"} gap={1}>
        <Grid item>
          <TextField
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            label="Email"
          />
          <FormErrors param="email" errors={response.content?.errors} />
        </Grid>
        <Grid item>
          <TextField
            fullWidth
            autoComplete="new-password"
            value={password1}
            onChange={(e) => setPassword1(e.target.value)}
            type="password"
            required
            label="Password"
          />
          <FormErrors param="password" errors={response.content?.errors} />
        </Grid>
        <Grid item>
          <TextField
            fullWidth
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            type="password"
            required
            label="Confirm Password"
          />
          <FormErrors param="password2" errors={password2Errors} />
        </Grid>

        <Button
          variant={"contained"}
          disabled={
            email.indexOf("@") < 1 ||
            password1.length === 0 ||
            password2.length === 0 ||
            response.fetching
          }
          onClick={() => submit()}
        >
          Register
        </Button>
      </Grid>

      {hasProviders && (
        <Box mt={2}>
          <Typography variant="h5">Or...</Typography>
          <ProviderList callbackURL="/account/provider/callback" />
        </Box>
      )}

      <Grid mt={2}>
        <Button
          component={Link}
          to={"/account/sms"}
          startIcon={<Phone />}
          fullWidth
          variant={"outlined"}
          color={"inherit"}
        >
          SMS
        </Button>
      </Grid>

      <Grid mt={1}>
        <Button
          fullWidth
          variant={"text"}
          color={"primary"}
          onClick={() => (props?.onShowClaim ? props.onShowClaim() : window.location.assign("/join-my-team"))}
        >
          Find My Team
        </Button>
      </Grid>
    </Box>
  );
}
