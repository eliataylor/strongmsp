import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
  useTheme
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStatus } from '../allauth/auth';
import { Questions } from '../object-actions/types/types';

interface QuestionCardProps {
  question: Questions;
  onResponseSubmit: (response: number, responseText?: string) => Promise<boolean>;
  onNext: () => void;
  onPrevious: () => void;
  isFirst: boolean;
  isLast: boolean;
  currentResponse?: number;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onResponseSubmit,
  onNext,
  onPrevious,
  isFirst,
  isLast,
  currentResponse
}) => {
  const theme = useTheme();
  // @ts-ignore
  const [, authStatus] = useAuthStatus();
  const [selectedResponse, setSelectedResponse] = useState<number | null>(currentResponse || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authWarning, setAuthWarning] = useState<string | null>(null);

  useEffect(() => {
    setSelectedResponse(currentResponse || null);
  }, [currentResponse]);

  const handleResponseChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedResponse(Number(event.target.value));
  };

  const handleSubmit = async () => {
    if (!authStatus?.isAuthenticated) {
      setAuthWarning('Please sign in to submit your responses.');
      return;
    }
    if (selectedResponse === null) return;

    setIsSubmitting(true);
    try {
      const ok = await onResponseSubmit(selectedResponse);
      if (ok && !isLast) {
        onNext();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDefaultScaleLabels = (scale?: string | null) => {
    switch (scale) {
      case 'onetofive':
        return {
          '1': 'Strongly Disagree',
          '2': 'Disagree',
          '3': 'Neutral',
          '4': 'Agree',
          '5': 'Strongly Agree'
        } as Record<string, string>;
      case 'onetoten':
        return {
          '1': '1',
          '2': '2',
          '3': '3',
          '4': '4',
          '5': '5',
          '6': '6',
          '7': '7',
          '8': '8',
          '9': '9',
          '10': '10'
        } as Record<string, string>;
      case 'percentage':
        return {
          '1': '20%',
          '2': '40%',
          '3': '60%',
          '4': '80%',
          '5': '100%'
        } as Record<string, string>;
      default:
        return {
          '1': '1',
          '2': '2',
          '3': '3',
          '4': '4',
          '5': '5'
        } as Record<string, string>;
    }
  };

  // Prefer server-provided labels if available (e.g., QoR-40 or configured 1–10)
  const serverScaleLabels = (question as any).scale_choice_labels as Record<string, string> | undefined;
  const effectiveLabels: Record<string, string> = serverScaleLabels || getDefaultScaleLabels(question.scale || 'onetofive');
  const optionValues = Object.keys(effectiveLabels)
    .map((k) => Number(k))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
  const wrapOptions = optionValues.length > 5;

  return (
    <Card
      elevation={3}
      sx={{
        maxWidth: 800,
        width: '100%',
        mx: 'auto',
        background: theme.palette.background.paper,
        borderRadius: 3,
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          background: `linear-gradient(180deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.light} 100%)`,
          color: 'white',
          p: 3,
          textAlign: 'center'
        }}
      >
        {question.help_text &&
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            {question.help_text}
          </Typography>
        }
        <Chip
          label={question.question_category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'General'}
          sx={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            fontWeight: 'bold'
          }}
        />
      </Box>

      <CardContent sx={{ p: 4 }}>
        <Typography
          variant="h5"
          component="h2"
          gutterBottom
          sx={{
            fontWeight: 500,
            color: theme.palette.text.primary
          }}
        >
          {question.title}
        </Typography>

        {authWarning && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {authWarning} <Link to="/account/login"><b>Log in</b></Link>
          </Alert>
        )}

        <Box sx={{ mb: 4 }}>

          <RadioGroup
            value={selectedResponse || ''}
            onChange={handleResponseChange}
            sx={{
              gap: 1,
              display: 'flex',
              flexWrap: wrapOptions ? 'wrap' : 'nowrap',
              flexDirection: wrapOptions ? 'row' : 'column',
              alignItems: 'flex-start'
            }}
          >
            {optionValues.map((value) => (
              <FormControlLabel
                key={`${value}-${question.id}`}
                value={value}
                control={
                  <Radio
                    key={`radio-${value}-${question.id}`}
                    sx={{
                      '&.Mui-checked': {
                        color: theme.palette.primary.main,
                      },
                      '& .MuiRadio-root': {
                        fontSize: '1.5rem',
                      }
                    }}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h6" fontWeight="bold" color="primary">
                      {value}
                    </Typography>
                    {value.toString() !== effectiveLabels[String(value)] &&
                      <Typography variant="body1" color="text.secondary">
                        {effectiveLabels[String(value)]}
                      </Typography>
                    }
                  </Box>
                }
                sx={{
                  margin: 0,
                  p: '.3',
                  paddingRight: 1,
                  borderRadius: 2,
                  border: `2px solid ${selectedResponse === value ? theme.palette.primary.main : theme.palette.divider}`,
                  background: selectedResponse === value
                    ? `${theme.palette.primary.main}10`
                    : theme.palette.background.default,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    background: `${theme.palette.primary.main}05`,
                  },
                  '&.Mui-checked': {
                    borderColor: theme.palette.primary.main,
                    background: `${theme.palette.primary.main}15`,
                  }
                }}
              />
            ))}
          </RadioGroup>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            variant="outlined"
            onClick={onPrevious}
            disabled={isFirst}
            sx={{
              minWidth: 120,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            ← Previous
          </Button>

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={selectedResponse === null || isSubmitting}
            sx={{
              minWidth: 120,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.light} 100%)`,
              '&:hover': {
                background: `linear-gradient(0deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.dark} 100%)`,
              }
            }}
          >
            {isLast ? 'Complete Assessment' : 'Next Question →'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default QuestionCard;
