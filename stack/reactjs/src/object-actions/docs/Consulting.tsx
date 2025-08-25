import React from "react";
import { Box, Card, CardContent, Grid, SvgIcon, Typography } from "@mui/material";
import { CheckCircleOutline, DoNotDisturb } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { TightButton } from "../../theme/StyledFields";
import LightDarkImg from "../../components/LightDarkImg";
import { ReactComponent as Linkedin } from "../../allauth/logos/linkedin.svg";
import { Link } from "react-router-dom";
import { useNavDrawer } from "../../NavDrawerProvider";


const pricingOptions = [
  {
    title: "Front & Backend Applications",
    price: "$499",
    description: "8 hours to design your scalable database schema, and full-stack architecture from O/A.",
    session: "8 hours, 1-on-1, screen-sharing",
    features: [
      "Your idea's content types and fields formally documented in 4 spreadsheets.",
      "You application and database connected with authentication, permission controls, and rich and dynamic forms",
      "Data segmentation by User, Group and Content context.",
      "Test Suite Test Suite.",
      "Fake Data Generator.",
      "AI Agent.",
      "Login with Email, SMS, MFA, Google, Facebook, LinkedIn, Spotify, & Github."
    ],
    notincluded: [
      "Customized logic after form submissions"
    ]
  },
  {
    title: "Role & Permission Controls",
    price: "$249",
    description: "4 hours to discuss security, and implement your roles and permissions for all data, operations and ownership.",
    session: "4 hours, 1-on-1, screen-sharing",
    features: [
      "Permission controls to create, read, update, and delete each content type",
      "Further fine tune permissions based on content ownership.",
      "Clear and interactive error handling."
    ],
    notincluded: [
      "Location based permissions",
      "Time based permissions",
      "Other contextual permissions"
    ]
  },
  {
    title: "Mobile App",
    price: "$249",
    description: "Publish your responsive web app with Flutter with handling for Deep Links and Push Notifications.",
    session: "4 hours, 1-on-1, screen-sharing",
    features: [
      "iOS Build.",
      "Android Build."
    ],
    notincluded: [
      "Getting your App approved in marketplaces"
    ]
  },
  {
    title: "Your Cloud Domain Deployed",
    price: "$249",
    description: "4 hours to build your app and servers on Google Cloud Platform.",
    session: "4 hours, 1-on-1, screen-sharing",
    features: [
      "Your custom domain configured.",
      "HTTPS via Load balancers with multi-region distribution.",
      "Deployment pipeline to release future improvements with 1 command.",
      "Database and file storage",
      "Containerized services easy to integrate with your existing apps."
    ],
    notincluded: [
      "GCP monthly hosting costs (under $50 / month out of the box)",
      "Twilio / Stripe integration for SMS, Email, Payments, etc.",
    ]
  }
];

