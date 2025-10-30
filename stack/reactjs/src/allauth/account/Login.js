import { Phone } from "@mui/icons-material";
import { Button, FormHelperText, Grid, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useConfig } from "../auth";
import FormErrors, { hasError } from "../components/FormErrors";
import { login } from "../lib/allauth";
import ProviderList from "../socialaccount/ProviderList";

export default function Login(props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [response, setResponse] = useState({ fetching: false, content: null });
  const config = useConfig();
  const hasProviders = config.data.socialaccount?.providers?.length > 0;

  function submit() {
    setResponse({ ...response, fetching: true });
    const payload = { password };
    if (email.indexOf("@") > -1) {
      payload.email = email;
    } else {
      payload.username = email;
    }
    login(payload)
      .then((content) => {
        setResponse((r) => {
          // Normalize responses that only contain a status code or have no content
          let normalized = content;
          try {
            const isEmpty =
              content == null ||
              (typeof content === "object" && Object.keys(content).length === 0);

            const isStatusOnly =
              typeof content === "object" &&
              content !== null &&
              "status" in content &&
              !("errors" in content) &&
              !("detail" in content) &&
              !("message" in content) &&
              !("text" in content);

            if (isEmpty) {
              normalized = {
                errors: [
                  {
                    code: "empty_response",
                    message:
                      "Unexpected empty response from server. Please try again.",
                  },
                ],
              };
            } else if (isStatusOnly) {
              const status = content.status;
              let code = "server_error";
              let message = `Request failed with status ${status}. Please try again.`;
              if (status === 409) {
                code = "invalid_credentials";
                message = "Invalid email or password.";
              } else if (status === 401) {
                code = "unauthorized";
                message = "Unauthorized. Please check your credentials.";
              } else if (status >= 500) {
                code = "server_error";
                message = "Server error. Please try again later.";
              }
              normalized = { errors: [{ code, message }] };
            }
          } catch (e) {
            // If normalization fails, surface a generic error
            normalized = {
              errors: [
                {
                  code: "parse_error",
                  message: "Unable to process server response. Please try again.",
                },
              ],
            };
          }
          return { ...r, content: normalized };
        });
      })
      .catch((e) => {
        setResponse((r) => {
          return { ...r, content: { errors: [{ code: 'invalid_credentials', message: e.toString() }] } };
        });
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
    <Grid container direction="column" p={1} gap={1} mt={8}>
      <Grid
        item
        container
        fullWidth
        alignContent="center"
        justifyContent="space-between"
      >
        <Grid item>
          <Typography variant="h5">Sign-In</Typography>
        </Grid>
        <Grid item>
          <Typography variant="body1">
            {props?.onShowSignup ? (
              <Button size="small" onClick={() => props.onShowSignup()}>
                or <b>Sign-Up</b>
              </Button>
            ) : (
              <Link to="/account/signup">
                or <b>Sign-Up</b>
              </Link>
            )}
          </Typography>
        </Grid>
      </Grid>
      <Grid item>
        <TextField
          label="Email"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          error={hasError(response.content?.errors, "email")}
        />
        <FormErrors param="email" errors={response.content?.errors} />
      </Grid>
      <Grid item>
        <TextField
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          label="Password"
          error={hasError(response.content?.errors, "password")}
        />
        <FormErrors param="password" errors={response.content?.errors} />
      </Grid>
      <Grid item container justifyContent={"space-between"} gap={2}>
        <Grid>
          <Button
            type="submit"
            disabled={
              email.indexOf("@") < 1 ||
              password.length === 0 ||
              response.fetching
            }
            onClick={() => submit()}
            variant="contained"
            size="small"
          >
            Login
          </Button>
        </Grid>
        <Grid item>
          <FormHelperText style={{ width: "100%", textAlign: "right" }}>
            <Link to="/account/password/reset">Forgot your password?</Link>
          </FormHelperText>
        </Grid>
      </Grid>
      <Grid item style={{ textAlign: "center" }}>
        <FormErrors errors={response.content?.errors} />
      </Grid>
      {/*
      <Divider fullWidth sx={{ backgroundColor: 'primary.dark' }}/>
      <Grid item style={{ marginTop: 30 }}>
        <Link to="/account/login/code">Email me a sign-in code</Link>
      </Grid>
      <Grid item>
        <WebAuthnLoginButton>Sign in with a passkey</WebAuthnLoginButton>
      </Grid>
        <Divider fullWidth sx={{ backgroundColor: 'primary.dark' }}/>
      */}

      {hasProviders && (
        <Grid item style={{ marginTop: 50 }}>
          <ProviderList callbackURL="/account/provider/callback" />
        </Grid>
      )}

      <Button
        sx={{ mt: 1 }}
        component={Link}
        to={"/account/sms"}
        startIcon={<Phone />}
        fullWidth
        variant={"outlined"}
        color={"inherit"}
      >
        SMS
      </Button>

      <Button
        sx={{ mt: 1 }}
        fullWidth
        variant={"text"}
        color={"primary"}
        onClick={() => (props?.onShowClaim ? props.onShowClaim() : window.location.assign("/join-my-team"))}
      >
        Find My Team
      </Button>
    </Grid>
  );
}
