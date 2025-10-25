import { LinearProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import ApiClient from "../config/ApiClient";
import { useActiveRole } from "../context/ActiveRoleContext";
import EntityCard from "../object-actions/components/EntityCard";
import { AgentResponses, CoachContent, ModelName, ModelType, NavItem, NAVITEMS } from "../object-actions/types/types";
import AgentResponseScreen from "./AgentResponseScreen";
import CoachContentEditorView from "./CoachContentEditorView";
import CoachContentReadOnlyView from "./CoachContentReadOnlyView";

const EntityView = () => {
  const location = useLocation();
  const { id } = useParams();
  const { activeRole } = useActiveRole();

  // We'll set the model type once we find the matching nav item
  const [modelType, setModelType] = useState<ModelName | null>(null);
  const [entityData, updateData] = useState<{ data: ModelType<ModelName> } | string | null>(null);

  useEffect(() => {
    const hasUrl = NAVITEMS.find((nav): nav is NavItem =>
      location.pathname.indexOf(`/${nav.segment}`) === 0
    );

    if (hasUrl) {
      setModelType(hasUrl.type);
      const fetchData = async () => {
        let apiUrl = "/api";
        if (id && parseInt(id) > 0) {
          apiUrl += `${location.pathname}${location.search}`;
        } else {
          apiUrl += `/u/${hasUrl.type.toLowerCase()}/${id}/${location.search}`;
        }

        try {
          const response = await ApiClient.get(apiUrl);
          if (response.error) {
            updateData(response.error);
          } else if (response.success && response.data) {
            updateData({ data: response.data as ModelType<ModelName> });
          }
        } catch (error) {
          updateData(error instanceof Error ? error.message : "Unknown error occurred");
        }
      };

      fetchData();
    }
  }, [location.pathname, location.search, id]);

  if (!entityData) {
    return <LinearProgress />;
  }

  if (typeof entityData === "string") {
    return <div>{entityData}</div>;
  }

  if (!modelType) {
    return <div>Invalid entity type</div>;
  }

  // Check if this is a CoachContent entity and render the specialized screen
  if (modelType === "CoachContent" && entityData.data) {
    const coachContent = entityData.data as CoachContent;

    // Route based on active role
    if (activeRole === 'coach' || activeRole === 'admin') {
      return (
        <div id="EntityView">
          <CoachContentEditorView entity={coachContent} />
        </div>
      );
    } else {
      return (
        <div id="EntityView">
          <CoachContentReadOnlyView entity={coachContent} />
        </div>
      );
    }
  }

  // Check if this is an AgentResponses entity and render the specialized screen
  if (modelType === "AgentResponses" && entityData.data) {
    const agentResponse = entityData.data as AgentResponses;
    return (
      <div id="EntityView">
        <AgentResponseScreen entity={agentResponse} />
      </div>
    );
  }

  return (
    <div id="EntityView">
      <EntityCard<typeof modelType> entity={entityData.data} />
    </div>
  );
};

export default EntityView;
