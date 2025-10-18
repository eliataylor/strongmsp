import { Box } from "@mui/material";
import Snackbar from "@mui/material/Snackbar";
import Typography from "@mui/material/Typography";
import React, { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useAuth } from "../allauth/auth";
import PermissionError from "../components/PermissionError";
import ApiClient from "../config/ApiClient";
import { canDo } from "../object-actions/types/access";
import { ModelType, NAVITEMS, USER_TYPE } from "../object-actions/types/types";
import AdminView from "./user-views/AdminView";
import AgentView from "./user-views/AgentView";
import AthleteView from "./user-views/AthleteView";
import CoachView from "./user-views/CoachView";
import ParentView from "./user-views/ParentView";

const UserView: React.FC = () => {
  const location = useLocation();
  const [expanded, setExpanded] = React.useState<string | false>(false);
  const { uid } = useParams();
  const me = useAuth()?.data?.user;
  const [userProfile, updateUserProfile] = React.useState<ModelType<"Users"> | null>(
    null
  );
  const [stats, updateStats] = React.useState<{ [key: string]: number }>({});
  const [questionResponseStats, setQuestionResponseStats] = React.useState<{
    user_id: number;
    category_stats: Array<{
      category: string;
      total_response: number;
      response_count: number;
      average_response: number;
    }>;
    total_categories: number;
  } | null>(null);
  const [snack, showSnackBar] = React.useState("");
  const closeSnackbar = (
    event: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }

    showSnackBar("");
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      const response = await ApiClient.get(
        `/api/users/${uid}${location.search}`
      );
      if (response.error) {
        return showSnackBar(response.error);
      }
      if (response.success && response.data) {
        updateUserProfile(response.data as ModelType<"Users">);
      }
    };
    fetchUserProfile();
  }, [location.pathname, location.search, uid]);

  useEffect(() => {
    const newstats = { ...stats };
    const fetchStats = async (model: string) => {
      const response = await ApiClient.get(
        `/api/users/${uid}/${model.toLowerCase()}/stats${location.search}`
      );
      if (response.error) {
        return showSnackBar(response.error);
      }
      if (response.success && response.data) {
        // @ts-ignore
        newstats[model] = response.data.count;
      }
    };

    const updateAllStats = async () => {
      const fetchPromises = NAVITEMS.map(async (item) => {
        if (item.type === "Users") return null;
        await fetchStats(item.type);
      });

      await Promise.all(fetchPromises);

      updateStats(newstats);
    };

    updateAllStats();

    console.log("STATS", stats);
  }, [uid]);

  // Fetch question response category stats
  useEffect(() => {
    const fetchQuestionResponseStats = async () => {
      if (!uid) return;

      const response = await ApiClient.get(
        `/api/users/${uid}/question-response-category-stats${location.search}`
      );
      if (response.error) {
        return showSnackBar(response.error);
      }
      if (response.success && response.data) {
        setQuestionResponseStats(response.data as {
          user_id: number;
          category_stats: Array<{
            category: string;
            total_response: number;
            response_count: number;
            average_response: number;
          }>;
          total_categories: number;
        });
      }
    };

    fetchQuestionResponseStats();
  }, [uid, location.search]);

  if (!userProfile) return null;

  const handleChange =
    (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false);
    };

  if (!userProfile) return <Typography>Loading...</Typography>;

  const canView = canDo("view", userProfile, me);

  if (typeof canView === "string") {
    return <PermissionError error={canView} />;
  }

  // Determine user type and render appropriate component
  const getUserType = (): USER_TYPE => {
    // Use groups to determine user type
    if (me?.groups && Array.isArray(me.groups)) {
      const validGroups = me.groups.filter((group: string) =>
        ['athlete', 'parent', 'coach', 'admin', 'agent'].includes(group)
      ) as USER_TYPE[];
      if (validGroups.length > 0) {
        return validGroups[0];
      }
    }

    // Default fallback
    return 'athlete';
  };

  const userType = getUserType();

  // Render the appropriate component based on user type
  const renderUserTypeComponent = () => {
    const commonProps = {
      userProfile,
      stats,
      questionResponseStats,
      expanded,
      handleChange
    };

    switch (userType) {
      case 'athlete':
        return <AthleteView {...commonProps} />;
      case 'parent':
        return <ParentView {...commonProps} />;
      case 'coach':
        return <CoachView {...commonProps} />;
      case 'admin':
        return <AdminView {...commonProps} />;
      case 'agent':
        return <AgentView {...commonProps} />;
      default:
        return <AthleteView {...commonProps} />;
    }
  };

  return (
    <Box>
      <Snackbar
        open={snack.length > 0}
        autoHideDuration={5000}
        onClose={closeSnackbar}
        message={snack}
      />
      {renderUserTypeComponent()}
    </Box>
  );
};

export default UserView;
