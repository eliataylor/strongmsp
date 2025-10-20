//---OBJECT-ACTIONS-OAFORM-STARTS---//
import { Button, CircularProgress, Grid, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import React from "react";
import { useNavigate } from "react-router-dom";
import { AlternatingList } from "../../../theme/StyledFields";
import { TypeFieldSchema } from "../../types/types";
import { OAFormProps, useForm } from "../FormProvider";

export const OAFormAgentResponses: React.FC<OAFormProps<"AgentResponses">> = ({ onSuccess }) => {

  const { renderField, handleSubmit, handleDelete, errors, navItem, entity, syncing } = useForm<"AgentResponses">();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  async function saveEntity() {
    handleSubmit().then((newentity) => {
      if (onSuccess) {
        onSuccess(newentity);
      } else {
        navigate(`/${navItem.segment}/${newentity.id}`);
      }
      enqueueSnackbar(`AgentResponses saved`);
    }).catch(error => {
      console.error(error);
      enqueueSnackbar("Save failed");
    });
  }

  function deleteEntity() {
    handleDelete().then((msg) => {
      enqueueSnackbar(`AgentResponses saved`);
    }).catch(error => {
      console.error(error);
      enqueueSnackbar("Delete failed");
    });
  }

  return (
    <AlternatingList container spacing={4} p={1} justifyContent={'space-between'} wrap={"wrap"} >
      <Grid item xs={12} >
        {renderField(TypeFieldSchema["AgentResponses"]["athlete"], 0, { fullWidth: true })}
      </Grid>
      <Grid item xs={12} >
        {renderField(TypeFieldSchema["AgentResponses"]["prompt_template"], 0, { fullWidth: true })}
      </Grid>
      <Grid item xs={12} >
        {renderField(TypeFieldSchema["AgentResponses"]["purpose"], 0, { fullWidth: true })}
      </Grid>
      <Grid item xs={12} >
        {renderField(TypeFieldSchema["AgentResponses"]["message_body"], 0, { fullWidth: true })}
      </Grid>
      <Grid item xs={12} >
        {renderField(TypeFieldSchema["AgentResponses"]["ai_response"], 0, { fullWidth: true })}
      </Grid>
      <Grid item xs={12} >
        {renderField(TypeFieldSchema["AgentResponses"]["ai_reasoning"], 0, { fullWidth: true })}
      </Grid>
      <Grid item xs={12} >
        {renderField(TypeFieldSchema["AgentResponses"]["assignment"], 0, { fullWidth: true })}
      </Grid>

      {errors["general"] && <Typography variant={"body1"} color={"error"}>{errors["general"]}</Typography>}

      <Grid container item xs={12} justifyContent="space-between">
        <Button startIcon={syncing ? <CircularProgress color={"inherit"} size={18} /> : null}
          disabled={syncing}
          aria-label={"Submit"}
          variant="contained" color="primary" onClick={saveEntity}>
          Save
        </Button>
        {entity.id && entity.id !== "0" ? <Button
          startIcon={syncing ? <CircularProgress color={"inherit"} size={18} /> : null}
          disabled={syncing}
          variant="outlined" color="secondary" onClick={deleteEntity}>
          Delete
        </Button> : null
        }
      </Grid>
    </AlternatingList>
  );

};

export default OAFormAgentResponses;
//---OBJECT-ACTIONS-OAFORM-ENDS---//