const Consulting: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { isMobile } = useNavDrawer();

  const handleCopy = async () => {
    const textToCopy = "Help@strongmsp.com";
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        enqueueSnackbar("Email copied to clipboard", { variant: "success" });
      } catch (error) {
        console.error("Failed to copy text: ", error);
        enqueueSnackbar("Failed to copy text", { variant: "error" });
      }
    } else {
      console.error(
        "Clipboard API is not available. Please copy manually: " + textToCopy
      );
    }
  };

  return (
    <Box p={1}>
      <Typography variant="subtitle2" align="center" sx={{ marginBottom: 2 }} style={{ fontSize: "140%" }}>
        <Typography component={"span"}
                    sx={{ marginRight: 2, fontSize: "110%" }}><em>Objects / Actions</em> is a <b>free & open-source</b> project designed for <b>self-starters</b>, starting from scratch.</Typography>
        <Typography component={"span"}
                    sx={{ marginRight: 2, fontSize: "95%" }}>
          You can generate your own full-stack codebase - with your data structures and permissions - within 30 minutes following these <Link to={"/oa/customize"}>tutorials</Link>.
        </Typography>
        <Typography component={"span"}
                    sx={{ marginRight: 2, fontSize: "105%" }}>
          <b>My hope</b> is to work with you <em>after this</em> is done so we can scale your project into an <b>enterprise product</b>.
        </Typography>
        <Typography component={"span"}
                    sx={{ marginRight: 2, fontSize: "95%" }}>
          However, if you need help getting this or another foundation up and running, I can offer these support options.
        </Typography>
      </Typography>

      <Grid container spacing={2}>
        {pricingOptions.map((option, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <CardContent>
                <Typography variant="h5" align="center" gutterBottom>
                  {option.title}
                </Typography>
                <Typography variant="h4" color="primary" align="center" sx={{ fontWeight: 300, color: "#166105" }} gutterBottom>
                  {option.price}
                </Typography>
                <Typography variant="body1" color="textSecondary" gutterBottom>
                  {option.description}
                </Typography>
                <Box mt={2}>
                  <Typography variant="overline" sx={{ fontSize: 9, margin: "0 0 0 0", fontWeight: 700 }}>WHATS PROVIDED:</Typography>
                  <Typography variant="body2" sx={{ display: "flex", alignItems: "flex-start", gap: .7, mb: .5 }}>
                    <CheckCircleOutline color="secondary" fontSize="small" />
                    {option.session}
                  </Typography>
                  {option.features.map((feature, i) => (

                    <Typography key={i} variant="body2" sx={{ display: "flex", alignItems: "flex-start", gap: .7, mb: .5 }}>
                      <CheckCircleOutline color="secondary" fontSize="small" />
                      {feature}
                    </Typography>

                  ))}
                </Box>
                <Box mt={2}>
                  <Typography variant="overline" sx={{ fontSize: 9, fontWeight: 700 }}>WHAT YOU'D NEED NEXT:</Typography>
                  {option.notincluded.map((feature, i) => (

                    <Typography key={i} variant="body2" sx={{ display: "flex", alignItems: "flex-start", gap: .7, mb: .5 }}>
                      <DoNotDisturb color="primary" fontSize="small" />{feature}
                    </Typography>

                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Grid container
            alignItems={"center"}
            alignContent={"center"}
            justifyContent={"space-between"} mt={3} mb={3}>
        <Grid item xs={12} md={6} alignItems={"center"} alignContent={"center"}>
          <Grid item style={isMobile ? {
            width: "154px",
            margin: "10px auto"
          } : {}}>
            <Typography variant={"overline"} style={{ lineHeight: 0 }}>Free Consult with</Typography>
            <Typography variant={"h3"} gutterBottom><a target="_blank" rel="noreferrer"  href={"https://taylormadetraffic.com/brands"}>Eli Taylor</a></Typography>
            <Grid container={true} gap={3} alignItems={"center"} alignContent={"center"}>
              <Grid item>
                <a target="_blank" rel="noreferrer" href="https://taylormadetraffic.com/brands" className="nolink">
                  <img height="30" alt="Taylor Made Traffic" src="/oa-assets/tmt-corner.png" />
                </a>
              </Grid>
              <Grid item>
                <a target="_blank" rel="noreferrer" href="https://www.linkedin.com/in/elitaylor/" className="nolink">
                  <SvgIcon style={{ fontSize: 30 }} viewBox="0 0 72 72" component={Linkedin} inheritViewBox />
                </a>
              </Grid>
              <Grid item>
                <a target="_blank" rel="noreferrer" href="https://github.com/eliataylor" className="nolink">
                  <LightDarkImg
                    light={"/oa-assets/github-mark.svg"}
                    dark={"/oa-assets/github-mark-white.svg"}
                    styles={{ height: 30 }}
                  />
                </a>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12} md={6} style={{ textAlign: "center" }}>
          <a
            href={"https://calendar.app.google/N9RfLgwx62TqJRqs5"}
            target="_blank" rel="noreferrer"
          >
            <TightButton
              size={"small"}
              style={{ width: "247px", marginBottom: 14 }}
              variant={"contained"}
              startIcon={
                <LightDarkImg
                  light={"/oa-assets/google-calendar.svg"}
                  dark={"/oa-assets/google-calendar.svg"}
                  styles={{ height: 20 }}
                />
              }
            >
              Book Free 20 minute Consult
            </TightButton>
          </a>

          <Typography align={"center"}>

            or email
            <Typography component={"span"} color={"primary"}
                        style={{ marginLeft: 10 }}
                        onClick={handleCopy}>Help <span style={{ margin: "0 2px" }}>@</span> strongmsp.com</Typography>

          </Typography>

        </Grid>

      </Grid>

    </Box>
  )
    ;
};

export default Consulting;
