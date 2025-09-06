import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import React from "react";
import Logo from "../theme/Logo";

interface HomeProps {
  loading?: boolean;
}

const Home: React.FC<HomeProps> = ({ loading = false }) => {

  return (
    <Box>
      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Grid container direction="column" alignItems="center" spacing={4}>
          <Grid item>
            <Typography variant="h1" component="h1" sx={{
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              fontWeight: 'bold',
              textAlign: 'center',
              mb: 2
            }}>
              Confidence Isn't a Trait. It's a System.
            </Typography>
            <Typography variant="h5" component="h2" sx={{
              textAlign: 'center',
              color: 'text.secondary',
              maxWidth: 600,
              mx: 'auto'
            }}>
              A mental strengthening program for youth athletes aged 13–18.
              <br />
              Built for parents and coaches ready to support their athletes with tools that work.
            </Typography>
          </Grid>

          <Grid item sx={{ width: 300, margin: "auto", my: 3 }}>
            <Logo height={500} />
          </Grid>

          <Grid item container spacing={2} justifyContent="center">
            <Grid item>
              <Button
                variant="contained"
                size="large"
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}
              >
                🔵 Buy the Confidence Assessment – $250
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                size="large"
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}
              >
                ⚪ Contact Us for More Info
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Container>

      <Divider />

      {/* How It Works Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" sx={{
          textAlign: 'center',
          mb: 4,
          fontWeight: 'bold'
        }}>
          A Simple, Powerful Framework for Athletic Confidence
        </Typography>

        <TableContainer component={Paper} sx={{ maxWidth: 800, mx: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Step</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Action</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>1.</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Take the Assessment</TableCell>
                <TableCell>Uncover the athlete's confidence baseline and mindset patterns.</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>2.</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Choose Your Path</TableCell>
                <TableCell>Work with a certified coach ($125/session) or use our self-guided curriculum ($75/lesson).</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>3.</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Build Consistency</TableCell>
                <TableCell>Weekly lessons help athletes develop and increase discipline, visualization skills, and mental resilience.</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Container>

      <Divider />

      {/* Services Overview Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" sx={{
          textAlign: 'center',
          mb: 6,
          fontWeight: 'bold'
        }}>
          Our Services
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h4" component="h3" sx={{
                  mb: 2,
                  fontWeight: 'bold',
                  color: 'primary.main'
                }}>
                  Option 1: Full Coaching Track
                </Typography>
                <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>
                  $250 for assessment
                </Typography>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
                  $125 per session (12 sessions)
                </Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  <strong>Includes:</strong> assessment debrief, weekly 1:1 coaching, full curriculum
                </Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  <strong>Ideal for families who want full support and accountability</strong>
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  sx={{ mt: 'auto' }}
                >
                  Buy Assessment
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h4" component="h3" sx={{
                  mb: 2,
                  fontWeight: 'bold',
                  color: 'primary.main'
                }}>
                  Option 2: Self-Guided Curriculum
                </Typography>
                <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>
                  $250 for assessment
                </Typography>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
                  $75 per lesson (12 total, pay-as-you-go or full access)
                </Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  <strong>Includes:</strong> written lesson plans, reflection prompts, and affirmations
                </Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  <strong>Best for families and coaches who want to guide the process themselves</strong>
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  sx={{ mt: 'auto' }}
                >
                  Buy Assessment
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      <Divider />

      {/* Why It Works Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" sx={{
          textAlign: 'center',
          mb: 4,
          fontWeight: 'bold'
        }}>
          Why It Works
        </Typography>
        <Typography variant="h5" component="p" sx={{
          textAlign: 'center',
          maxWidth: 800,
          mx: 'auto',
          lineHeight: 1.6
        }}>
          At Strong Mind Strong Performance, we believe confidence is built — not born.
          <br /><br />
          Our structure teaches discipline. Discipline builds repetition.
          <br />
          Repetition builds belief. And belief changes everything.
        </Typography>
      </Container>

      <Divider />

      {/* About + Your Story Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" sx={{
          textAlign: 'center',
          mb: 4,
          fontWeight: 'bold'
        }}>
          About + Your Story
        </Typography>
        <Typography variant="body1" sx={{
          textAlign: 'center',
          maxWidth: 800,
          mx: 'auto',
          fontSize: '1.1rem',
          lineHeight: 1.6
        }}>
          [Share a bit about why this program was created. You can do this in one paragraph or a short video later.]
        </Typography>
      </Container>

      <Divider />

      {/* Final Call to Action */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" sx={{
          textAlign: 'center',
          mb: 4,
          fontWeight: 'bold'
        }}>
          Ready to Build Your Athlete's Confidence?
        </Typography>
        <Grid container spacing={2} justifyContent="center">
          <Grid item>
            <Button
              variant="contained"
              size="large"
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}
            >
              Buy the Assessment
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              size="large"
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}
            >
              Contact Us
            </Button>
          </Grid>
        </Grid>
      </Container>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ height: 100 }} />
        </Box>
      )}
    </Box>
  );
};

export default Home;
