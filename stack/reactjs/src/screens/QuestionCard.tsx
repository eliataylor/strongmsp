import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Typography,
  useTheme
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Questions } from '../object-actions/types/types';

interface QuestionCardProps {
  question: Questions;
  onResponseSubmit: (response: number) => void;
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
  const [selectedResponse, setSelectedResponse] = useState<number | null>(currentResponse || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setSelectedResponse(currentResponse || null);
  }, [currentResponse]);

  const handleResponseChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedResponse(Number(event.target.value));
  };

  const handleSubmit = async () => {
    if (selectedResponse === null) return;

    setIsSubmitting(true);
    try {
      onResponseSubmit(selectedResponse);

      // Auto-advance to next question after a brief delay
      setTimeout(() => {
        if (!isLast) {
          onNext();
        }
      }, 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScaleLabels = (scale?: string | null) => {
    switch (scale) {
      case 'onetofive':
        return {
          1: 'Strongly Disagree',
          2: 'Disagree',
          3: 'Neutral',
          4: 'Agree',
          5: 'Strongly Agree'
        };
      case 'onetoten':
        return {
          1: '1 - Poor',
          2: '2 - Below Average',
          3: '3 - Average',
          4: '4 - Above Average',
          5: '5 - Excellent'
        };
      case 'percentage':
        return {
          1: '20%',
          2: '40%',
          3: '60%',
          4: '80%',
          5: '100%'
        };
      default:
        return {
          1: '1',
          2: '2',
          3: '3',
          4: '4',
          5: '5'
        };
    }
  };

  const scaleLabels = getScaleLabels(question.scale || 'onetofive');

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
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          color: 'white',
          p: 3,
          textAlign: 'center'
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Question {question.assessment_question_id || 'Unknown'}
        </Typography>
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
            mb: 3,
            fontWeight: 500,
            lineHeight: 1.4,
            color: theme.palette.text.primary
          }}
        >
          {question.title}
        </Typography>

        {question.help_text && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontStyle: 'italic' }}
            >
              💡 {question.help_text}
            </Typography>
          </Paper>
        )}

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
            Please rate your response:
          </Typography>

          <RadioGroup
            value={selectedResponse || ''}
            onChange={handleResponseChange}
            sx={{ gap: 1 }}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <FormControlLabel
                key={value}
                value={value}
                control={
                  <Radio
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
                    <Typography variant="body1" color="text.secondary">
                      {scaleLabels[value as keyof typeof scaleLabels]}
                    </Typography>
                  </Box>
                }
                sx={{
                  margin: 0,
                  padding: 2,
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
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
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
